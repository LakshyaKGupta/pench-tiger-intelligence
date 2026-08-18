#!/usr/bin/env bash
# ==============================================================================
# TIGERTRACK AI — Production Standalone macOS App & DMG Packaging Script
# Creates a double-clickable "TIGERTRACK AI.app" and distributable ".dmg"
# 100% Local Offline Operation — Zero Cloud Connectivity Required
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${SCRIPT_DIR}/dist"
APP_NAME="TIGERTRACK AI"
APP_BUNDLE="${DIST_DIR}/${APP_NAME}.app"
DMG_NAME="TIGERTRACK_AI_3.2.0_macOS_arm64.dmg"
DMG_PATH="${DIST_DIR}/${DMG_NAME}"
STAGING_DIR="${DIST_DIR}/dmg_staging"

echo "========================================================================"
echo "🐅 Packaging ${APP_NAME} for macOS (Apple Silicon / Universal)"
echo "========================================================================"

mkdir -p "${DIST_DIR}"
rm -rf "${APP_BUNDLE}" "${STAGING_DIR}" "${DMG_PATH}"

# 1. Build Production Frontend Bundle
echo "► [1/5] Building Production Frontend..."
cd "${SCRIPT_DIR}/frontend"
npm run build

# 2. Compile Python Intelligence Backend Sidecar
echo "► [2/5] Compiling Python Intelligence Engine..."
cd "${SCRIPT_DIR}/tiger-intelligence"
if command -v pyinstaller &> /dev/null; then
    pyinstaller --noconfirm pyinstaller.spec
    echo "✓ Sidecar compiled in tiger-intelligence/dist/tiger-intelligence-sidecar"
else
    echo "⚠️  PyInstaller not found on PATH. Bundling Python source tree directly."
fi

# 3. Construct macOS Application Bundle Hierarchy
echo "► [3/5] Constructing macOS App Bundle structure..."
mkdir -p "${APP_BUNDLE}/Contents/MacOS"
mkdir -p "${APP_BUNDLE}/Contents/Resources"
mkdir -p "${APP_BUNDLE}/Contents/Resources/app"
mkdir -p "${APP_BUNDLE}/Contents/Resources/frontend"
mkdir -p "${APP_BUNDLE}/Contents/Resources/database"
mkdir -p "${APP_BUNDLE}/Contents/Resources/models"
mkdir -p "${APP_BUNDLE}/Contents/Resources/data"

# Copy App Icons
if [ -f "${SCRIPT_DIR}/frontend/src-tauri/icons/icon.icns" ]; then
    cp -f "${SCRIPT_DIR}/frontend/src-tauri/icons/icon.icns" "${APP_BUNDLE}/Contents/Resources/AppIcon.icns"
fi

# Copy Info.plist
cat <<EOF > "${APP_BUNDLE}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleDisplayName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>org.pench.tigertrack</string>
    <key>CFBundleVersion</key>
    <string>3.2.0</string>
    <key>CFBundleShortVersionString</key>
    <string>3.2.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleExecutable</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>12.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
</dict>
</plist>
EOF

cat <<EOF > "${APP_BUNDLE}/Contents/PkgInfo"
APPL????
EOF

# Copy Frontend Production Assets
echo "  • Copying frontend artifacts..."
cp -R "${SCRIPT_DIR}/frontend/.output" "${APP_BUNDLE}/Contents/Resources/frontend/.output"
cp "${SCRIPT_DIR}/frontend/package.json" "${APP_BUNDLE}/Contents/Resources/frontend/"

# Copy Backend Source, Models, Data & Database
echo "  • Copying AI models, database, and backend engine..."
cp -R "${SCRIPT_DIR}/tiger-intelligence/app" "${APP_BUNDLE}/Contents/Resources/app/"
cp -R "${SCRIPT_DIR}/tiger-intelligence/database" "${APP_BUNDLE}/Contents/Resources/"
cp -R "${SCRIPT_DIR}/tiger-intelligence/models" "${APP_BUNDLE}/Contents/Resources/"
cp -R "${SCRIPT_DIR}/tiger-intelligence/data" "${APP_BUNDLE}/Contents/Resources/"

