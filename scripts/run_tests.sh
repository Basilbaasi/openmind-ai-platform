#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# run_tests.sh – Run the test suite with coverage
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

echo "🧪 Running OpenMind AI Platform tests..."
echo ""

pytest tests/ -v --tb=short "$@"
