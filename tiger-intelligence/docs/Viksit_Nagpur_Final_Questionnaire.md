# Viksit Nagpur Hackathon 2026 — Final Questionnaire Answers & Technical Defense

**Project Name:** Pench Tiger Reserve — Automated Movement Intelligence & Camera Trap Triage System  
**Team Leader / ML Lead:** Lakshya Gupta  
**Repository:** https://github.com/LakshyaKGupta/pench-tiger-intelligence  

---

## 1. Dataset & Input

### 1. Do we already have a camera-trap dataset?
**Yes.**  
We currently use:
* **ATRW (Amur Tiger Re-identification in the Wild)** for individual tiger Re-ID evaluation.
* **TheWilds Camera Traps** (`imageomics/thewilds_cameratraps`) for real camera-trap detector/triage evaluation (vegetation sway, rain, night IR, human patrols).
* Additional real wildlife samples (sloth bear, forest bird).
* A locally generated messy SD-card dataset for end-to-end pipeline and data-integrity testing.

### 2. Approximately how many images do we have?
For the current benchmark evaluation:
* **100-Image Mixed Real-World Benchmark**:
  * 45 TheWilds camera-trap frames (41 real blanks, 4 ranger patrols).
  * 53 ATRW tiger frames across various postures/occlusions.
  * 2 additional real wildlife samples (sloth bear, forest bird).
* **ATRW Held-Out Re-ID Evaluation**:
  * 40 gallery reference images (10 known individuals × 4 references).
  * 40 held-out known query images (same 10 individuals, distinct encounter photographs).
  * 20 held-out unknown query images (5 unseen individuals completely absent from gallery).
  * 100 evaluation images total (zero SHA-256 hash overlap).

*The full external datasets are larger and are not being represented as part of our committed Pench dataset.*

### 3. Are the images from Pench Tiger Reserve?
**Mixed.**  
The current benchmark is not exclusively Pench. We use established external research datasets (ATRW, TheWilds) for rigorous model evaluation, combined with Pench-calibrated coordinate grids, zone boundaries, and simulated SD-card directory structures. We explicitly disclose this to judges.

### 4. Do the images contain species labels?
**Yes**, for the curated benchmark. Labels include: `tiger`, `sloth bear`, `bird`, `human`, `vehicle`, and `blank`.

### 5. Do we have individual-tiger labels?
**Yes.** ATRW provides individual tiger identities, which we map into internal gallery IDs (`T-001`, `T-002`, etc.). Our Pench application uses identifiers such as `T-PENCH-001`. These are application IDs, not official NTCA identifiers.

### 6. Do images contain station IDs, timestamps, and GPS?
The pipeline supports them and the end-to-end test dataset contains them. However, external ATRW images should not be represented as having verified Pench station/GPS metadata.

### 7. Do we have a reference/gallery set?
**Yes.** Current Re-ID benchmark: 10 known individuals with 4 gallery references per individual (40 gallery reference images total).

### 8. What dataset can we legally use?
Use only datasets whose licensing/terms permit hackathon and academic research use:
* **ATRW**: Use according to academic terms.
* **TheWilds**: Use according to its open-access terms.
* Do not redistribute restricted raw datasets.
* Attribute external datasets transparently.
* Do not misrepresent external images as native Pench imagery.

---

## 2. Blank / Animal Detection

### 9. Which model?
**MegaDetector V6** (`MDV6-yolov9-c` / `MegaDetectorV6MIT`) as our primary detector, with **YOLOv8n** retained as our high-throughput comparison baseline. MegaDetector provides camera-trap-oriented detection of animals, persons, and vehicles.

### 10. Can it run offline on a normal CPU laptop?
**Yes.** The implementation supports pure CPU as well as Apple Silicon MPS. No inference-time internet connectivity is required.

### 11. What benchmark can we cite?
Our 100-image mixed real-world benchmark:

