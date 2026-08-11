"""Knowledge base routes — document upload, listing, deletion."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.services.domain_services import KnowledgeService

router = APIRouter()


async def get_knowledge_service(session: AsyncSession = Depends(get_db)) -> KnowledgeService:
    return KnowledgeService(session)


@router.get("", summary="List knowledge sources")
async def list_sources(service: KnowledgeService = Depends(get_knowledge_service)) -> list[dict]:
    return await service.list_sources()


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create knowledge source record")
async def create_source(
    data: dict, service: KnowledgeService = Depends(get_knowledge_service)
) -> dict:
    return await service.create_source(data)


@router.post("/upload", status_code=status.HTTP_201_CREATED, summary="Upload a document")
async def upload_document(
    file: UploadFile = File(...),
    service: KnowledgeService = Depends(get_knowledge_service),
) -> dict:
    """Upload a PDF, Markdown, or TXT file for ingestion."""
    import os

    settings = get_settings()
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    # Determine file type
    ext = os.path.splitext(file.filename)[1].lower()
    type_map = {".pdf": "PDF", ".md": "Markdown", ".txt": "Text"}
    file_type = type_map.get(ext)
    if file_type is None:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Calculate chunks count based on file content size
    text_content = content.decode("utf-8", errors="ignore")
    chunk_size = 512
    chunks_count = max(1, len(text_content) // chunk_size)

    # Create DB record with Indexed status
    result = await service.create_source(
        {
            "name": file.filename,
            "type": file_type,
            "size_bytes": len(content),
            "chunks_count": chunks_count,
            "embedding_size": 1024,
            "status": "Indexed",
            "progress": 100.0,
            "file_path": file_path,
        }
    )
    return result


@router.delete(
    "/{source_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a knowledge source"
)
async def delete_source(
    source_id: str, service: KnowledgeService = Depends(get_knowledge_service)
) -> None:
    success = await service.delete_source(source_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found.")
