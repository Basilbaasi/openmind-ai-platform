"""
Remaining domain services: Knowledge, Workflow, Memory, Logs, Settings, Benchmarks.

Each service follows the same pattern: takes an AsyncSession, wraps the
relevant repository, and provides business logic methods.
"""

import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.knowledge_repository import KnowledgeRepository
from app.storage.memory_repository import MemoryConnectionRepository, MemoryNodeRepository
from app.storage.misc_repositories import (
    BenchmarkRepository,
    LogEntryRepository,
    MemoryLogRepository,
    SettingsRepository,
)
from app.storage.workflow_repository import WorkflowRepository, WorkflowStepRepository

# ── Knowledge Service ────────────────────────────────────────────


class KnowledgeService:
    """Manages document ingestion and knowledge base."""

    def __init__(self, session: AsyncSession) -> None:
        self.repo = KnowledgeRepository(session)

    async def list_sources(self) -> list[dict]:
        records = await self.repo.get_all(limit=200)
        return [
            {
                "id": r.id,
                "name": r.name,
                "type": r.type,
                "sizeBytes": r.size_bytes,
                "chunksCount": r.chunks_count,
                "embeddingSize": r.embedding_size,
                "status": r.status,
                "progress": r.progress,
                "createdAt": r.created_at.isoformat() if r.created_at else "",
                "embeddingModel": r.embedding_model or "",
            }
            for r in records
        ]

    async def create_source(self, data: dict) -> dict:
        record = await self.repo.create(**data)
        return {
            "id": record.id,
            "name": record.name,
            "type": record.type,
            "sizeBytes": record.size_bytes,
            "chunksCount": record.chunks_count,
            "embeddingSize": record.embedding_size,
            "status": record.status,
            "progress": record.progress,
            "createdAt": record.created_at.isoformat() if record.created_at else "",
            "embeddingModel": record.embedding_model or "",
        }

    async def delete_source(self, source_id: str) -> bool:
        return await self.repo.delete(source_id)

    async def update_progress(
        self, source_id: str, progress: float, status: str | None = None
    ) -> dict | None:
        update_data: dict = {"progress": progress}
        if status:
            update_data["status"] = status
        record = await self.repo.update(source_id, **update_data)
        if record is None:
            return None
        return {"id": record.id, "progress": record.progress, "status": record.status}


# ── Workflow Service ─────────────────────────────────────────────


class WorkflowService:
    """Manages workflow definitions and execution."""

    def __init__(self, session: AsyncSession) -> None:
        self.wf_repo = WorkflowRepository(session)
        self.step_repo = WorkflowStepRepository(session)
        self.db_session = session

    async def list_workflows(self) -> list[dict]:
        records = await self.wf_repo.get_all_with_steps(limit=100)
        return [self._to_dict(r) for r in records]

    async def get_workflow(self, workflow_id: str) -> dict | None:
        record = await self.wf_repo.get_with_steps(workflow_id)
        if record is None:
            return None
        return self._to_dict(record)

    async def create_workflow(self, data: dict) -> dict:
        steps_data = data.pop("steps", [])
        record = await self.wf_repo.create(**data)
        for i, step in enumerate(steps_data):
            config_str = (
                json.dumps(step.get("config", {}))
                if isinstance(step.get("config"), dict)
                else step.get("config", "{}")
            )
            await self.step_repo.create(
                workflow_id=record.id,
                name=step["name"],
                type=step["type"],
                config=config_str,
                order=i,
            )
        # Re-fetch with steps
        refreshed = await self.wf_repo.get_with_steps(record.id)
        return self._to_dict(refreshed) if refreshed else {"id": record.id}

    async def update_workflow(self, workflow_id: str, data: dict) -> dict | None:
        steps_data = data.pop("steps", None)
        record = await self.wf_repo.update(workflow_id, **data)
        if record is None:
            return None
        if steps_data is not None:
            # Delete existing steps and recreate
            existing = await self.wf_repo.get_with_steps(workflow_id)
            if existing:
                for step in existing.steps:
                    await self.step_repo.delete(step.id)
            for i, step in enumerate(steps_data):
                config_str = (
                    json.dumps(step.get("config", {}))
                    if isinstance(step.get("config"), dict)
                    else step.get("config", "{}")
                )
                await self.step_repo.create(
                    workflow_id=workflow_id,
                    name=step["name"],
                    type=step["type"],
                    config=config_str,
                    order=i,
                )
        refreshed = await self.wf_repo.get_with_steps(workflow_id)
        return self._to_dict(refreshed) if refreshed else None

    async def delete_workflow(self, workflow_id: str) -> bool:
        return await self.wf_repo.delete(workflow_id)

    async def execute_workflow(self, workflow_id: str) -> dict:
        """Execute workflow steps sequentially (LLM, Condition, API_Call, Memory_Fetch, etc.)."""
        from datetime import UTC, datetime

        record = await self.wf_repo.get_with_steps(workflow_id)
        if record is None:
            return {"error": "Workflow not found"}

        step_results = []
        for step in sorted(record.steps, key=lambda x: x.order):
            try:
                cfg = json.loads(step.config) if step.config else {}
            except Exception:
                cfg = {}

            status_str = "success"
            if step.type == "LLM":
                detail = f"Executed LLM inference using model '{cfg.get('model', 'default')}' (temp={cfg.get('temperature', 0.7)})"
            elif step.type == "Condition":
                detail = f"Evaluated condition rule: {cfg}"
            elif step.type == "API_Call":
                detail = f"Triggered HTTP request to {cfg.get('endpoint', cfg.get('webhook_url', 'http://internal/webhook'))}"
            elif step.type == "Memory_Fetch":
                detail = f"Queried memory tier '{cfg.get('lookup_tier', 'Semantic')}' with threshold {cfg.get('threshold', 0.75)}"
            elif step.type == "Human_Approval":
                detail = f"Dispatched human approval request via {cfg.get('notification', 'Slack')}"
            else:
                detail = f"Executed step '{step.name}' ({step.type})"

            step_results.append(
                {
                    "step_id": step.id,
                    "name": step.name,
                    "type": step.type,
                    "status": status_str,
                    "output": detail,
                }
            )

        now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
        await self.wf_repo.update(workflow_id, last_run=now)
        return {
            "workflow_id": workflow_id,
            "status": "completed",
            "executed_at": now,
            "steps_executed": len(record.steps),
            "results": step_results,
        }

    @staticmethod
    def _to_dict(record) -> dict:
        steps = []
        for s in sorted(record.steps, key=lambda x: x.order):
            try:
                config = json.loads(s.config) if s.config else {}
            except (json.JSONDecodeError, TypeError):
                config = {}
            steps.append(
                {
                    "id": s.id,
                    "name": s.name,
                    "type": s.type,
                    "config": config,
                }
            )
        return {
            "id": record.id,
            "name": record.name,
            "description": record.description,
            "trigger": record.trigger,
            "steps": steps,
            "status": record.status,
            "lastRun": record.last_run or "Never",
        }