| Metric | MegaDetector V6 (MPS Metal) | MegaDetector V6 (Zenodo CPU) | YOLOv8n (CPU Baseline) |
|---|---|---|---|
| **Animal Auto-Kept ($\ge 0.15$)** | 80.0% (44/55) | 80.0% (44/55) | 80.0% (44/55) |
| **Animal Safe Preservation** | 87.27% (48/55) | 87.27% (48/55) | **92.73%** (51/55) |
| **Critical False Negative Rate** | 12.73% (7/55) | 12.73% (7/55) | **7.27%** (4/55) |
| **Blank Quarantine Precision** | **80.49%** (33/41) | **80.49%** (33/41) | 73.17% (30/41) |
| **Throughput** | **8.88 img/s** | 3.79 img/s | 5.65 img/s |

*These are our empirical benchmark measurements, not a universal model accuracy claim.*

### 12. How are blanks quarantined?
Using our 3-tier Triage Policy:
* `KEEP` ($\text{conf} \ge 0.15$): Proceed to species classifier & Re-ID.
* `REVIEW` ($0.08 \le \text{conf} < 0.15$): Staged safely for human review; never deleted.
* `QUARANTINE` ($\text{conf} < 0.08$ with 0 subjects): Reversibly quarantined in `data/quarantine/blanks/`.

A `quarantine_manifest.csv` records file name, original path, station ID, reason code, SHA-256 hash, and timestamp.  
**Core Invariant:** *Uncertainty never causes deletion.*

### 13. How will we measure false negatives?
Using labelled wildlife images:
$$\text{FNR} = \frac{\text{Missed Wildlife}}{\text{Total Wildlife}}$$
We track direct animal recall, safe-preservation rate, and critical false negatives by difficulty tier.

---

## 3. Individual Tiger Identification

### 14. Do we have a Re-ID model?
**Yes.** The system uses **`BVRA/MegaDescriptor-T-224`** (768-dimensional wildlife metric foundation embeddings).

### 15. How do we isolate the flank?
Current pipeline:
$$\text{Full Image} \rightarrow \text{Detector Bounding Box} \rightarrow \text{Torso Crop (head } \sim 20\% \text{ and leg } \sim 15\% \text{ exclusion)} \rightarrow \text{MegaDescriptor Embedding}$$
A dedicated, scientifically validated flank-segmentation model is not currently implemented; our deterministic torso ROI serves this role.

### 16. How are stripe patterns represented?
Through deep visual embeddings generated by MegaDescriptor. Normalized 768-D vectors capture visual identity information including coat, stripe morphology, and texture characteristics.

### 17. Matching method?
**Cosine similarity against a multi-reference gallery.** Each tiger profile stores multiple reference embeddings from distinct encounters.

### 18. Automatic-match threshold?
* $\ge 0.65 \rightarrow$ **Confident Match**
* $0.45 – 0.65 \rightarrow$ **Human Review Queue**
* $< 0.45 \rightarrow$ **Unknown / New Tiger Candidate**

Observed ATRW benchmark metrics:
* Lowest same-tiger similarity: **0.780**
* Highest different-tiger similarity: **0.317**
* Empirical separation margin: **+0.463**  
*Important: 0.65 cosine similarity represents metric distance, not a 65% calibrated probability of correctness.*

### 19. What if two tigers have similar scores?
Do not force a match. Route to **Ambiguous / Human Review Queue**. The reviewer sees competing profiles and supporting photographs side-by-side.

### 20. How is a new tiger enrolled?
Candidate creation requires:
1. Torso crop resolution $\ge 128 \times 128$ px.
2. Detector confidence $\ge 0.50$.
3. Maximum gallery similarity $< 0.45$.
4. Cryptographic provenance logged in `audit.log`.

*Described as candidate generation followed by human officer confirmation, not automatic biological truth.*

### 21. What does the human-review screen show?
Query photo, bounding box crop, candidate IDs, similarity scores, reference images, detector confidence, timestamp, station ID, GPS, historical sightings, and one-click actions (`Confirm Match`, `Reject Match`, `Assign Different Tiger`, `Create New Candidate`).

---

## 4. Database & Data Flow

### 22. Offline database?
**SQLite** (`tiger.db`). Lightweight, zero-config, transactional, and fully offline.

### 23. Tiger record fields?
`tiger_id`, `species`, `status`, `sex`, `first_seen`, `last_seen`, `total_sightings`, `current_centroid_lat`, `current_centroid_lon`, `home_range_area_km2`, `review_status`, `created_at`, `updated_at`.

