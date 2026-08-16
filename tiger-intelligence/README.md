# 🐅 Pench Tiger Reserve — Automated Movement Intelligence & Camera Trap Triage System

An offline-first, production-grade intelligence pipeline designed for field forest officers and researchers at Pench Tiger Reserve.

Turns raw, messy SD card camera trap dumps into an auditable, individual-tiger spatial movement database with explainable ecological alerts.

---

## 🌟 Key Capabilities

1. **Messy SD-Card Ingestion & Data Quality**:
   - Recursively discovers media in unorganized camera folder hierarchies (`DCIM/`, `100MEDIA/`, `Camera_17/`).
   - Triple-layer parallel corruption validation (100+ frames/sec).
   - EXIF metadata parsing with clock drift, sequence reversal, and missing GPS detection.

2. **Conservative Reversible Triage**:
   - MegaDetector camera trap standard filters true blanks (grass, rain, heat shimmer).
   - True blanks are staged safely in `data/quarantine/blanks/` (never hard-deleted).

3. **Privacy Safeguards**:
   - Automatically detects humans (`person` class).
   - Applies Gaussian privacy blur to facial/body bounding boxes.
   - Quarantines unmasked originals to restricted access directories.

4. **Species Classification & Tiger Localization**:
   - High-throughput smart ensemble (`YOLOv8` + low-light `EnlightenGAN`) separates tigers from non-target wildlife (sloth bears, leopards, dholes, deer).

5. **Individual Tiger Re-Identification (Flank Stripe Re-ID)**:
   - Flank ROI extraction with lateral orientation estimation (`left_flank` vs `right_flank`).
   - Deep 768-dimensional L2-normalized stripe visual metric embeddings.
   - Multi-factor explainable confidence scoring:
     $$\text{Confidence} = 0.50 \times \text{sim} + 0.20 \times \text{flank\_vis} + 0.15 \times \text{img\_quality} + 0.15 \times \text{temporal\_consistency}$$
   - Routes high-confidence matches to known tiger profiles, isolates ambiguous matches (65%–85%) to human review queue, and registers new individual profiles.

6. **Home Range Occupancy & Trajectory Intelligence**:
   - Computes Minimum Convex Polygon (MCP) territory boundaries and surface area in $\text{km}^2$.
   - Tracks territory centroids over survey cycles.

7. **Explainable Alert Engine (with Survey-Effort Correction)**:
   - **Range Centroid Displacement**: Warns when resident tiger shifts >4.0 km from territory center.
   - **Survey-Effort Corrected Expansion**: Distinguishes genuine tiger range expansion from new camera deployment artifacts.
   - **Village Boundary Conflict Risk**: Flags individuals within 2.5 km of human settlements.
   - **Prolonged Absence**: Anomaly alert when tiger detection interval exceeds $3\times$ historical baseline.

8. **Offline Forest Officer Web UI**:
   - Streamlit + Folium + Plotly dashboard with interactive maps, tiger catalog, review queue, and audit trails.

---

## 🚀 Quickstart

### 1. Run the Complete Local Pipeline
```bash
cd tiger-intelligence

# Ingest and process a raw camera trap SD card folder
python3 app/pipeline.py --input data/raw --db database/tiger.db
```

### 2. Launch the Forest Officer Web Dashboard
```bash
streamlit run app/ui/dashboard.py
```

### 3. Run the Re-ID Quantitative Evaluation Benchmark
```bash
python3 evaluation/evaluate_reid.py
```

### 4. Run the Test Suite
```bash
python3 tests/test_pipeline.py
```
