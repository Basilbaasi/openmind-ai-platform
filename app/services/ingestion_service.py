"""
Document ingestion service — text extraction and semantic chunking.

Handles:
1. Text extraction from PDF (via PyMuPDF/fitz), Markdown, and plain text files
2. Semantic chunking: paragraph-aware splitting with configurable chunk size and overlap
3. Storage of chunks linked to a knowledge source record
"""

import os
import re

import structlog

logger = structlog.get_logger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file using PyMuPDF (fitz)."""
    import fitz  # PyMuPDF

    text_parts: list[str] = []
    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_text = page.get_text("text")
            if page_text.strip():
                text_parts.append(page_text)
        doc.close()
    except Exception as e:
        logger.error("pdf_extraction_failed", file_path=file_path, error=str(e))
        raise

    return "\n\n".join(text_parts)


def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Extract text from a file based on its type."""
    if file_type == "PDF":
        return extract_text_from_pdf(file_path)
    else:
        # Markdown or plain text — just read the file
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()


def semantic_chunk_text(
    text: str,
    chunk_size: int = 512,
    overlap: int = 50,
) -> list[str]:
    """
    Split text into semantic chunks based on paragraph boundaries.

    Strategy:
    1. Split text into paragraphs (double newline boundaries)
    2. Merge small paragraphs together until reaching chunk_size
    3. If a single paragraph exceeds chunk_size, split it by sentences
    4. Apply overlap between consecutive chunks

    Args:
        text: The full document text
        chunk_size: Target maximum characters per chunk
        overlap: Number of characters to overlap between chunks

    Returns:
        List of text chunks
    """
    if not text.strip():
        return []

    # Split into paragraphs (one or more blank lines)
    paragraphs = re.split(r"\n\s*\n", text.strip())
    paragraphs = [p.strip() for p in paragraphs if p.strip()]

    if not paragraphs:
        return []

    chunks: list[str] = []
    current_chunk: list[str] = []
    current_length = 0

    for para in paragraphs:
        para_length = len(para)

        # If adding this paragraph would exceed chunk_size,
        # finalize the current chunk first
        if current_length + para_length > chunk_size and current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            chunks.append(chunk_text)

            # Apply overlap: keep the tail of the previous chunk
            if overlap > 0 and chunk_text:
                overlap_text = chunk_text[-overlap:]
                current_chunk = [overlap_text]
                current_length = len(overlap_text)
            else:
                current_chunk = []
                current_length = 0

        # If a single paragraph is larger than chunk_size, split by sentences
        if para_length > chunk_size:
            sentences = re.split(r"(?<=[.!?])\s+", para)
            for sentence in sentences:
                if current_length + len(sentence) > chunk_size and current_chunk:
                    chunk_text = "\n\n".join(current_chunk)
                    chunks.append(chunk_text)
                    if overlap > 0 and chunk_text:
                        overlap_text = chunk_text[-overlap:]
                        current_chunk = [overlap_text]
                        current_length = len(overlap_text)
                    else:
                        current_chunk = []
                        current_length = 0

                current_chunk.append(sentence)
                current_length += len(sentence)
        else:
            current_chunk.append(para)
            current_length += para_length

    # Don't forget the last chunk
    if current_chunk:
        chunk_text = "\n\n".join(current_chunk)
        if chunk_text.strip():
            chunks.append(chunk_text)

    return chunks


async def ingest_document(
    file_path: str,
    file_type: str,
    source_id: str,
    embedding_model: str,
    db_session,
    chunk_size: int = 512,
    overlap: int = 50,
) -> int:
    """
    Full ingestion pipeline: extract text, chunk, and store in DB.

    Args:
        file_path: Path to the uploaded file
        file_type: One of "PDF", "Markdown", "Text"
        source_id: The knowledge_sources.id to link chunks to
        embedding_model: Name of the embedding model selected by the user
        db_session: AsyncSession for database operations
        chunk_size: Target chunk size in characters
        overlap: Overlap between chunks in characters

    Returns:
        Number of chunks created
    """
    from app.storage.knowledge_chunk_repository import KnowledgeChunkRepository

    logger.info(
        "ingestion_started",
        file_path=file_path,
        file_type=file_type,
        source_id=source_id,
        embedding_model=embedding_model,
    )

    # Step 1: Extract text
    text = extract_text_from_file(file_path, file_type)
    logger.info("text_extracted", chars=len(text), file_path=os.path.basename(file_path))

    # Step 2: Semantic chunking
    chunks = semantic_chunk_text(text, chunk_size=chunk_size, overlap=overlap)
    logger.info("chunking_complete", chunks_count=len(chunks))

    # Step 3: Store chunks in DB
    chunk_repo = KnowledgeChunkRepository(db_session)
    for i, chunk_text in enumerate(chunks):
        await chunk_repo.create(
            source_id=source_id,
            chunk_index=i,
            chunk_text=chunk_text,
            embedding_model=embedding_model,
        )

    logger.info(
        "ingestion_complete",
        source_id=source_id,
        chunks_stored=len(chunks),
        embedding_model=embedding_model,
    )

    return len(chunks)