### 24. How do we link tiger → image → station → time → GPS?
Each sighting record stores:
`detection_id`, `image_id`, `image_hash`, `station_id`, `timestamp`, `latitude`, `longitude`, `species_confidence`, `reid_matched_tiger_id`, `reid_similarity`, `reid_confidence_level`, `reid_evidence_breakdown`.

### 25. How do human corrections update the database?
The final decision is updated while retaining the original AI prediction in the audit log. The audit trail remains cryptographically intact.

### 26. Duplicate / mixed SD cards?
Handled via SHA-256 hashing, recursive directory scanning, EXIF timestamp normalization, and SQLite idempotency (`ON CONFLICT DO UPDATE`).

---

## 5. Mapping & Movement Intelligence

### 27. How do we calculate tiger locations?
Every validated sighting provides: $\text{Tiger ID} + \text{Latitude} + \text{Longitude} + \text{Timestamp}$. These form the tiger's spatial trajectory.

### 28. Home-range method?
Current prototype uses **Minimum Convex Polygon (MCP)** / convex hull estimation. Suitable for prototype territory summaries; not represented as a complex ecological kernel density estimator.

### 29. Activity centroid and occupied area?
* **Centroid:** Mean center of valid GPS sightings ($(\bar{\text{lat}}, \bar{\text{lon}})$).
* **Occupied Area:** MCP polygon area computed in $\text{km}^2$ via geodesic coordinates.

### 30. Mapping technology?
Outputs standard **GeoJSON FeatureCollection** (`occupancy.geojson`) containing station points, tiger home range centroids, and movement trajectories. Visualized via Folium / Leaflet in the Streamlit UI.

### 31. How do we detect meaningful range shifts?
Compare new sightings against historical centroid:
$$\text{New Sighting} \rightarrow \text{Haversine Distance to Centroid} \rightarrow \text{Survey-Effort Check} \rightarrow \text{Threshold } (\ge 4.0\text{ km}) \rightarrow \text{Territory Shift Alert}$$
*(Demonstrated in Task C4 with 7.4 km displacement scenario).*

### 32. First capture at unused station?
The system checks station deployment history (`active_from`). If active $<30$ days, movement alarm is suppressed with an audit log explanation.

### 33. Movement toward village / buffer?
Calculates distance to predefined village settlement boundaries ($\le 2.5\text{ km}$) and buffer/corridor zones ($\le 2.0\text{ km}$). Demonstrated in Task C4 (1.9 km from village $\rightarrow$ Critical Alert).

### 34. Prolonged absence?
Compares current timestamp against `last_seen_timestamp`. Absence exceeding $3\times$ historical baseline flags an absence anomaly.

### 35. Newly installed cameras / uneven survey effort?
Tracked via station metadata. Demonstrated in Task C4 where station `STN06` was identified as newly activated, suppressing false range-expansion alarms.

---

## 6. Alerts & Human-in-the-Loop

### 36. What should an alert contain?
`alert_id`, `tiger_id`, `severity` (`CRITICAL`, `WARNING`, `INFO`), `station_id`, `timestamp`, `title`, `explanation`, `evidence_data` (distance, threshold, coordinates, zone), and `review_status`.

### 37. Confidence required?
Re-ID similarity $\ge 0.65$, valid station coordinates, verified timestamp, and sufficient baseline survey effort.

### 38. High-priority events?
1. Tiger detected near village boundary ($\le 2.5\text{ km}$).
2. Significant territory centroid shift ($\ge 4.0\text{ km}$).
3. Range expansion into non-core corridor.

### 39. Can an officer confirm/reject/correct?
**Yes.** Officers can confirm, reject, or reassign any alert or Re-ID decision directly in the web UI.

### 40. Can decisions be traced to images?
**Yes.** Traceable via:
$$\text{Alert} \rightarrow \text{Sighting} \rightarrow \text{Tiger ID} \rightarrow \text{Re-ID Score} \rightarrow \text{Bounding Box} \rightarrow \text{Original Image} \rightarrow \text{SHA-256 Hash} \rightarrow \text{Audit Log}$$

---

## 7. Offline & Hardware

### 41. Exact competition laptop?
**Don’t know yet.** Tested and verified on Apple Silicon Mac (M-series with MPS Metal acceleration) and pure CPU.

