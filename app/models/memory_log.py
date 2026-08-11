"""Memory operation log table."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class MemoryLogRecord(Base, UUIDMixin, TimestampMixin):
    """Logs operations performed on the memory graph."""

    __tablename__ = "memory_logs"

    tier: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # Conversation, Semantic, Long-Term
    operation: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # Read, Write, Prune, Consolidate
    text: Mapped[str] = mapped_column(Text, nullable=False)
