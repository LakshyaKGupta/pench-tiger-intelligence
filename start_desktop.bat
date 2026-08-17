@echo off
REM ==============================================================================
REM TIGERTRACK AI — Pench Tiger Reserve Intelligence Desktop Launcher (Windows)
REM 100% Local Offline Operation — Zero Cloud Connectivity Required
REM ==============================================================================

echo ========================================================================
echo 🐅 TIGERTRACK AI -- Pench Tiger Reserve Intelligence Platform
echo    Mode: 100%% Local Offline Workstation
echo ========================================================================

cd /d "%~dp0tiger-intelligence"
echo ► Starting Local Intelligence Engine (FastAPI Bridge)...
start /b python app\api\server.py

timeout /t 2 /nobreak >nul

cd /d "%~dp0frontend"
echo ► Launching TIGERTRACK AI Desktop Interface...
npm run dev
