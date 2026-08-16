#!/usr/bin/env bash
# download_offline_models.sh — Download offline weights for Pench Tiger Intelligence System
set -e

MODELS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../models" && pwd)"
mkdir -p "$MODELS_DIR"

echo "🐅 Downloading offline model weights to $MODELS_DIR..."

# 1. MegaDetector V6 (Zenodo Release)
MDV6_FILE="$MODELS_DIR/MDV6-mit-yolov9-c.ckpt"
if [ ! -f "$MDV6_FILE" ]; then
    echo "► Downloading MegaDetector V6 (MDV6-mit-yolov9-c.ckpt)..."
    curl -L "https://zenodo.org/records/15398270/files/MDV6-mit-yolov9-c.ckpt?download=1" -o "$MDV6_FILE"
    echo "✅ MegaDetector V6 downloaded successfully."
else
    echo "✅ MegaDetector V6 already cached locally."
fi

echo "🎉 All offline model weights are ready."
