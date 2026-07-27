"""System log and API request log routes."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.domain_services import LogService
from app.storage.request_log_repository import RequestLogRepository

router = APIRouter()


async def get_log_service(session: AsyncSession = Depends(get_db)) -> LogService:
    return LogService(session)


@router.get("/system", summary="List system logs")
async def list_system_logs(service: LogService = Depends(get_log_service)) -> list[dict]:
    return await service.list_logs(limit=200)


@router.post("/system", status_code=status.HTTP_201_CREATED, summary="Create a system log entry")
async def create_system_log(data: dict, service: LogService = Depends(get_log_service)) -> dict:
    return await service.create_log(
        severity=data.get("severity", "INFO"),
        source=data.get("source", "SYSTEM"),
        message=data.get("message", ""),
        metadata=data.get("metadata"),
    )


@router.get("/api", summary="List API request logs")
async def list_api_logs(session: AsyncSession = Depends(get_db)) -> list[dict]:
    repo = RequestLogRepository(session)
    records = await repo.get_recent(limit=100)
    return [
        {
            "id": r.id,
            "method": r.method,
            "url": r.url,
            "status": r.status,
            "timeMs": r.time_ms,
            "sizeBytes": r.size_bytes,
            "timestamp": r.created_at.isoformat() if r.created_at else "",
            "requestHeaders": r.request_headers,
            "requestBody": r.request_body,
            "responseBody": r.response_body,
        }
        for r in records
    ]


@router.delete("/api", status_code=status.HTTP_204_NO_CONTENT, summary="Clear API request logs")
async def clear_api_logs(session: AsyncSession = Depends(get_db)) -> None:
    repo = RequestLogRepository(session)
    await repo.delete_all()
