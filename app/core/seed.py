"""
Database seed script.

Populates the database with initial data matching the frontend's
mock data from front/src/data.ts. Run once after initial migration.

Usage:
    python -m app.core.seed
"""

import asyncio
import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory, engine
from app.core.logging import get_logger
from app.models import (
    Base,
    BenchmarkRecord,
    KnowledgeSourceRecord,
    LogEntryRecord,
    MemoryConnectionRecord,
    MemoryLogRecord,
    MemoryNodeRecord,
    ModelRecord,
    MessageRecord,
    SessionRecord,
    SystemSettingRecord,
    WorkflowRecord,
    WorkflowStepRecord,
)

logger = get_logger(__name__)


async def seed_models(session: AsyncSession) -> None:
    """Seed AI model records."""
    models = [
        ModelRecord(
            id="llama3-8b-instruct", name="Llama 3 8B Instruct", provider="Local",
            type="text", context_window=8192, parameters="8B", latency_ms=35,
            vram_required_gb=6.5, rpm_limit=1200, status="Deployed",
            description="Meta's highly capable 8B parameter instruction-tuned model, optimized for local execution with extremely low latency.",
        ),
        ModelRecord(
            id="deepseek-r1-7b", name="DeepSeek R1 7B", provider="Local",
            type="text", context_window=16384, parameters="7B", latency_ms=95,
            vram_required_gb=5.8, rpm_limit=800, status="Deployed",
            description="State-of-the-art reasoning model optimized for math, logic, and multi-step complex code generation.",
        ),
        ModelRecord(
            id="nvidia-ising-1.5-31b", name="NVIDIA Ising Calibration 1.5 31B", provider="Cloud",
            type="text", context_window=32768, parameters="31B", latency_ms=85,
            vram_required_gb=0, rpm_limit=1000, status="Deployed",
            description="NVIDIA's Ising Calibration 1.5 31B model via NVIDIA API. Pre-configured adapter code with standardized variable naming.",
            adapter_code='import requests\n\ninvoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"\n\nheaders = {\n    "Authorization": f"Bearer {api_key}",\n    "Accept": "application/json",\n}\n\npayload = {\n    "model": "nvidia/ising-calibration-1.5-31b",\n    "messages": messages,\n    "max_tokens": max_tokens,\n    "temperature": temperature,\n    "top_p": top_p,\n    "stream": False,\n}\n\nresp = requests.post(invoke_url, headers=headers, json=payload)\ndata = resp.json()\n\nif "choices" in data and len(data["choices"]) > 0:\n    response_text = data["choices"][0]["message"]["content"]\nelif "error" in data:\n    response_text = f"API Error: {data[\'error\'].get(\'message\', str(data[\'error\']))}"\nelse:\n    response_text = f"Unexpected response format: {json.dumps(data)}"',
            model_api_key="",
        ),
        ModelRecord(
            id="gpt-4o", name="GPT-4o", provider="Cloud",
            type="text", context_window=128000, parameters="Proprietary", latency_ms=120,
            vram_required_gb=0, rpm_limit=1000, status="Deployed",
            description="OpenAI's flagship high-intelligence multimodal model, balancing latency, speed, and analytical precision.",
        ),
        ModelRecord(
            id="clip-vit-l14", name="CLIP ViT-L/14", provider="Local",
            type="vision", context_window=77, parameters="400M", latency_ms=12,
            vram_required_gb=1.8, rpm_limit=5000, status="Deployed",
            description="Contrastive Language-Image Pre-training model used for semantic image understanding, zero-shot classification, and embedding mapping.",
        ),
        ModelRecord(
            id="bge-large-en-v1.5", name="BGE Large EN v1.5", provider="Local",
            type="embedding", context_window=512, parameters="335M", latency_ms=8,
            vram_required_gb=0.8, rpm_limit=10000, status="Deployed",
            description="High-performance text embedding model, perfect for dense retrieval in Retrieval-Augmented Generation (RAG) tasks.",
        ),
    ]
    for m in models:
        await session.merge(m)
    logger.info("seeded_models", count=len(models))


