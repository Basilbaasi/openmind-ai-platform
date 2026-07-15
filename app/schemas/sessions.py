from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class SessionCreateRequest(BaseModel):
    """
    Request schema for creating a new chat session.
    """
    title: Optional[str] = Field(None, description="Optional title for the session")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict, 
        description="Optional arbitrary metadata for the session"
    )

class SessionResponse(BaseModel):
    """
    Standardized representation of a chat session.
    """
    id: str = Field(..., description="Unique UUID for the session")
    title: str = Field(..., description="Title of the session")
    created_at: datetime = Field(..., description="Timestamp when the session was created")
    updated_at: datetime = Field(..., description="Timestamp of the last interaction")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Session metadata")

class SessionListResponse(BaseModel):
    """
    Response schema for listing sessions.
    """
    sessions: List[SessionResponse] = Field(..., description="List of sessions")
    total: int = Field(..., description="Total number of sessions returned")
