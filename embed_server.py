"""
Lightweight Universal HuggingFace / SentenceTransformers Embedding Microserver
Hosts any HuggingFace embedding model (e.g. BAAI/bge-small-en-v1.5, all-MiniLM-L6-v2) on port 8001.
"""

import os
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="OpenMind Embedding Microserver")

# Load model (can be set via MODEL_NAME env var)
MODEL_NAME = os.getenv("MODEL_NAME", "BAAI/bge-small-en-v1.5")
print(f"Loading embedding model: {MODEL_NAME} ...")

try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME)
    print(f"Model {MODEL_NAME} loaded successfully!")
except Exception as e:
    print(f"SentenceTransformers load error: {e}")
    model = None


class EmbeddingRequest(BaseModel):
    inputs: list[str] | str | None = None
    input: list[str] | str | None = None
    model: str | None = None
    input_type: str | None = "query"


@app.get("/health")
@app.get("/v1/health/live")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/embed")
@app.post("/v1/embeddings")
def get_embeddings(req: EmbeddingRequest):
    raw_texts = req.inputs or req.input or [""]
    texts = [raw_texts] if isinstance(raw_texts, str) else raw_texts

    if model is None:
        raise RuntimeError("Model is not initialized.")

    # Encode texts to embeddings
    vectors = model.encode(texts, normalize_embeddings=True)
    embeddings = [v.tolist() for v in vectors]

    return {
        "status": "success",
        "data": [{"index": i, "embedding": vec} for i, vec in enumerate(embeddings)],
        "embeddings": embeddings,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
