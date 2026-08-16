# 🐅 Pench Tiger Reserve — Movement Intelligence & Camera Trap Triage System

An offline-first, production-grade automated camera trap triage and individual tiger movement intelligence system for Pench Tiger Reserve.

---

## 🌟 System Architecture

```
RAW SD CARD (Messy Folders, DCIM, 100MEDIA)
    │
    ▼
[1] Ingestion & Data Quality Layer (`app/ingestion/`)
    ├── Recursive file discovery & normalization (`scanner.py`)
    ├── Parallel corruption integrity check (PIL + OpenCV triple layer, 116+ img/s) (`validator.py`)
    └── EXIF parsing, clock drift & sequence reversal detection (`metadata.py`)
    │
    ▼
[2] Subject Detection Layer (`app/detection/detector.py`)
    ├── MegaDetector camera trap standard (Animals, Humans, Vehicles, Blanks)
    └── Conservative reversible blank quarantine (`data/quarantine/blanks/`)
    │
    ▼
[3] Privacy Protection Layer (`app/privacy/protector.py`)
    ├── Automatic Gaussian blur on human facial & body regions
    └── Unmasked originals isolated to restricted access directory (`data/quarantine/human_review/`)
    │
    ▼
[4] Species Classification & Localization Layer (`app/species/classifier.py`)
    └── Smart Ensemble (YOLOv8 + low-light EnlightenGAN) separating Tigers vs. Non-target fauna
    │
    ▼
[5] Individual Tiger Re-Identification Layer (`app/reid/`)
    ├── Flank ROI crop & lateral orientation estimator (`flank_crop.py`)
    ├── Deep 768-dimensional L2-normalized stripe visual metric embedding (`extractor.py`)
    └── Nearest-neighbor catalogue matcher with multi-factor confidence (`matcher.py`):
        Confidence = 0.50*sim + 0.20*flank_vis + 0.15*img_qual + 0.15*temp_cons
    │
    ▼
[6] Territory & Movement Intelligence Layer (`app/occupancy/mcp.py`)
    ├── 100% Minimum Convex Polygon (MCP) boundary & area calculation (km²)
    └── Territory centroid tracking across survey cycles
    │
    ▼
[7] Explainable Alert Engine (`app/alerts/engine.py`)
    ├── Territory Centroid Shift (>4.0 km displacement warnings)
    ├── Survey-Effort Corrected Range Expansion (suppresses new deployment artifacts)
    ├── Village Buffer Proximity (<2.5 km conflict risk)
    └── Prolonged Absence Anomaly (>3× historical baseline interval)
    │
    ▼
[8] Forest Officer Web Dashboard (`app/ui/dashboard.py`)
    └── Streamlit + Folium + Plotly interactive UI (Map, Tiger Profiles, Review Queue, Audit Logs)
```

---

## 📂 Project Structure

```
.
├── tiger-intelligence/         # Main Production System
│   ├── app/
│   │   ├── ingestion/          # Recursive SD scanner, validator, metadata quality
│   │   ├── detection/          # MegaDetector camera trap subject detector
│   │   ├── species/            # Species classification & tiger localization
│   │   ├── reid/               # Flank cropping, stripe embeddings & Re-ID matcher
│   │   ├── privacy/            # Human privacy blur & quarantine
│   │   ├── occupancy/          # Minimum Convex Polygon (MCP) home range & centroid
│   │   ├── alerts/             # Explainable alert engine with survey effort correction
│   │   ├── database/           # SQLite database schema & ORM layer
│   │   ├── ui/                 # Forest Officer Streamlit Web Dashboard
│   │   └── pipeline.py         # Master offline pipeline CLI
│   ├── models/                 # Offline model weights (YOLOv8, EnlightenGAN)
│   ├── data/                   # Raw, working, and quarantined camera trap files
│   ├── database/               # SQLite database (tiger.db)
│   ├── evaluation/             # Quantitative Re-ID benchmark suite
│   ├── tests/                  # Automated unit and integration test suite
│   ├── requirements.txt
│   └── README.md
└── yolo/                       # Exploration & model triage utilities
```

---

## 🚀 Quickstart

### 1. Install Dependencies
```bash
pip install -r tiger-intelligence/requirements.txt
```

### 2. Ingest & Process Camera Trap SD Card
```bash
cd tiger-intelligence
python app/pipeline.py --input data/raw --db database/tiger.db
```

### 3. Launch the Web Dashboard
```bash
cd tiger-intelligence
streamlit run app/ui/dashboard.py
```

### 4. Run Quantitative Evaluation Benchmark
```bash
cd tiger-intelligence
python evaluation/evaluate_reid.py
```

### 5. Run Unit & Integration Tests
```bash
cd tiger-intelligence
python tests/test_pipeline.py
```
