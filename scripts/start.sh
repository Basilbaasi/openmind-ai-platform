#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# start.sh – Start the OpenMind AI Platform development server
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

echo "🧠 Starting OpenMind AI Platform..."
echo ""

# Load defaults
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
LOG_LEVEL="${LOG_LEVEL:-info}"

uvicorn app.main:app \
    --host "$HOST" \
    --port "$PORT" \
    --log-level "$LOG_LEVEL" \
    --reload