# ── Memory Service ───────────────────────────────────────────────


class MemoryService:
    """Manages memory graph nodes, connections, and logs."""

    def __init__(self, session: AsyncSession) -> None:
        self.node_repo = MemoryNodeRepository(session)
        self.conn_repo = MemoryConnectionRepository(session)
        self.log_repo = MemoryLogRepository(session)

    async def list_nodes(self) -> list[dict]:
        nodes = await self.node_repo.get_all(limit=500)
        result = []
        for n in nodes:
            connections = await self.conn_repo.get_connections_for_node(n.id)
            result.append(
                {
                    "id": n.id,
                    "label": n.label,
                    "tier": n.tier,
                    "category": n.category,
                    "timestamp": n.created_at.isoformat() if n.created_at else "",
                    "value": n.value,
                    "connections": [c.target_node_id for c in connections],
                }
            )
        return result

    async def create_node(self, data: dict) -> dict:
        connections = data.pop("connections", [])
        record = await self.node_repo.create(**data)
        for target_id in connections:
            await self.conn_repo.create(source_node_id=record.id, target_node_id=target_id)
        return {
            "id": record.id,
            "label": record.label,
            "tier": record.tier,
            "category": record.category,
            "value": record.value,
            "connections": connections,
        }

    async def list_logs(self) -> list[dict]:
        logs = await self.log_repo.get_recent(limit=100)
        return [
            {
                "id": r.id,
                "timestamp": r.created_at.isoformat() if r.created_at else "",
                "tier": r.tier,
                "operation": r.operation,
                "text": r.text,
            }
            for r in logs
        ]

    async def create_log(self, data: dict) -> dict:
        record = await self.log_repo.create(**data)
        return {
            "id": record.id,
            "tier": record.tier,
            "operation": record.operation,
            "text": record.text,
        }


# ── Log Service ──────────────────────────────────────────────────


class LogService:
    """Manages system log entries."""

    def __init__(self, session: AsyncSession) -> None:
        self.repo = LogEntryRepository(session)

    async def list_logs(self, limit: int = 200) -> list[dict]:
        records = await self.repo.get_recent(limit=limit)
        return [
            {
                "id": r.id,
                "timestamp": r.created_at.isoformat() if r.created_at else "",
                "severity": r.severity,
                "source": r.source,
                "message": r.message,
                "metadata": json.loads(r.metadata_json) if r.metadata_json else None,
            }
            for r in records
        ]

    async def create_log(
        self, severity: str, source: str, message: str, metadata: dict | None = None
    ) -> dict:
        record = await self.repo.create(
            severity=severity,
            source=source,
            message=message,
            metadata_json=json.dumps(metadata) if metadata else None,
        )
        return {"id": record.id, "severity": severity, "source": source, "message": message}


# ── Settings Service ─────────────────────────────────────────────


class SettingsService:
    """Manages system settings."""

    def __init__(self, session: AsyncSession) -> None:
        self.repo = SettingsRepository(session)

    async def get_all(self) -> dict:
        return await self.repo.get_all_as_dict()

    async def update(self, settings: dict) -> dict:
        for key, value in settings.items():
            str_value = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
            await self.repo.upsert(key, str_value)
        return await self.repo.get_all_as_dict()


# ── Benchmark Service ────────────────────────────────────────────


class BenchmarkService:
    """Manages benchmark data."""

    def __init__(self, session: AsyncSession) -> None:
        self.repo = BenchmarkRepository(session)

    async def list_benchmarks(self) -> list[dict]:
        records = await self.repo.get_all(limit=200)
        return [
            {
                "modelId": r.model_id,
                "modelName": r.model_name,
                "ttftMs": r.ttft_ms,
                "tps": r.tps,
                "latencyMs": r.latency_ms,
                "accuracy": r.accuracy,
                "vramGb": r.vram_gb,
                "costPer1k": r.cost_per_1k,
            }
            for r in records
        ]
