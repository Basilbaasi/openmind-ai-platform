"""Workflow and step repositories."""

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.workflow import WorkflowRecord, WorkflowStepRecord
from app.storage.base_repository import BaseRepository


class WorkflowRepository(BaseRepository[WorkflowRecord]):
    """Repository for workflow CRUD operations."""

    model = WorkflowRecord

    async def get_with_steps(self, workflow_id: str) -> WorkflowRecord | None:
        """Fetch a workflow with its steps eagerly loaded."""
        stmt = (
            select(WorkflowRecord)
            .options(selectinload(WorkflowRecord.steps))
            .where(WorkflowRecord.id == workflow_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_with_steps(self, limit: int = 100) -> list[WorkflowRecord]:
        """Fetch all workflows with steps."""
        stmt = (
            select(WorkflowRecord)
            .options(selectinload(WorkflowRecord.steps))
            .limit(limit)
            .order_by(WorkflowRecord.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class WorkflowStepRepository(BaseRepository[WorkflowStepRecord]):
    """Repository for workflow step operations."""

    model = WorkflowStepRecord
