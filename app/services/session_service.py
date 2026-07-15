import uuid
from typing import List, Optional
from datetime import datetime, timezone

from app.schemas.sessions import SessionCreateRequest, SessionResponse

class SessionService:
    """
    Service responsible for managing chat sessions.
    """
    
    async def create_session(self, request: SessionCreateRequest) -> SessionResponse:
        """
        Creates a new session.
        Returns mock data with a newly generated UUID.
        """
        now = datetime.now(timezone.utc)
        return SessionResponse(
            id=str(uuid.uuid4()),
            title=request.title or "New Conversation",
            created_at=now,
            updated_at=now,
            metadata=request.metadata or {}
        )
        
    async def list_sessions(self) -> List[SessionResponse]:
        """
        Retrieves a list of available sessions.
        Returns static mock data.
        """
        now = datetime.now(timezone.utc)
        return [
            SessionResponse(
                id="mock-session-1234",
                title="Previous Discussion",
                created_at=now,
                updated_at=now,
                metadata={}
            )
        ]
        
    async def delete_session(self, session_id: str) -> bool:
        """
        Deletes a session by ID.
        Returns True if successful (mocked to always succeed).
        In a real implementation, this might return False if not found.
        """
        # Mock logic: assuming the session was found and deleted
        return True

# Dependency provider for FastAPI
def get_session_service() -> SessionService:
    return SessionService()
