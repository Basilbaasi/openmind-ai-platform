from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.models import (
    ModelCreateRequest,
    ModelListResponse,
    ModelUpdateRequest,
)
from app.services.model_service import ModelService

router = APIRouter()


async def get_model_service(session: AsyncSession = Depends(get_db)) -> ModelService:
    return ModelService(session)


@router.get(
    "",
    response_model=ModelListResponse,
    summary="List available models",
    description="Returns a list of AI models currently available on the platform.",
)
async def list_models(service: ModelService = Depends(get_model_service)) -> ModelListResponse:
    """GET /models endpoint."""
    models = await service.list_models()
    return ModelListResponse(models=models, total=len(models))


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Deploy a new model",
    description="Registers a new model partition and saves its adapter code.",
)
async def create_model(
    data: ModelCreateRequest, service: ModelService = Depends(get_model_service)
) -> dict:
    """POST /models endpoint with upsert on existing ID."""
    try:
        result = await service.create_model(data.model_dump())
    except IntegrityError:
        # If record with this ID already exists, perform an update
        update_data = data.model_dump(exclude_unset=True)
        update_data.pop("id", None)
        result = await service.update_model(data.id, update_data)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A model with ID '{data.id}' already exists.",
            )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The model record could not be deployed because its adapter file could not be saved.",
        ) from exc
    return result.model_dump()


@router.put(
    "/{model_id}",
    summary="Update a model",
    description="Updates an existing model's configuration.",
)
async def update_model(
    model_id: str, data: ModelUpdateRequest, service: ModelService = Depends(get_model_service)
) -> dict:
    """PUT /models/{model_id} endpoint."""
    try:
        result = await service.update_model(model_id, data.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Model {model_id} not found."
        )
    return result.model_dump()


@router.delete(
    "/{model_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a model",
    description="Removes a model from the platform registry.",
)
async def delete_model(model_id: str, service: ModelService = Depends(get_model_service)) -> None:
    """DELETE /models/{model_id} endpoint."""
    success = await service.delete_model(model_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Model {model_id} not found."
        )


@router.post(
    "/test-adapter",
    summary="Test model adapter execution",
    description="Executes a model adapter (LLM or Embedding) and returns the output for verification.",
)
async def test_adapter(
    data: dict,
    service: ModelService = Depends(get_model_service),
) -> dict:
    """Test executing an LLM or Embedding adapter."""
    from app.model_adapters.executor import (
        execute_embedding_adapter,
        execute_model_adapter,
        get_saved_adapter_code,
    )

    model_id = data.get("model_id")
    model_type = data.get("type", "text")
    adapter_code = data.get("adapter_code")
    api_key = data.get("api_key", "")

    if model_id:
        record = await service.get_model_record(model_id)
        if record:
            if not adapter_code:
                adapter_code = record.adapter_code or get_saved_adapter_code(model_id)
            if not api_key:
                api_key = record.model_api_key or ""
            if "type" not in data:
                model_type = record.type

    if not adapter_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No adapter code provided or found for this model.",
        )

    if model_type == "embedding":
        input_val = data.get("input", ["OpenMind semantic embedding test"])
        if isinstance(input_val, str):
            input_val = [input_val]
        input_type = data.get("input_type", "query")
        try:
            import asyncio

            embeddings = await asyncio.to_thread(
                execute_embedding_adapter,
                adapter_code=adapter_code,
                api_key=api_key,
                input_data=input_val,
                input_type=input_type,
            )
            dimensions = (
                len(embeddings[0])
                if embeddings and len(embeddings) > 0 and isinstance(embeddings[0], list)
                else (len(embeddings) if isinstance(embeddings, list) else 0)
            )
            return {
                "status": "success",
                "embeddings": embeddings,
                "dimensions": dimensions,
                "count": len(embeddings) if isinstance(embeddings, list) else 1,
            }
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc
    else:
        messages = data.get(
            "messages", [{"role": "user", "content": data.get("user_message", "Hello! Hello! OpenMind test.")}]
        )
        try:
            import asyncio

            response_text = await asyncio.to_thread(
                execute_model_adapter,
                adapter_code=adapter_code,
                api_key=api_key,
                messages=messages,
                temperature=data.get("temperature", 0.7),
                max_tokens=data.get("max_tokens", 1024),
                top_p=data.get("top_p", 0.95),
            )
            return {
                "status": "success",
                "response_text": response_text,
            }
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

