"""Monitoring route — real system metrics."""

from fastapi import APIRouter

from app.services.monitoring_service import MonitoringService

router = APIRouter()


@router.get(
    "",
    summary="System status",
    description="Returns real-time system metrics including CPU, memory, DB health, and uptime.",
)
async def get_status() -> dict:
    service = MonitoringService()
    return await service.get_status()