async def seed_sessions(session: AsyncSession) -> None:
    """Seed playground sessions with messages."""
    sess1 = SessionRecord(
        id="sess_1", title="SQL Schema Query Refactoring", model_id="llama3-8b-instruct",
        temperature=0.2, max_tokens=1024, top_p=0.9, presence_penalty=0.1, json_mode=False,
    )
    sess2 = SessionRecord(
        id="sess_2", title="Customer Support Classifier", model_id="llama3-8b-instruct",
        temperature=0.1, max_tokens=256, top_p=0.95, presence_penalty=0.0, json_mode=True,
    )
    await session.merge(sess1)
    await session.merge(sess2)
    await session.flush()

    messages = [
        MessageRecord(id="m1", session_id="sess_1", role="system", content="You are an expert SQL engineer. Return only optimal queries."),
        MessageRecord(id="m2", session_id="sess_1", role="user", content="Optimize this query: SELECT * FROM orders WHERE user_id IN (SELECT id FROM users WHERE signup_date > '2026-01-01')"),
        MessageRecord(id="m3", session_id="sess_1", role="assistant", content="You can optimize this query by converting the subquery into an `INNER JOIN`, which allows the database planner to use indexes more efficiently:\n\n```sql\nSELECT o.*\nFROM orders o\nINNER JOIN users u ON o.user_id = u.id\nWHERE u.signup_date > '2026-01-01';\n```\n\nEnsure there is a composite index on `users(signup_date, id)` and an index on `orders(user_id)`."),
        MessageRecord(id="m4", session_id="sess_2", role="system", content='Analyze user queries and categorize into: Refund, Technical, Billing, shipping. Return JSON as {"category": string, "confidence": float, "urgency_level": "low" | "medium" | "high"}'),
        MessageRecord(id="m5", session_id="sess_2", role="user", content="I've been charged twice for my subscription this month and need this sorted immediately!"),
        MessageRecord(id="m6", session_id="sess_2", role="assistant", content='{\n  "category": "Billing",\n  "confidence": 0.99,\n  "urgency_level": "high"\n}'),
    ]
    for msg in messages:
        await session.merge(msg)
    logger.info("seeded_sessions", count=2, messages=len(messages))


async def seed_memory(session: AsyncSession) -> None:
    """Seed memory nodes and connections."""
    nodes = [
        MemoryNodeRecord(id="mem_1", label="Semantic Search Project", tier="Semantic", category="Project", value="Focuses on deploying dense retrievers combined with re-ranking filters."),
        MemoryNodeRecord(id="mem_2", label="Llama 3 Local Host", tier="Conversation", category="Infrastructure", value="Running Llama 3 8B locally on CUDA 12.2, drawing ~120W, quantized to Q4_K_M."),
        MemoryNodeRecord(id="mem_3", label="Knowledge Chunk Size", tier="Long-Term", category="Parameter", value="Determined 512-character overlapping chunks work best for technical documentation retrieval."),
        MemoryNodeRecord(id="mem_4", label="BGE Large EN Model", tier="Semantic", category="Model", value="BGE Large EN v1.5 offers the best cross-encoder similarity accuracy."),
        MemoryNodeRecord(id="mem_5", label="Auth Token Rotation", tier="Conversation", category="Security", value="API keys rotate every 30 days. Fallback keys are triggered if key validation throws 401."),
    ]
    for node in nodes:
        await session.merge(node)
    await session.flush()

    connections = [
        MemoryConnectionRecord(source_node_id="mem_1", target_node_id="mem_2"),
        MemoryConnectionRecord(source_node_id="mem_1", target_node_id="mem_3"),
        MemoryConnectionRecord(source_node_id="mem_2", target_node_id="mem_1"),
        MemoryConnectionRecord(source_node_id="mem_3", target_node_id="mem_1"),
        MemoryConnectionRecord(source_node_id="mem_3", target_node_id="mem_4"),
        MemoryConnectionRecord(source_node_id="mem_4", target_node_id="mem_3"),
    ]
    for conn in connections:
        await session.merge(conn)
    logger.info("seeded_memory", nodes=len(nodes), connections=len(connections))


