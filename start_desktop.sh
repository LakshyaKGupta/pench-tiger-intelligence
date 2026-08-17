#!/usr/bin/env bash
# ==============================================================================
# TIGERTRACK AI — Pench Tiger Reserve Intelligence Desktop Launcher (macOS/Linux)
# 100% Local Offline Operation — Zero Cloud Connectivity Required
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/tiger-intelligence"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"

echo "========================================================================"
echo "🐅 TIGERTRACK AI — Pench Tiger Reserve Intelligence Platform"
echo "   Mode: 100% Local Offline Workstation"
echo "========================================================================"

# 1. Start Python Intelligence Engine in background
echo "► Starting Local Intelligence Engine (FastAPI Bridge)..."
cd "${BACKEND_DIR}"
python3 app/api/server.py &
BACKEND_PID=$!

cleanup() {
    echo ""
    echo "🛑 Shutting down TIGERTRACK AI Workstation..."
    if kill -0 "${BACKEND_PID}" 2>/dev/null; then
        kill "${BACKEND_PID}" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Wait briefly for FastAPI bridge health check
echo "► Verifying Local Intelligence Service Health..."
for i in {1..15}; do
    if curl -s http://127.0.0.1:8000/api/system/health >/dev/null 2>&1; then
        echo "✓ Local Intelligence Engine is OPERATIONAL on http://127.0.0.1:8000"
        break
    fi
    sleep 0.5
done

# 3. Launch Frontend Dashboard / Tauri Desktop Shell
echo "► Launching TIGERTRACK AI Desktop Interface..."
cd "${FRONTEND_DIR}"

if command -v cargo-tauri &> /dev/null || [ -x "node_modules/.bin/tauri" ]; then
    echo "► Launching Native Tauri v2 Desktop Window..."
    npm run dev
else
    echo "► Launching Local Application Server..."
    npm run dev
fi