### 42. Complete pipeline without internet?
**Yes.** All weights (`MDV6`, `MegaDescriptor-T-224`, `YOLOv8n`) and dependencies run 100% offline.

### 43. Biggest processing bottlenecks?
1. Detector inference (MegaDetector / YOLO).
2. Re-ID embedding extraction.
3. Multi-reference gallery cosine similarity search.
4. Image disk I/O and EXIF parsing.

### 44. How many images during demo?
Measured detector throughput:
* MDV6 MPS: **8.88 img/s** (~533 images/min).
* MDV6 CPU: **3.79 img/s** (~227 images/min).
* YOLOv8n CPU: **5.65 img/s** (~339 images/min).

### 45. CPU optimization?
* Load model weights once during initialization.
* Tensor reuse and batch inference.
* Run Re-ID only on confirmed animal/tiger bounding boxes.
* Decoupled 3-tier triage to skip full Re-ID on true blanks.

---

## 8. Privacy & Reliability

### 46. Human images?
Humans are explicitly not blanks. Detected persons trigger automatic Gaussian privacy blur on faces/bodies; raw unmasked images are moved to restricted quarantine.

### 47. Camera-clock drift?
The system preserves both the original EXIF timestamp and corrected sequence timestamp with audit logging. Never overwrites original evidence destructively.

### 48. Inconsistent folders / mixed SD cards?
Recursive discovery scans arbitrary directory trees (`DCIM/`, `100MEDIA/`, `card_backup/`) and skips non-image files.

### 49. Dark / blurry / partial tiger?
Preserved via the `REVIEW` triage tier ($0.08 \le \text{conf} < 0.15$). Uncertainty never maps to deletion.

### 50. Biggest failure cases?
Severe occlusion, extreme motion blur, night IR washout, partial-body edge crops, visual ambiguity between close relatives, and newly installed cameras lacking baseline survey effort.

---

## 9. Existing Solutions & Research Gap

### 51. Existing blank-image filtering?
MegaDetector, Wildlife Insights. Blank filtering itself is established technology.

### 52. Existing species identification?
Wildlife Insights, Snapshot Safari classifiers.

### 53. Existing individual-animal systems?
Wildbook, HotSpotter, Flukebook.

### 54. Existing tiger stripe-pattern identification?
ExtractCompare (NTCA standard in India). *We do NOT claim to have invented tiger stripe Re-ID.*

### 55. What does Wildlife Insights provide?
Cloud-based image ingestion, species classification, blank filtering, and spatial mapping. Requires cloud connectivity.

### 56. What does MegaDetector provide?
Animal/person/vehicle bounding box detection and confidence scoring for camera traps.

### 57. What does Wildbook provide?
Individual animal profiles, multi-species Re-ID algorithms, and encounter management.

### 58. What does NTCA / ExtractCompare provide?
Standardized tiger stripe matching, individual capture histories, and population monitoring for national tiger censuses.

### 59. What capability is missing when these are combined?
**The Defensible Gap:** A unified, offline-first field workflow connecting messy SD-card ingestion $\rightarrow$ evidence-preserving triage $\rightarrow$ individual Re-ID $\rightarrow$ survey-effort-corrected movement intelligence $\rightarrow$ explainable conflict alerts.

### 60. What is our defensible innovation?
**Offline Evidence-to-Action Wildlife Intelligence.**
1. 100% offline edge execution on field laptops.
2. Evidence-preserving triage (uncertainty never deletes data).
3. Multi-reference foundation Re-ID (`MegaDescriptor-T-224`).
4. Survey-effort-aware movement intelligence (suppresses false alarms from new cameras).
5. Cryptographic provenance and explainable audit logging.

---

## 10. Competition & Winning Strategy

### 61. What will the 3-minute demo prove?
One complete, auditable chain:
$$\text{Messy SD Card} \rightarrow \text{Integrity \& Triage} \rightarrow \text{Privacy Masking} \rightarrow \text{Tiger Re-ID} \rightarrow \text{Movement Intelligence} \rightarrow \text{Village Conflict Alert} \rightarrow \text{Officer Verification}$$

### 62. Strongest differentiator?
Movement intelligence connected to auditable visual evidence—not merely detecting a tiger, but identifying the specific individual, analyzing its spatial deviation, and providing explainable ranger guidance.

