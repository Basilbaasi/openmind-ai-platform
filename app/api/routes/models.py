from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.models import ModelCreateRequest, ModelListResponse, ModelMetadata, ModelUpdateRequest
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
    summary="Register a new model",
    description="Adds a new AI model to the platform registry.",
)
async def create_model(
    data: ModelCreateRequest, service: ModelService = Depends(get_model_service)
) -> dict:
    """POST /models endpoint."""
    result = await service.create_model(data.model_dump())
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
    result = await service.update_model(model_id, data.model_dump(exclude_unset=True))
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model {model_id} not found.")
    return result.model_dump()


@router.delete(
    "/{model_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a model",
    description="Removes a model from the platform registry.",
)
async def delete_model(
    model_id: str, service: ModelService = Depends(get_model_service)
) -> None:
    """DELETE /models/{model_id} endpoint."""
    success = await service.delete_model(model_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model {model_id} not found.")
