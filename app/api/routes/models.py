from fastapi import APIRouter, Depends

from app.schemas.models import ModelListResponse
from app.services.model_service import ModelService, get_model_service

router = APIRouter()


@router.get(
    "",
    response_model=ModelListResponse,
    summary="List available models",
    description="Returns a list of AI models currently available on the platform.",
)
async def list_models(service: ModelService = Depends(get_model_service)) -> ModelListResponse:
    """
    GET /models endpoint.
    Delegates fetching logic to the ModelService.
    """
    models = await service.list_models()
    return ModelListResponse(models=models, total=len(models))