### 63. Strongest reason a forest officer would use it?
Drastic reduction in manual review workload (filtering 80–90% of empty frames) while immediately flagging genuine conflict risks before animals reach village boundaries.

### 64. Judge question most likely to expose weakness?
1. *"Where is your Pench-labelled test dataset?"* $\rightarrow$ Transparently acknowledge benchmark composition (45 TheWilds, 53 ATRW, 2 real wildlife).
2. *"Why should I trust your 100% Re-ID result?"* $\rightarrow$ Clarify that 100% is on the held-out ATRW evaluation subset with multi-reference galleries, not a claim of universal real-world perfection.
3. *"How does this compare with ExtractCompare?"* $\rightarrow$ Position as an automated offline pre-screener and real-time movement alert system, not a replacement for official NTCA census tools.

### 65. What can we reliably demonstrate?
* Full offline pipeline execution.
* MegaDetector + YOLOv8 triage.
* MegaDescriptor Re-ID matching.
* SQLite data layer & GeoJSON generation.
* Survey-effort-aware alert engine.
* 6 structured deliverable exports.
* Interactive Streamlit dashboard.

### 66. What should we avoid claiming?
* Do NOT claim 100% real-world tiger identification.
* Do NOT claim official NTCA integration or replacement of forest officers.
* Do NOT claim 0.65 cosine similarity equals 65% probability.
* Do NOT claim to have invented tiger stripe identification.

### 67. What measurable numbers can we show?
* **Re-ID (ATRW)**: 100% Rank-1, 100% unknown rejection, $+0.463$ separation margin across 60 held-out query comparisons.
* **Triage (100-image real benchmark)**: 8.88 img/s on MPS, 80.49% blank quarantine precision, 92.73% safe animal preservation.
* **Engineering**: 9/9 unit tests passing, full messy SD-card evaluation, 6 structured deliverables.

### 68. Fallback if live demo fails?
1. Live full pipeline on `data/test_messy_sdcard`.
2. Preloaded verified dataset with live inference.
3. Precomputed benchmark results in interactive Streamlit dashboard.
4. Static architecture diagram and verifiable audit logs.

---

## 11. Team Capability & Execution

### 69. ML / Model Responsibility?
**Lakshya Gupta** (MegaDetector, MegaDescriptor Re-ID, triage engine, model benchmarking, threshold calibration).

### 70. Backend / Database Responsibility?
**Don’t know** *(Assigned within team prior to final submission)*.

### 71. Frontend / Dashboard Responsibility?
**Don’t know** *(Streamlit UI implementation complete)*.

### 72. GIS / Mapping Responsibility?
**Don’t know** *(GeoJSON & Folium spatial mapping complete)*.

### 73. Research / Validation Responsibility?
**Don’t know** *(ATRW benchmark, real camera-trap benchmark, and leakage assertions complete)*.

### 74. PPT / Pitching Responsibility?
**Team Leader: Lakshya Gupta**.

### 75. What components are already working?
* Offline MegaDetector V6 & YOLOv8n inference.
* MegaDescriptor-T-224 embedding extraction & multi-reference gallery matching.
* 3-tier evidence-preserving triage (`KEEP`, `REVIEW`, `QUARANTINE`).
* SQLite database with transactional idempotency.
* Survey-effort-aware movement intelligence & explainable alert engine.
* 6 structured deliverables export (`results.json`, `detections.csv`, `quarantine_manifest.csv`, `occupancy.geojson`, `alerts.json`, `audit.log`).
* Interactive Streamlit web dashboard.
* 9/9 automated unit & integration tests.

### 76. What is still only an idea?
Large-scale native Pench camera trap census data, official NTCA ExtractCompare data interchange, complex kernel density home-range estimation, and calibrated probabilistic confidence mapping.

### 77. How much development time do we have?
**Don’t know** *(Governed by hackathon presentation schedule)*.

### 78. What can realistically be finished / tested?
* **High Confidence:** Complete offline pipeline demo, messy SD-card ingestion, Re-ID matching, GIS map visualization, explainable alerts, and audit logging.
* **Do Not Promise Without Field Data:** Nationwide deployment, official census replacement, or predictive ecological behavioral modeling.
