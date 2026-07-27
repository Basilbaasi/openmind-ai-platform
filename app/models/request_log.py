"""API request log table for the gateway."""

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class RequestLogRecord(Base, UUIDMixin, TimestampMixin):
    """Logs every API gateway request and response."""

    __tablename__ = "request_logs"

    method: Mapped[str] = mapped_column(String(10), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    status: Mapped[int] = mapped_column(Integer, nullable=False)
    time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    request_headers: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    request_body: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    response_body: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
