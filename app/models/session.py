"""Chat session and message tables."""

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class SessionRecord(Base, UUIDMixin, TimestampMixin):
    """A chat/playground session."""

    __tablename__ = "sessions"

    title: Mapped[str] = mapped_column(String(255), nullable=False, default="New Conversation")
    model_id: Mapped[str] = mapped_column(String(255), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, nullable=False, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=1024)
    top_p: Mapped[float] = mapped_column(Float, nullable=False, default=0.9)
    presence_penalty: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    json_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationship to messages
    messages: Mapped[list["MessageRecord"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="MessageRecord.created_at",
    )


class MessageRecord(Base, UUIDMixin, TimestampMixin):
    """A single message within a session."""

    __tablename__ = "messages"

    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # system, user, assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationship back to session
    session: Mapped["SessionRecord"] = relationship(back_populates="messages")
