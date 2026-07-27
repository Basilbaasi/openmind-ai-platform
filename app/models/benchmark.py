"""Benchmark results table."""

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class BenchmarkRecord(Base, UUIDMixin, TimestampMixin):
    """Performance benchmark result for a model."""

    __tablename__ = "benchmarks"

    model_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    ttft_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tps: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vram_gb: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cost_per_1k: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
