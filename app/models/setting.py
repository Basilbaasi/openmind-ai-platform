"""System settings key-value table."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class SystemSettingRecord(Base, UUIDMixin, TimestampMixin):
    """
    Key-value store for system settings.

    Each setting is stored as a JSON string value keyed by a unique name.
    """

    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False, default="")
