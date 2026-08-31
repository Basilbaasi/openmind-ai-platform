"""Knowledge base routes — document upload, listing, deletion, chunks."""

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.services.domain_services import KnowledgeService
from app.storage.knowledge_chunk_repository import KnowledgeChunkRepository

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
    embedding_model: str = Query(default="", description="Name of the embedding model to tag chunks with"),
    service: KnowledgeService = Depends(get_knowledge_service),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Upload a PDF, Markdown, or TXT file for real ingestion and semantic chunking."""
    import os

    from app.services.ingestion_service import ingest_document

    settings = get_settings()
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    # Determine file type
    ext = os.path.splitext(file.filename)[1].lower()
    type_map = {".pdf": "PDF", ".md": "Markdown", ".txt": "Text"}
    file_type = type_map.get(ext)
    if file_type is None:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    # Save file to disk
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Create initial DB record with Processing status
    result = await service.create_source(
        {
            "name": file.filename,
            "type": file_type,
            "size_bytes": len(content),
            "chunks_count": 0,
            "embedding_size": 1024,
            "status": "Processing",
            "progress": 0.0,
            "file_path": file_path,
            "embedding_model": embedding_model or None,
        }
    )

    source_id = result["id"]

    # Run real ingestion: extract text + semantic chunking + store chunks
    try:
        chunks_count = await ingest_document(
            file_path=file_path,
            file_type=file_type,
            source_id=source_id,
            embedding_model=embedding_model,
            db_session=session,
        )

        # Update the source record with real chunk count and Indexed status
        await service.update_progress(source_id, progress=100.0, status="Indexed")
        result["chunksCount"] = chunks_count
        result["status"] = "Indexed"
        result["progress"] = 100.0
    except Exception as e:
        # Mark as failed if ingestion errors out
        await service.update_progress(source_id, progress=0.0, status="Failed")
        result["status"] = "Failed"
        result["error"] = str(e)

    return result


@router.get("/search", summary="Search knowledge chunks by keyword")
async def search_chunks(
    q: str = Query(..., description="Search query"),
    limit: int = Query(default=10, le=50),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Basic keyword search across all stored knowledge chunks."""
    chunk_repo = KnowledgeChunkRepository(session)
    chunks = await chunk_repo.search_chunks(q, limit=limit)
    return [
        {
            "id": c.id,
            "sourceId": c.source_id,
            "chunkIndex": c.chunk_index,
            "chunkText": c.chunk_text,
            "embeddingModel": c.embedding_model,
            "score": 1.0,  # Keyword match — no real scoring yet
        }
        for c in chunks
    ]


@router.get(
    "/{source_id}/chunks",
    summary="Get chunks for a knowledge source",
)
async def get_chunks(
    source_id: str,
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Retrieve all text chunks for a given knowledge source."""
    chunk_repo = KnowledgeChunkRepository(session)
    chunks = await chunk_repo.get_by_source(source_id)
    return [
        {
            "id": c.id,
            "sourceId": c.source_id,
            "chunkIndex": c.chunk_index,
            "chunkText": c.chunk_text,
            "embeddingModel": c.embedding_model,
        }
        for c in chunks
    ]


@router.delete(
    "/{source_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a knowledge source"
)
async def delete_source(
    source_id: str, service: KnowledgeService = Depends(get_knowledge_service)
) -> None:
    success = await service.delete_source(source_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found.")


