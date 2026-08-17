# TIGERTRACK AI — Production-Readiness Engineering Audit

**Version**: 3.2.0  
**Target Systems**: macOS (Apple Silicon / Intel) & Windows 10/11 (x64)  
**Deployment Model**: 100% Offline Standalone Desktop Application (Tauri v2 + Local Python Intelligence Engine + Local SQLite)

---

## 🎯 Executive Audit Summary

The architectural foundation of **TIGERTRACK AI** is sound and adheres to the required offline desktop intelligence model. However, to transition from a development prototype to a genuine, zero-dependency, non-developer distributable production desktop application, the following items must be resolved across P0, P1, P2, and P3 priorities.

---

## 🚨 Prioritized Defect & Blocker Registry

### 🔴 P0 — Prevents Correct Operational or Standalone Execution
*These defects either cause incorrect intelligence data, break offline execution, or prevent standalone desktop operation without developer tooling.*

1. **[P0-1] Downstream Movement & Range Inconsistency on Human Review Reassignment**:
   - *Location*: [`tiger-intelligence/app/database/db.py:apply_human_correction`](file:///Users/lol/Docs/antigravity/babbar%20sher/tiger-intelligence/app/database/db.py#L557)
   - *Root Cause*: When an officer reassigns a detection from Tiger A to Tiger B, `detections.verified_tiger_id` is updated, but `movement_records` is NOT updated or re-indexed. Downstream movement trajectories, home range MCP areas, and centroid shift alerts still reflect the pre-correction AI prediction.
   - *Fix*: In `apply_human_correction()`, execute within a single atomic SQLite transaction:
     - Update `detections` (`human_decision`, `verified_tiger_id`, `human_verified=1`).
     - Update or insert `movement_records` (`UPDATE movement_records SET tiger_id = ? WHERE detection_id = ?`).
     - Auto-register `tigers` profile if `human_decision == 'NEW_TIGER'`.
     - Trigger background recalculation of home range centroids and MCP areas for affected tiger IDs.

2. **[P0-2] Hugging Face Hub / PyTorch Hub Offline Network Leak**:
   - *Location*: [`tiger-intelligence/app/reid/extractor.py`](file:///Users/lol/Docs/antigravity/babbar%20sher/tiger-intelligence/app/reid/extractor.py#L40) & [`tiger-intelligence/app/detection/detector.py`](file:///Users/lol/Docs/antigravity/babbar%20sher/tiger-intelligence/app/detection/detector.py)
   - *Root Cause*: `timm.create_model("hf-hub:BVRA/MegaDescriptor-T-224", pretrained=True)` attempts DNS resolution / HF Hub metadata lookup on initial instantiation if environment variables `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1` are not strictly enforced before library imports, resulting in `ResourceWarning` and unauthenticated request warnings.
   - *Fix*: Enforce global offline environment flags at module load time, verify local weight checkpoints in `tiger-intelligence/models/`, and pass local checkpoint paths directly to `timm` / `ultralytics` with zero network fallback.

3. **[P0-3] External Google Fonts CDN Link in Root HTML**:
   - *Location*: [`frontend/src/routes/__root.tsx`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src/routes/__root.tsx#L95-L100)
   - *Root Cause*: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2...">` requires an active internet connection. On an air-gapped field workstation, this causes console network errors and rendering delays.
   - *Fix*: Remove external Google Fonts links. Define robust offline `@font-face` definitions or native high-legibility system typography stacks (`ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'JetBrains Mono', sans-serif`).

4. **[P0-4] Standalone Sidecar Packaging & Distribution Tooling**:
   - *Location*: [`frontend/src-tauri/tauri.conf.json`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src-tauri/tauri.conf.json) & root build scripts
   - *Root Cause*: Standalone distribution requires non-developer users (forest officers/judges) to run the app without installing Python 3.14, Node.js, npm, or PyTorch.
   - *Fix*: 
     - Create PyInstaller build spec [`tiger-intelligence/pyinstaller.spec`](file:///Users/lol/Docs/antigravity/babbar%20sher/tiger-intelligence/pyinstaller.spec) to freeze `app/api/server.py` into a single self-contained sidecar executable (`tiger-intelligence-sidecar`).
     - Configure Tauri external sidecar targets in `tauri.conf.json` (`externalBin: ["binaries/tiger-intelligence-sidecar"]`).
     - Create automated distribution build script `scripts/build_desktop_app.sh` and `scripts/build_desktop_app.bat`.

---

### 🟡 P1 — Important Functional Defects & Data Integrity Requirements
*These items affect workflow completeness, data validation, or UI fidelity.*

1. **[P1-1] Server-Side Alert Lifecycle State Machine Directed Graph Enforcement**:
   - *Location*: [`tiger-intelligence/app/database/db.py:update_alert_status`](file:///Users/lol/Docs/antigravity/babbar%20sher/tiger-intelligence/app/database/db.py#L427) & [`tiger-intelligence/app/api/server.py`](file:///Users/lol/Docs/antigravity/babbar%20sher/tiger-intelligence/app/api/server.py)
   - *Root Cause*: While valid status strings are checked, legal state transition edges are not enforced server-side. For example, a closed `RESOLVED` alert could be mutated directly to `ACKNOWLEDGED` via raw API request.
   - *Fix*: Enforce strict state graph:
     - `OPEN` → `ACKNOWLEDGED`, `RESOLVED`, `FALSE_POSITIVE`, `SUPPRESSED`
     - `ACKNOWLEDGED` → `RESOLVED`, `FALSE_POSITIVE`, `SUPPRESSED`, `OPEN`
     - `RESOLVED` / `FALSE_POSITIVE` / `SUPPRESSED` → `OPEN` (explicit reopen only)
     - Reject illegal transitions with HTTP 400 and log rejection attempt.

2. **[P1-2] Elimination of Hardcoded Mock Fallback Arrays in Frontend Surfaces**:
   - *Location*: [`analytics.tsx`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src/routes/dashboard/analytics.tsx#L38), [`stations.tsx`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src/routes/dashboard/stations.tsx#L47), [`detections.tsx`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src/routes/dashboard/detections.tsx#L56), [`tigers.tsx`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src/routes/dashboard/tigers.tsx#L44), [`index.tsx`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src/routes/dashboard/index.tsx#L39)
   - *Root Cause*: Fallback dummy arrays hide real empty/error database states with fictional tiger data.
   - *Fix*: Replace all dummy fallback arrays with explicit typed loading skeletons, informative empty states ("No detections recorded in database"), and actionable API connection error banners.

3. **[P1-3] Custom Folder Path Entry & Native File Dialog for Ingestion**:
   - *Location*: [`frontend/src/routes/dashboard/ingest.tsx`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src/routes/dashboard/ingest.tsx)
   - *Root Cause*: Users must be able to type any local directory path (e.g. `C:\PenchSurveys\Camera01` or `/Volumes/EOS_DIGITAL/DCIM`) or click a native OS directory picker.
   - *Fix*: Add custom folder path input field with real-time pre-scan trigger, and integrate `@tauri-apps/plugin-dialog` / native desktop bridge for folder selection.

4. **[P1-4] Extended E2E Acceptance Test for Human Reassignment & Downstream Movement**:
   - *Location*: [`tiger-intelligence/tests/test_e2e_acceptance.py`](file:///Users/lol/Docs/antigravity/babbar%20sher/tiger-intelligence/tests/test_e2e_acceptance.py)
   - *Root Cause*: Test suite validates human confirmation, but does not explicitly assert that reassigning a detection alters `movement_records` and recalculates spatial tracks.
   - *Fix*: Add automated test asserting: AI assigns Tiger A → Officer reassigns to Tiger B → DB updates movement records → Downstream movement query for Tiger B contains the sighting.

---

### 🟢 P2 — Robustness, Performance & Polish
*Enhancements to user experience and diagnostic clarity.*

1. **[P2-1] GIS Station Inspector Telemetry Expansion**:
   - *Location*: [`frontend/src/routes/dashboard/map.tsx`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src/routes/dashboard/map.tsx#L350)
   - *Enhancement*: When clicking a camera station on the GIS map, display its recent captures list, identified tigers, and active village alerts directly in the inspector drawer.

2. **[P2-2] Native OS Data Folder Opener in System Diagnostics**:
   - *Location*: [`frontend/src/routes/dashboard/system.tsx`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src/routes/dashboard/system.tsx)
   - *Enhancement*: Add "Open AppData Folder" button invoking Tauri command `open_data_folder` to open macOS Finder / Windows Explorer at the platform data directory.

3. **[P2-3] Ingestion SSE Auto-Reconnect with Polling Fallback**:
   - *Location*: [`frontend/src/routes/dashboard/ingest.tsx`](file:///Users/lol/Docs/antigravity/babbar%20sher/frontend/src/routes/dashboard/ingest.tsx#L67)
   - *Enhancement*: If Server-Sent Events stream disconnects during large multi-thousand-image batch processing, seamlessly fall back to polling `GET /api/pipeline/runs/{run_id}` every 1000ms.

---

### ⚪ P3 — Optional Enhancements
1. **[P3-1]** Dark/Forest Night theme toggle customization.
2. **[P3-2]** CSV export for custom filtered tiger movement histories.

---

## 📋 Exact Implementation Order

1. **Step 1 (Fix P0-1 & P1-4)**: Update `apply_human_correction()` in `app/database/db.py` to atomically update `movement_records` and trigger spatial recalculation. Add E2E tests in `tests/test_e2e_acceptance.py`.
2. **Step 2 (Fix P0-2 & P0-3)**: Eliminate all external network dependencies. Bundle offline font declarations in `src/styles.css` and enforce strict local weights in `app/reid/extractor.py`.
3. **Step 3 (Fix P1-1)**: Enforce strict alert state transition graph in `app/database/db.py` and `app/api/server.py`.
4. **Step 4 (Fix P1-2 & P1-3)**: Clean up all 14 dashboard views: remove mock fallback arrays, add custom folder path input & native file picker to `ingest.tsx`, and enhance `map.tsx` station inspector.
5. **Step 5 (Fix P0-4 & P2-2)**: Configure PyInstaller spec and Tauri sidecar binary packaging scripts for macOS and Windows.
6. **Step 6 (Verification)**: Run full test suite (`python3 -m unittest discover -s tests -v`, `test_e2e_acceptance.py`), compile frontend bundle (`npm run build`), and verify in browser subagent.
