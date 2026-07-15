from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.sessions import SessionCreateRequest, SessionListResponse, SessionResponse
from app.services.session_service import SessionService, get_session_service

router = APIRouter()


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new session",
    description="Initializes a new chat session.",
)
async def create_session(
    request: SessionCreateRequest, service: SessionService = Depends(get_session_service)
) -> SessionResponse:
    """POST /sessions endpoint."""
    return await service.create_session(request)


@router.get(
    "",
    response_model=SessionListResponse,
    summary="List sessions",
    description="Retrieves a list of active chat sessions.",
)
async def list_sessions(
    service: SessionService = Depends(get_session_service),
) -> SessionListResponse:
    """GET /sessions endpoint."""
    sessions = await service.list_sessions()
    return SessionListResponse(sessions=sessions, total=len(sessions))


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a session",
    description="Deletes a chat session by ID.",
)
async def delete_session(
    session_id: str, service: SessionService = Depends(get_session_service)
) -> None:
    """DELETE /sessions/{session_id} endpoint."""
    success = await service.delete_session(session_id)
    if not success:
        # We use a 404 exception here which our global handler will catch
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found."
        )
