"""Benchmark, log entry, memory log, and settings repositories."""

from sqlalchemy import select

from app.models.benchmark import BenchmarkRecord
from app.models.log_entry import LogEntryRecord
from app.models.memory_log import MemoryLogRecord
from app.models.setting import SystemSettingRecord
from app.storage.base_repository import BaseRepository


class BenchmarkRepository(BaseRepository[BenchmarkRecord]):
    model = BenchmarkRecord


class LogEntryRepository(BaseRepository[LogEntryRecord]):
    model = LogEntryRecord

    async def get_recent(self, limit: int = 100) -> list[LogEntryRecord]:
        stmt = (
            select(LogEntryRecord)
            .order_by(LogEntryRecord.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class MemoryLogRepository(BaseRepository[MemoryLogRecord]):
    model = MemoryLogRecord

    async def get_recent(self, limit: int = 50) -> list[MemoryLogRecord]:
        stmt = (
            select(MemoryLogRecord)
            .order_by(MemoryLogRecord.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class SettingsRepository(BaseRepository[SystemSettingRecord]):
    model = SystemSettingRecord

    async def get_by_key(self, key: str) -> SystemSettingRecord | None:
        stmt = select(SystemSettingRecord).where(SystemSettingRecord.key == key)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(self, key: str, value: str) -> SystemSettingRecord:
        existing = await self.get_by_key(key)
        if existing:
            existing.value = value
            await self.session.flush()
            await self.session.refresh(existing)
            return existing
        return await self.create(key=key, value=value)

    async def get_all_as_dict(self) -> dict[str, str]:
        records = await self.get_all(limit=500)
        return {r.key: r.value for r in records}
