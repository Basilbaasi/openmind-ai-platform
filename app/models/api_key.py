"""API key management table."""

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ApiKeyRecord(Base, UUIDMixin, TimestampMixin):
    """
    Stores API keys for the gateway.

    The actual key is never stored — only a bcrypt hash and a
    short prefix for display purposes.
    """

    __tablename__ = "api_keys"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key_hash: Mapped[str] = mapped_column(Text, nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_used_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
