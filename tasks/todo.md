# TIGERTRACK AI Desktop Application Implementation Tasks

## Phase 1: Platform Data Architecture & Path Traversal-Safe Entity API
- [x] Task 1.1: Implement StorageManager in `app/storage/manager.py` with platform-aware AppData directories
- [x] Task 1.2: Restructure image and crop serving endpoints to canonical IDs (`/api/images/{id}/content`, `/api/detections/{id}/crop`, `/api/tigers/{id}/reference-crop`)
- [x] Task 1.3: Implement SystemHealthService exposing `GET /api/system/health`
- [x] Checkpoint 1: Storage and Entity Media API verified

## Phase 2: Ingestion Adapter Architecture & Real-Time SSE Stream
- [x] Task 2.1: Implement `IngestionSourceAdapter` hierarchy with pre-scan endpoint (`POST /api/pipeline/prescan`)
- [x] Task 2.2: Implement 10-stage ingestion state machine with Server-Sent Events (`GET /api/pipeline/events`) and batch run history persistence (`GET /api/pipeline/runs`)
- [x] Checkpoint 2: Ingestion Pre-Scan and Real-Time SSE Stream verified

## Phase 3: Alert Lifecycle & Forensic Rationale Dialogs
- [x] Task 3.1: Update `app/alerts/engine.py` and API with explicit state transitions (`OPEN` -> `ACKNOWLEDGED` -> `RESOLVED` / `FALSE_POSITIVE` / `SUPPRESSED`)
- [x] Task 3.2: Add officer justification note requirement & modal in frontend `frontend/src/routes/dashboard/alerts.tsx`
- [x] Checkpoint 3: Alert lifecycle transitions and justification logging verified

## Phase 4: Tauri v2 Desktop Shell Setup & Sidecar Orchestration
- [x] Task 4.1: Configure Tauri v2 project structure in `frontend/src-tauri` (`tauri.conf.json`, `Cargo.toml`, `src/main.rs`, `src/lib.rs`, `capabilities/default.json`)
- [x] Task 4.2: Implement sidecar process supervisor logic to auto-launch local Python intelligence engine and handle clean shutdown
- [x] Task 4.3: Add cross-platform launcher scripts `start_desktop.sh` (macOS/Linux) and `start_desktop.bat` (Windows) for one-click developer and production startup
- [x] Checkpoint 4: Tauri v2 structure and Sidecar launch verified

## Phase 5: End-to-End Acceptance & Packaging Validation
- [x] Task 5.1: Write automated end-to-end acceptance test for fresh DB lifecycle (`tests/test_e2e_acceptance.py`)
- [x] Task 5.2: Verify full offline execution with zero internet connectivity
- [x] Task 5.3: Verify all 14 dashboard UI surfaces, System Diagnostics, and Ingestion Pre-Scan in real browser
- [x] Checkpoint 5: Complete offline desktop system validated