async def seed_memory_logs(session: AsyncSession) -> None:
    """Seed memory operation logs."""
    logs = [
        MemoryLogRecord(id="mlog_1", tier="Conversation", operation="Write", text="Successfully captured user's SQL preference and cached in session memory."),
        MemoryLogRecord(id="mlog_2", tier="Semantic", operation="Read", text="Query 'dense retrieval' hit node 'Semantic Search Project' with cosine similarity score: 0.89."),
        MemoryLogRecord(id="mlog_3", tier="Long-Term", operation="Consolidate", text="Consolidated 15 similar conversation sessions into core Long-Term node 'Llama 3 Local Host' after clustering analysis."),
        MemoryLogRecord(id="mlog_4", tier="Semantic", operation="Prune", text="Pruned 3 stale short-term nodes (decay threshold > 0.85)."),
    ]
    for log in logs:
        await session.merge(log)
    logger.info("seeded_memory_logs", count=len(logs))


async def seed_knowledge(session: AsyncSession) -> None:
    """Seed knowledge sources."""
    sources = [
        KnowledgeSourceRecord(id="src_1", name="API_v1_Documentation.pdf", type="PDF", size_bytes=1542000, chunks_count=154, embedding_size=1024, status="Indexed", progress=100),
        KnowledgeSourceRecord(id="src_2", name="System_Architecture_Layout.md", type="Markdown", size_bytes=42300, chunks_count=12, embedding_size=1024, status="Indexed", progress=100),
        KnowledgeSourceRecord(id="src_3", name="GPU_Cluster_Setup_Notes.txt", type="Text", size_bytes=840000, chunks_count=84, embedding_size=1024, status="Processing", progress=45),
    ]
    for src in sources:
        await session.merge(src)
    logger.info("seeded_knowledge", count=len(sources))


async def seed_workflows(session: AsyncSession) -> None:
    """Seed workflow definitions with steps."""
    wf1 = WorkflowRecord(id="wf_1", name="L1 Triage Bot", description="Intercepts application errors from logs, queries memory for past resolutions, and drafts a solution pull-request.", trigger="Log Severity = ERROR", status="Active", last_run="2026-07-19 21:40")
    wf2 = WorkflowRecord(id="wf_2", name="Data Enrichment Pipeline", description="Ingests raw database exports and uses GPT-4o to add standard categorization and sentiment tags.", trigger="Cron: Every hour", status="Active", last_run="2026-07-19 22:00")
    wf3 = WorkflowRecord(id="wf_3", name="Stale Connection Analyzer", description="Tracks active API explorer test requests and alerts if latency spikes above 2500ms.", trigger="API request latency > 2500ms", status="Draft", last_run="Never")
    await session.merge(wf1)
    await session.merge(wf2)
    await session.merge(wf3)
    await session.flush()

    steps = [
        WorkflowStepRecord(id="s1_1", workflow_id="wf_1", name="Parse Error Context", type="Condition", config=json.dumps({"regex": "(?i)exception|error"}), order=0),
        WorkflowStepRecord(id="s1_2", workflow_id="wf_1", name="Query Semantic Memory", type="Memory_Fetch", config=json.dumps({"lookup_tier": "Semantic", "threshold": 0.75}), order=1),
        WorkflowStepRecord(id="s1_3", workflow_id="wf_1", name="Generate Solution Proposal", type="LLM", config=json.dumps({"model": "llama3-8b-instruct", "temperature": 0.1}), order=2),
        WorkflowStepRecord(id="s1_4", workflow_id="wf_1", name="Request Engineer Approval", type="Human_Approval", config=json.dumps({"notification": "slack"}), order=3),
        WorkflowStepRecord(id="s2_1", workflow_id="wf_2", name="Fetch Fresh Records", type="API_Call", config=json.dumps({"endpoint": "https://db.internal/v1/sync"}), order=0),
        WorkflowStepRecord(id="s2_2", workflow_id="wf_2", name="Batch Categorize", type="LLM", config=json.dumps({"model": "gpt-4o", "batch_size": 50}), order=1),
        WorkflowStepRecord(id="s2_3", workflow_id="wf_2", name="Writeback To Postgres", type="API_Call", config=json.dumps({"method": "PUT"}), order=2),
        WorkflowStepRecord(id="s3_1", workflow_id="wf_3", name="Gather Latency Metrics", type="Condition", config=json.dumps({"metric": "latency", "max_value": 2500}), order=0),
        WorkflowStepRecord(id="s3_2", workflow_id="wf_3", name="Send Alerts", type="API_Call", config=json.dumps({"webhook_url": "https://pagerduty.internal/webhook"}), order=1),
    ]
    for step in steps:
        await session.merge(step)
    logger.info("seeded_workflows", count=3, steps=len(steps))


