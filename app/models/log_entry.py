"""System log entry table."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class LogEntryRecord(Base, UUIDMixin, TimestampMixin):
    """A structured system log entry."""

    __tablename__ = "log_entries"

    severity: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # INFO, WARN, ERROR
    source: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
