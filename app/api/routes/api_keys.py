"""API key management routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.api_key_service import ApiKeyService

router = APIRouter()


async def get_api_key_service(session: AsyncSession = Depends(get_db)) -> ApiKeyService:
    return ApiKeyService(session)


@router.get("", summary="List API keys")
async def list_keys(service: ApiKeyService = Depends(get_api_key_service)) -> list[dict]:
    return await service.list_keys()


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new API key")
async def create_key(
    data: dict, service: ApiKeyService = Depends(get_api_key_service)
) -> dict:
    name = data.get("name", "Unnamed Key")
    return await service.create_key(name)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke an API key")
async def delete_key(
    key_id: str, service: ApiKeyService = Depends(get_api_key_service)
) -> None:
    success = await service.delete_key(key_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found.")
