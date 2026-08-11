"""Memory graph routes — nodes, connections, and operation logs."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.domain_services import MemoryService

router = APIRouter()


async def get_memory_service(session: AsyncSession = Depends(get_db)) -> MemoryService:
    return MemoryService(session)


@router.get("/nodes", summary="List memory nodes")
async def list_nodes(service: MemoryService = Depends(get_memory_service)) -> list[dict]:
    return await service.list_nodes()


@router.post("/nodes", status_code=201, summary="Create a memory node")
async def create_node(data: dict, service: MemoryService = Depends(get_memory_service)) -> dict:
    return await service.create_node(data)


@router.get("/logs", summary="List memory operation logs")
async def list_memory_logs(service: MemoryService = Depends(get_memory_service)) -> list[dict]:
    return await service.list_logs()


@router.post("/logs", status_code=201, summary="Create a memory log entry")
async def create_memory_log(
    data: dict, service: MemoryService = Depends(get_memory_service)
) -> dict:
    return await service.create_log(data)
