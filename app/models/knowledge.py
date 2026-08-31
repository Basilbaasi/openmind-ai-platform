"""Knowledge base / document source table."""

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class KnowledgeSourceRecord(Base, UUIDMixin, TimestampMixin):
    """An ingested document in the knowledge base."""

    __tablename__ = "knowledge_sources"

    name: Mapped[str] = mapped_column(String(512), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # PDF, Markdown, Text
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunks_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    embedding_size: Mapped[int] = mapped_column(Integer, nullable=False, default=1024)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Processing")
    progress: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Child chunks extracted from this document
    chunks: Mapped[list["KnowledgeChunkRecord"]] = relationship(  # noqa: F821
        back_populates="source",
        foreign_keys="KnowledgeChunkRecord.source_id",
        cascade="all, delete-orphan",
    )

