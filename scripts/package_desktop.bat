@echo off
REM ==============================================================================
REM TIGERTRACK AI — Standalone Desktop Packaging Script (Windows)
REM Bundles Python sidecar with PyInstaller and builds self-contained Tauri .msi / .exe
REM ==============================================================================

echo ========================================================================
echo 🐅 TIGERTRACK AI -- Standalone Production Desktop Packaging (Windows)
echo ========================================================================

set TARGET_TRIPLE=x86_64-pc-windows-msvc
set BIN_DIR=%~dp0..\frontend\src-tauri\binaries

if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

echo ► Building Standalone Python Intelligence Engine Sidecar...
cd /d "%~dp0..\tiger-intelligence"
pyinstaller --noconfirm pyinstaller.spec
if exist "dist\tiger-intelligence-sidecar.exe" (
    copy /y "dist\tiger-intelligence-sidecar.exe" "%BIN_DIR%\tiger-intelligence-sidecar-%TARGET_TRIPLE%.exe"
    echo ✓ Python sidecar binary compiled: %BIN_DIR%\tiger-intelligence-sidecar-%TARGET_TRIPLE%.exe
)

echo ► Compiling Frontend Dashboard Bundle...
cd /d "%~dp0..\frontend"
call npm run build

echo ► Packaging Tauri Native Desktop Shell...
call npm run tauri build

echo ========================================================================
echo 🎉 Standalone Desktop App Packaged in: %~dp0..\frontend\src-tauri\target\release\bundle\
echo ========================================================================
