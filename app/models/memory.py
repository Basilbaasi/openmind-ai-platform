"""Memory graph tables — nodes and connections."""

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class MemoryNodeRecord(Base, UUIDMixin, TimestampMixin):
    """A node in the memory graph."""

    __tablename__ = "memory_nodes"

    label: Mapped[str] = mapped_column(String(255), nullable=False)
    tier: Mapped[str] = mapped_column(String(50), nullable=False)  # Conversation, Semantic, Long-Term
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    value: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Outgoing connections from this node
    outgoing_connections: Mapped[list["MemoryConnectionRecord"]] = relationship(
        back_populates="source_node",
        foreign_keys="MemoryConnectionRecord.source_node_id",
        cascade="all, delete-orphan",
    )


class MemoryConnectionRecord(Base, UUIDMixin, TimestampMixin):
    """A directed edge between two memory nodes."""

    __tablename__ = "memory_connections"

    source_node_id: Mapped[str] = mapped_column(
        ForeignKey("memory_nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_node_id: Mapped[str] = mapped_column(
        ForeignKey("memory_nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    source_node: Mapped["MemoryNodeRecord"] = relationship(
        back_populates="outgoing_connections",
        foreign_keys=[source_node_id],
    )
