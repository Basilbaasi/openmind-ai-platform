"""Benchmark routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.domain_services import BenchmarkService

router = APIRouter()


async def get_benchmark_service(session: AsyncSession = Depends(get_db)) -> BenchmarkService:
    return BenchmarkService(session)


@router.get("", summary="List benchmark results")
async def list_benchmarks(service: BenchmarkService = Depends(get_benchmark_service)) -> list[dict]:
    return await service.list_benchmarks()
