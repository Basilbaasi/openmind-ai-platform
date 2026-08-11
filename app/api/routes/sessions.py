from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.sessions import (
    MessageCreateRequest,
    SessionCreateRequest,
    SessionListResponse,
    SessionResponse,
    SessionUpdateRequest,
)
from app.services.session_service import SessionService

router = APIRouter()


async def get_session_service(session: AsyncSession = Depends(get_db)) -> SessionService:
    return SessionService(session)


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


@router.get(
    "/{session_id}",
    summary="Get session details",
    description="Retrieves a session with its messages.",
)
async def get_session(
    session_id: str, service: SessionService = Depends(get_session_service)
) -> dict:
    """GET /sessions/{session_id} endpoint."""
    result = await service.get_session(session_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found."
        )
    return result.model_dump()


@router.put(
    "/{session_id}",
    summary="Update session parameters",
    description="Updates session configuration (temperature, model, etc.).",
)
async def update_session(
    session_id: str,
    params: SessionUpdateRequest,
    service: SessionService = Depends(get_session_service),
) -> dict:
    """PUT /sessions/{session_id} endpoint."""
    result = await service.update_session_params(session_id, params.model_dump(exclude_unset=True))
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found."
        )
    return result.model_dump()


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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found."
        )


@router.get(
    "/{session_id}/messages",
    summary="List session messages",
    description="Retrieves all messages for a session.",
)
async def list_messages(
    session_id: str, service: SessionService = Depends(get_session_service)
) -> list[dict]:
    """GET /sessions/{session_id}/messages endpoint."""
    return await service.get_messages(session_id)


@router.post(
    "/{session_id}/messages",
    status_code=status.HTTP_201_CREATED,
    summary="Add a message to a session",
    description="Adds a new message to the conversation.",
)
async def add_message(
    session_id: str,
    data: MessageCreateRequest,
    service: SessionService = Depends(get_session_service),
) -> dict:
    """POST /sessions/{session_id}/messages endpoint."""
    return await service.add_message(
        session_id=session_id,
        role=data.role,
        content=data.content,
    )
