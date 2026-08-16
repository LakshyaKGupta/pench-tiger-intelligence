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

5. **Individual Tiger Re-Identification (MegaDescriptor-T-224 Foundation)**:
   - Deterministic torso ROI dual-candidate generation (head ~20% and leg ~15% exclusion).
   - Foundation animal metric embeddings via `BVRA/MegaDescriptor-T-224` (768-dim L2-normalized).
   - Multi-reference individual galleries storing multi-encounter sightings per tiger.
   - Evidence-based decision routing with configurable thresholds:
     - $\text{Similarity} \ge 65\% \rightarrow$ **Automatic High-Confidence Match**
     - $45\% \le \text{Similarity} < 65\% \rightarrow$ **Human Review Queue**
     - $\text{Similarity} < 45\% \rightarrow$ **New Individual Profile Candidate**

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

## 🔬 Benchmark Methodology & Evaluation

We strictly distinguish between **fast development unit tests** and **rigorous held-out scientific evaluations**:

### 1. Held-Out Re-ID Benchmark (`evaluation/evaluate_reid.py`)
- **Dataset**: Amur Tiger Re-identification in the Wild (ATRW) benchmark.
- **Leakage Prevention**: Evaluator strictly asserts that gallery and query sets are **physically distinct files with zero SHA256 hash collisions**.
- **Ground Truth**: Stored in independent metadata (`ground_truth.json`), never inferred from filenames.
- **Evaluation Split**:
  - **10 Gallery Individuals** (40 reference images)
  - **40 Held-Out Known Queries** (distinct encounters from the same 10 individuals)
  - **20 Held-Out Unknown Queries** (5 unseen tiger individuals completely absent from gallery)

#### Empirical Held-Out Performance Metrics:
| Metric | Result | Benchmark Definition |
|---|---|---|
| **Rank-1 Accuracy** | **100.0%** | Held-out known query correctly matches true tiger ID at top rank |
| **Rank-3 Accuracy** | **100.0%** | True tiger ID is within top-3 candidates |
| **Unknown Rejection Rate** | **100.0%** | Unseen individual query correctly rejected as `NEW_TIGER` |
| **False Match Rate** | **0.0%** | Rate of assigning an unseen tiger to an existing profile |
| **Same-Individual Similarity** | **0.780 – 0.989** (Mean: **0.930**) | Cosine similarity across different encounters of same tiger |
| **Different-Individual Similarity** | **-0.104 – 0.313** (Mean: **0.111**) | Cosine similarity between different tiger individuals |
| **Empirical Separation Margin** | **+0.463** | Gap between lowest true match (0.780) and highest non-match (0.317) |

### 2. Subject Detector Benchmark (`evaluation/benchmark_detector/evaluate_detector.py`)
Evaluates camera-trap triage performance across 97 manually curated & labelled images (37 animal captures, 40 empty/swaying foliage blanks, 12 field patrol humans, 8 patrol vehicles):

| Metric | YOLOv8n (CPU) | YOLOv8n (Apple Silicon MPS) | MegaDetector V6 (CPU) | MegaDetector V6 (MPS) |
|---|---|---|---|---|
| **Animal Recall** | 91.89% (34/37) | 91.89% (34/37) | 83.78% (31/37) | 83.78% (31/37) |
| **Blank Precision** | **100.0%** | **100.0%** | 72.5% | 72.5% |
| **Critical False Negatives** | **3** | **3** | 6 | 6 |
| **Throughput (img/s)** | 7.43 img/s | **22.29 img/s** | 3.46 img/s | 6.56 img/s |
| **Offline Execution** | ✅ 100% Offline | ✅ 100% Offline | ✅ 100% Offline | ✅ 100% Offline |

---

## 🚀 Quickstart

### 1. Run the Held-Out Scientific Benchmark
```bash
python3 evaluation/evaluate_reid.py
```

### 2. Run the Automated Unit & Integration Tests
```bash
python3 -m unittest discover -s tests -v
```

### 3. Run the Complete Local Pipeline on Camera Trap Dumps
```bash
python3 app/pipeline.py --input data/raw --db database/tiger.db
```

### 4. Launch the Forest Officer Web Dashboard
```bash
streamlit run app/ui/dashboard.py
```
