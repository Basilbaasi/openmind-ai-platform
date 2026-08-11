from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SessionCreateRequest(BaseModel):
    """
    Request schema for creating a new chat session.
    """

    title: str | None = Field(None, description="Optional title for the session")
    model_id: str | None = Field(None, description="Model ID")
    temperature: float | None = Field(0.7, description="Temperature")
    max_tokens: int | None = Field(1024, description="Max tokens")
    top_p: float | None = Field(0.9, description="Top P")
    presence_penalty: float | None = Field(0.0, description="Presence penalty")
    json_mode: bool | None = Field(False, description="JSON mode")
    metadata: dict[str, Any] | None = Field(
        default_factory=dict, description="Optional arbitrary metadata for the session"
    )


class SessionUpdateRequest(BaseModel):
    title: str | None = None
    model_id: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None
    presence_penalty: float | None = None
    json_mode: bool | None = None
    metadata: dict[str, Any] | None = None


class MessageCreateRequest(BaseModel):
    role: str = Field("user", description="Message role (user, assistant, system)")
    content: str = Field(..., description="Message text content")


class MessageResponse(BaseModel):
    """Serialized message within a session."""

    id: str
    session_id: str
    role: str
    content: str
    timestamp: str = ""


class SessionResponse(BaseModel):
    """
    Standardized representation of a chat session.
    """

    id: str = Field(..., description="Unique UUID for the session")
    title: str = Field(..., description="Title of the session")
    created_at: datetime = Field(..., description="Timestamp when the session was created")
    updated_at: datetime = Field(..., description="Timestamp of the last interaction")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Session metadata")
    messages: list[MessageResponse] = Field(
        default_factory=list, description="Messages in this session"
    )


class SessionListResponse(BaseModel):
    """
    Response schema for listing sessions.
    """

    sessions: list[SessionResponse] = Field(..., description="List of sessions")
    total: int = Field(..., description="Total number of sessions returned")