async def seed_benchmarks(session: AsyncSession) -> None:
    """Seed benchmark data."""
    benchmarks = [
        BenchmarkRecord(model_id="llama3-8b-instruct", model_name="Llama 3 8B Instruct", ttft_ms=28, tps=84.5, latency_ms=35, accuracy=82.4, vram_gb=6.5, cost_per_1k=0.0),
        BenchmarkRecord(model_id="deepseek-r1-7b", model_name="DeepSeek R1 7B", ttft_ms=140, tps=42.1, latency_ms=95, accuracy=89.1, vram_gb=5.8, cost_per_1k=0.0),
        BenchmarkRecord(model_id="nvidia-ising-1.5-31b", model_name="NVIDIA Ising 1.5 31B", ttft_ms=80, tps=55.0, latency_ms=85, accuracy=90.2, vram_gb=0.0, cost_per_1k=0.001),
        BenchmarkRecord(model_id="gpt-4o", model_name="GPT-4o", ttft_ms=90, tps=78.4, latency_ms=120, accuracy=94.8, vram_gb=0.0, cost_per_1k=0.0025),
    ]
    for bm in benchmarks:
        await session.merge(bm)
    logger.info("seeded_benchmarks", count=len(benchmarks))


async def seed_logs(session: AsyncSession) -> None:
    """Seed system log entries."""
    logs = [
        LogEntryRecord(id="l1", severity="INFO", source="CORE_VM", message="Starting OpenMind core VM execution loop... Core modules initialized cleanly."),
        LogEntryRecord(id="l2", severity="INFO", source="MODEL_INFRA", message="Successfully allocated 6.5GB VRAM for local model: Llama 3 8B Instruct."),
        LogEntryRecord(id="l3", severity="INFO", source="MEMORY_DB", message="Semantic index loaded successfully. 5 nodes indexed from vector DB store."),
        LogEntryRecord(id="l4", severity="WARN", source="API_GATEWAY", message="API key validation mismatch warning on endpoint `/v1/embeddings`.", metadata_json=json.dumps({"request_id": "req_3", "origin_ip": "192.168.1.104", "supplied_key_prefix": "om_invalid"})),
        LogEntryRecord(id="l5", severity="ERROR", source="ORCHESTRATOR", message="Workflow 'Data Enrichment Pipeline' returned execution failure on step 3. Connection refused from db.internal."),
        LogEntryRecord(id="l6", severity="INFO", source="INGEST_PIPE", message="Successfully chunked Markdown source 'System_Architecture_Layout.md' into 12 dense nodes."),
    ]
    for log in logs:
        await session.merge(log)
    logger.info("seeded_logs", count=len(logs))


async def seed_settings(session: AsyncSession) -> None:
    """Seed system settings."""
    settings_data = {
        "generalName": "OpenMind AI Platform",
        "generalDesc": "High-performance AI model routing gateway, playground workspace, agent workflows manager, and local embedding retrieval core.",
        "githubUrl": "https://github.com/openmind-org/openmind-console",
        "fallbackModelId": "llama3-8b-instruct",
        "sessionTimeoutMin": "60",
        "activeProviders": json.dumps(["Local", "Cloud"]),
        "theme": "Sophisticated Dark",
    }
    for key, value in settings_data.items():
        await session.merge(SystemSettingRecord(key=key, value=str(value)))
    logger.info("seeded_settings", count=len(settings_data))


async def run_seed() -> None:
    """Run all seed functions."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        await seed_models(session)
        await seed_sessions(session)
        await seed_memory(session)
        await seed_memory_logs(session)
        await seed_knowledge(session)
        await seed_workflows(session)
        await seed_benchmarks(session)
        await seed_logs(session)
        await seed_settings(session)
        await session.commit()
        logger.info("database_seed_complete")


if __name__ == "__main__":
    asyncio.run(run_seed())
