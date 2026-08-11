"""AI Model registry table."""

from sqlalchemy import Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ModelRecord(Base, UUIDMixin, TimestampMixin):
    """Represents an AI model registered on the platform."""

    __tablename__ = "models"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    context_window: Mapped[int] = mapped_column(Integer, nullable=False, default=8192)
    parameters: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    vram_required_gb: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rpm_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=1000)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Offline")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Provider adapter code — raw Python code executed at runtime
    adapter_code: Mapped[str] = mapped_column(Text, nullable=True, default="")
    # API key for this specific model provider
    model_api_key: Mapped[str] = mapped_column(Text, nullable=True, default="")
