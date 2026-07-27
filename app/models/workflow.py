"""Workflow definition and step tables."""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class WorkflowRecord(Base, UUIDMixin, TimestampMixin):
    """A workflow automation definition."""

    __tablename__ = "workflows"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    trigger: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Draft")
    last_run: Mapped[str | None] = mapped_column(String(50), nullable=True)

    steps: Mapped[list["WorkflowStepRecord"]] = relationship(
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="WorkflowStepRecord.order",
    )


class WorkflowStepRecord(Base, UUIDMixin, TimestampMixin):
    """A single step within a workflow."""

    __tablename__ = "workflow_steps"

    workflow_id: Mapped[str] = mapped_column(
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # LLM, Condition, API_Call, Memory_Fetch, Human_Approval
    config: Mapped[str] = mapped_column(Text, nullable=False, default="{}")  # JSON string
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    workflow: Mapped["WorkflowRecord"] = relationship(back_populates="steps")
