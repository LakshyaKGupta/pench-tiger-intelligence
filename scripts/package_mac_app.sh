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

# 1. Build Production Frontend Bundle with node-server preset
echo "► [1/5] Building Production Frontend with Node Server..."
cd "${SCRIPT_DIR}/frontend"
NITRO_PRESET=node-server npm run build

# Generate index.html in public output for Tauri / webview fallback
CSS_FILE=$(ls .output/public/assets/styles-*.css 2>/dev/null | head -n 1 | xargs -n 1 basename || echo "styles-gfTonbdg.css")
JS_FILE=$(ls .output/public/assets/index-*.js 2>/dev/null | head -n 1 | xargs -n 1 basename || echo "index-x_4WnlWL.js")

cat <<EOF > .output/public/index.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TIGERTRACK AI — Pench Tiger Reserve Intelligence Platform</title>
  <link rel="stylesheet" href="/assets/${CSS_FILE}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</head>
<body style="margin:0;padding:0;background:#090b0e;color:#e1e7ec;font-family:sans-serif;">
  <div id="root"></div>
  <script type="module" src="/assets/${JS_FILE}"></script>
  <script>
    // Automatic fallback redirect to local server if loaded via webview
    if (window.location.protocol === 'file:' || window.location.protocol === 'tauri:') {
      fetch('http://127.0.0.1:3000/dashboard', { mode: 'no-cors' })
        .then(() => { window.location.href = 'http://127.0.0.1:3000/dashboard'; })
        .catch(() => {
          setTimeout(() => { window.location.href = 'http://127.0.0.1:3000/dashboard'; }, 1000);
        });
    }
  </script>
</body>
</html>
EOF

# 2. Check or Compile Python Intelligence Backend Sidecar
echo "► [2/5] Preparing Python Intelligence Engine Sidecar..."
cd "${SCRIPT_DIR}/tiger-intelligence"
if [ ! -f "dist/tiger-intelligence-sidecar" ]; then
    if command -v pyinstaller &> /dev/null; then
        pyinstaller --noconfirm pyinstaller.spec
        echo "✓ Sidecar compiled in tiger-intelligence/dist/tiger-intelligence-sidecar"
    fi
else
    echo "✓ Existing compiled sidecar verified in tiger-intelligence/dist/tiger-intelligence-sidecar"
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

# 4. Create Robust App Launcher Executable (with GUI $PATH discovery)
echo "► [4/5] Creating Native App Launcher..."
cat <<'EOF' > "${APP_BUNDLE}/Contents/MacOS/${APP_NAME}"
#!/usr/bin/env bash
# ==============================================================================
# TIGERTRACK AI — Main Launcher
# ==============================================================================

set -e

# Detect user environment PATH when opened from Finder GUI
NVM_NODE_BIN=""
if [ -d "${HOME}/.nvm/versions/node" ]; then
    LATEST_NVM=$(ls -d "${HOME}/.nvm/versions/node/"* 2>/dev/null | tail -n 1)
    if [ -n "${LATEST_NVM}" ] && [ -d "${LATEST_NVM}/bin" ]; then
        NVM_NODE_BIN="${LATEST_NVM}/bin"
    fi
fi

export PATH="/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/Library/Frameworks/Python.framework/Versions/Current/bin:/Library/Frameworks/Python.framework/Versions/3.14/bin:/Library/Frameworks/Python.framework/Versions/3.12/bin:/Library/Frameworks/Python.framework/Versions/3.11/bin:${NVM_NODE_BIN}:${HOME}/.cargo/bin:${HOME}/.local/bin:${PATH}"

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

echo "🐅 [$(date '+%Y-%m-%d %H:%M:%S')] Launching TIGERTRACK AI Desktop Services..." > "${BACKEND_LOG}"
echo "🐅 [$(date '+%Y-%m-%d %H:%M:%S')] Launching TIGERTRACK AI Frontend Server..." > "${FRONTEND_LOG}"

# 1. Start Backend Intelligence Service
if [ -x "${DIR}/tiger-intelligence-sidecar" ]; then
    echo "► Starting compiled sidecar binary..." >> "${BACKEND_LOG}"
    "${DIR}/tiger-intelligence-sidecar" >> "${BACKEND_LOG}" 2>&1 &
    BACKEND_PID=$!
else
    echo "► Starting python server..." >> "${BACKEND_LOG}"
    python3 "${RESOURCES}/app/api/server.py" >> "${BACKEND_LOG}" 2>&1 &
    BACKEND_PID=$!
fi

# 2. Start Frontend Server
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

# Open in standalone application window mode if Chrome / Brave / Edge exists, else default browser
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
