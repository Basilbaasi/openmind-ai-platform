"""Knowledge chunk table — stores individual text chunks from ingested documents."""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class KnowledgeChunkRecord(Base, UUIDMixin, TimestampMixin):
    """An individual text chunk extracted from a knowledge source document."""

    __tablename__ = "knowledge_chunks"

    source_id: Mapped[str] = mapped_column(
        ForeignKey("knowledge_sources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    embedding_model: Mapped[str] = mapped_column(
        String(255), nullable=False, default=""
    )

    # Back-reference to the parent source
    source: Mapped["KnowledgeSourceRecord"] = relationship(  # noqa: F821
        back_populates="chunks",
        foreign_keys=[source_id],
    )
