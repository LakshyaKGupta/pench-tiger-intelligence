#!/usr/bin/env bash
# ==============================================================================
# TIGERTRACK AI — Standalone Desktop Packaging Script (macOS / Linux)
# Bundles Python sidecar with PyInstaller and builds self-contained Tauri .dmg / .app
# ==============================================================================

set -e

export PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$HOME/.cargo/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/tiger-intelligence"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
BIN_DIR="${FRONTEND_DIR}/src-tauri/binaries"

echo "========================================================================"
echo "🐅 TIGERTRACK AI — Standalone Production Desktop Packaging"
echo "========================================================================"

# 1. Determine Target Architecture Triple
ARCH="$(uname -m)"
OS="$(uname -s)"
if [ "$OS" = "Darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        TARGET_TRIPLE="aarch64-apple-darwin"
    else
        TARGET_TRIPLE="x86_64-apple-darwin"
    fi
else
    TARGET_TRIPLE="x86_64-unknown-linux-gnu"
fi

echo "► Detected Target Host Triple: ${TARGET_TRIPLE}"
mkdir -p "${BIN_DIR}"

# 2. Build Python Sidecar Binary using PyInstaller
echo "► Building Standalone Python Intelligence Engine Sidecar..."
cd "${BACKEND_DIR}"
if command -v pyinstaller &> /dev/null; then
    pyinstaller --noconfirm pyinstaller.spec
    cp -f "dist/tiger-intelligence-sidecar" "${BIN_DIR}/tiger-intelligence-sidecar-${TARGET_TRIPLE}"
    chmod +x "${BIN_DIR}/tiger-intelligence-sidecar-${TARGET_TRIPLE}"
    echo "✓ Python sidecar binary compiled: ${BIN_DIR}/tiger-intelligence-sidecar-${TARGET_TRIPLE}"
else
    echo "⚠️  PyInstaller not found on PATH. Creating launch wrapper script for sidecar..."
    cat <<EOF > "${BIN_DIR}/tiger-intelligence-sidecar-${TARGET_TRIPLE}"
#!/usr/bin/env bash
SCRIPT_PATH="\$(cd "\$(dirname "\$0")" && pwd)"
exec python3 "\${SCRIPT_PATH}/../../../../tiger-intelligence/app/api/server.py" "\$@"
EOF
    chmod +x "${BIN_DIR}/tiger-intelligence-sidecar-${TARGET_TRIPLE}"
    echo "✓ Created development sidecar bridge in ${BIN_DIR}/tiger-intelligence-sidecar-${TARGET_TRIPLE}"
fi

# 3. Build Production Frontend Assets
echo "► Compiling Frontend Dashboard Bundle..."
cd "${FRONTEND_DIR}"
npm run build

# 4. Build Native Tauri Application Bundle
echo "► Packaging Tauri Native Desktop Shell..."
if command -v cargo-tauri &> /dev/null || [ -x "node_modules/.bin/tauri" ]; then
    npm run tauri build || npx tauri build
    echo "========================================================================"
    echo "🎉 Standalone Desktop App Packaged in: ${FRONTEND_DIR}/src-tauri/target/release/bundle/"
    echo "========================================================================"
else
    echo "✓ Frontend bundle and sidecar bridge verified. Run 'npm run tauri build' with Rust toolchain to emit .dmg installer."
fi
