# Implementation Plan: TIGERTRACK AI Cross-Platform Offline Desktop Application

## Overview
Transform TIGERTRACK AI into a 100% offline, cross-platform native desktop application (macOS & Windows) using Tauri v2, the existing verified Python intelligence backend (`LakshyaKGupta/pench-tiger-intelligence`), SQLite persistence, local model weights, and the dark-forest operational React dashboard (`salonimeshram57/tiger-track-ai`).

## Architectural Decisions
1. **Desktop Shell & Lifecycle**: Tauri v2 shell hosting the React/TypeScript frontend and orchestrating the local Python intelligence service via a sidecar process.
2. **Platform-Aware Storage Root**: All persistent state (SQLite `tiger.db`, processed media, crops, quarantine, imports, exports, audit logs) lives in standard OS AppData (`~/Library/Application Support/TIGERTRACK AI/` on macOS and `%APPDATA%\TIGERTRACK AI\` on Windows).
3. **Ingestion Adapter Pattern**: Universal source adapter supporting Mounted SD Cards, Local Folders, and USB/External Drives with pre-scan metadata analysis (duplicates, corrupt headers, total byte volume).
4. **Canonical Entity Media Streaming**: Safe media retrieval via `GET /api/images/{id}/content`, `GET /api/detections/{id}/crop`, and `GET /api/tigers/{id}/reference-crop`.
5. **Real-time Pipeline State Machine**: SSE event stream (`/api/pipeline/events`) tracking 10 distinct states (`DISCOVERING` -> `VALIDATING` -> `DEDUPLICATING` -> `METADATA_EXTRACTION` -> `TRIAGE` -> `DETECTION` -> `REID` -> `MOVEMENT` -> `ALERTS` -> `COMPLETED`).
6. **Full Alert Lifecycle**: `OPEN` -> `ACKNOWLEDGED` -> `RESOLVED` / `FALSE_POSITIVE` / `SUPPRESSED` with required officer justification logs.
7. **System Health & Diagnostic Center**: Live diagnostic subsystem verifying model availability on disk, SQLite write access, disk space, and Python sidecar telemetry.

---

## Task Breakdown

### Phase 1: Platform Data Architecture & Path Traversal-Safe Entity API
- [ ] Task 1.1: Implement `StorageManager` in `app/storage/manager.py` with platform-aware AppData directories, migration utilities, and disk capacity reporting.
- [ ] Task 1.2: Restructure image and crop serving endpoints in `app/api/server.py` to use canonical entity IDs (`/api/images/{id}/content`, `/api/detections/{id}/crop`, `/api/tigers/{id}/reference-crop`) with strict AppData boundary enforcement.
- [ ] Task 1.3: Implement `SystemHealthService` in `app/api/server.py` exposing `GET /api/system/health` (models present, DB writable, free disk space, runtime version).

### Phase 2: Ingestion Adapter Architecture & Real-Time SSE Stream
- [ ] Task 2.1: Build `IngestionSourceAdapter` hierarchy supporting SD Cards, Local Folders, and USB Mounts with pre-scan validation (`POST /api/pipeline/prescan`).
- [ ] Task 2.2: Implement 10-stage ingestion state machine with Server-Sent Events (`GET /api/pipeline/events`) and batch run history persistence (`GET /api/pipeline/runs`).

### Phase 3: Alert Lifecycle & Forensic Rationale Dialogs
- [ ] Task 3.1: Implement full alert state machine in `AlertEngine` and API (`POST /api/alerts/{id}/acknowledge`, `POST /api/alerts/{id}/resolve`, `POST /api/alerts/{id}/false-positive`, `POST /api/alerts/{id}/suppress`).
- [ ] Task 3.2: Update frontend Alert Center with state transition modal requiring officer justification and linking directly to the immutable audit log.

### Phase 4: Tauri v2 Desktop Shell Setup & Sidecar Orchestration
- [ ] Task 4.1: Configure Tauri v2 project structure in `frontend/src-tauri` with window configurations, security capabilities, and native folder picker integrations.
- [ ] Task 4.2: Implement Tauri sidecar process launcher to auto-spawn the local Python FastAPI service on desktop startup and cleanly terminate on window close.
- [ ] Task 4.3: Add System Health & Settings tab (`/dashboard/system`) showing offline status, model versions, storage path selector, and diagnostics.

### Phase 5: End-to-End Acceptance & Packaging Validation
- [ ] Task 5.1: Write automated end-to-end acceptance test covering fresh database initialization, SD card ingestion, human review, alert resolution, and restart persistence.
- [ ] Task 5.2: Verify complete backend test suite (`python3 -m unittest discover -s tests -v`) and frontend build (`npm run build`).
- [ ] Task 5.3: Verify true offline execution and package desktop application.
