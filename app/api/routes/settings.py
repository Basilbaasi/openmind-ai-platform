"""Settings routes — get and update system settings."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.domain_services import SettingsService

router = APIRouter()


async def get_settings_service(session: AsyncSession = Depends(get_db)) -> SettingsService:
    return SettingsService(session)


@router.get("", summary="Get all system settings")
async def get_settings(service: SettingsService = Depends(get_settings_service)) -> dict:
    return await service.get_all()


@router.put("", summary="Update system settings")
async def update_settings(
    data: dict, service: SettingsService = Depends(get_settings_service)
) -> dict:
    return await service.update(data)