if [ -f "${SCRIPT_DIR}/tiger-intelligence/dist/tiger-intelligence-sidecar" ]; then
    cp -f "${SCRIPT_DIR}/tiger-intelligence/dist/tiger-intelligence-sidecar" "${APP_BUNDLE}/Contents/MacOS/tiger-intelligence-sidecar"
    chmod +x "${APP_BUNDLE}/Contents/MacOS/tiger-intelligence-sidecar"
fi

# 4. Create App Launcher Executable
echo "► [4/5] Creating Native App Launcher..."
cat <<'EOF' > "${APP_BUNDLE}/Contents/MacOS/${APP_NAME}"
#!/usr/bin/env bash
# ==============================================================================
# TIGERTRACK AI — Main Launcher
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOURCES="${DIR}/../Resources"
BACKEND_PORT=8000
FRONTEND_PORT=3000

export PROJECT_ROOT="${RESOURCES}"
export PYTHONPATH="${RESOURCES}:${RESOURCES}/app:${PYTHONPATH:-}"

LOG_DIR="${HOME}/Library/Logs/TIGERTRACK_AI"
mkdir -p "${LOG_DIR}"
BACKEND_LOG="${LOG_DIR}/backend.log"
FRONTEND_LOG="${LOG_DIR}/frontend.log"

echo "🐅 Launching TIGERTRACK AI..." > "${BACKEND_LOG}"

# 1. Start Backend Intelligence Service
if [ -x "${DIR}/tiger-intelligence-sidecar" ]; then
    "${DIR}/tiger-intelligence-sidecar" >> "${BACKEND_LOG}" 2>&1 &
    BACKEND_PID=$!
else
    python3 "${RESOURCES}/app/api/server.py" >> "${BACKEND_LOG}" 2>&1 &
    BACKEND_PID=$!
fi

# 2. Start Frontend Service
cd "${RESOURCES}/frontend"
if [ -f ".output/server/index.mjs" ]; then
    PORT="${FRONTEND_PORT}" node .output/server/index.mjs >> "${FRONTEND_LOG}" 2>&1 &
    FRONTEND_PID=$!
else
    PORT="${FRONTEND_PORT}" npx vite preview >> "${FRONTEND_LOG}" 2>&1 &
    FRONTEND_PID=$!
fi

cleanup() {
    if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
        kill "${BACKEND_PID}" 2>/dev/null || true
    fi
    if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
        kill "${FRONTEND_PID}" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

# 3. Wait for services to become healthy
for i in {1..30}; do
    if curl -s "http://127.0.0.1:${BACKEND_PORT}/api/system/health" >/dev/null 2>&1 && \
       curl -s "http://127.0.0.1:${FRONTEND_PORT}" >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

# 4. Open Dedicated App Window
URL="http://127.0.0.1:${FRONTEND_PORT}/dashboard"

if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args "--app=${URL}"
elif [ -d "/Applications/Brave Browser.app" ]; then
    open -na "Brave Browser" --args "--app=${URL}"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args "--app=${URL}"
else
    open "${URL}"
fi

wait
EOF

chmod +x "${APP_BUNDLE}/Contents/MacOS/${APP_NAME}"

# 5. Build Distribution DMG Installer
echo "► [5/5] Building Distribution Disk Image (.dmg)..."
mkdir -p "${STAGING_DIR}"
cp -R "${APP_BUNDLE}" "${STAGING_DIR}/"
ln -s /Applications "${STAGING_DIR}/Applications"

hdiutil create -volname "${APP_NAME} 3.2.0" \
    -srcfolder "${STAGING_DIR}" \
    -ov -format UDZO \
    "${DMG_PATH}"

rm -rf "${STAGING_DIR}"

echo "========================================================================"
echo "🎉 SUCCESS: TIGERTRACK AI Packaged Successfully!"
echo "   • macOS App Bundle : ${APP_BUNDLE}"
echo "   • Downloadable DMG : ${DMG_PATH}"
echo "   • Size             : $(du -sh "${DMG_PATH}" | awk '{print $1}')"
echo "========================================================================"
