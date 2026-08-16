"""
evaluate_reid.py — Quantitative Evaluation Benchmark for Tiger Re-ID
Pench Tiger Reserve Camera Trap Intelligence System

Evaluates:
  1. Rank-1 Accuracy
  2. Top-3 Accuracy
  3. Unknown Individual Detection Rate
  4. False Match Rate
  5. Human Review Rate
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

# Add tiger-intelligence to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.reid.extractor import TigerStripeFeatureExtractor
from app.reid.matcher import TigerReIDMatcher


def run_reid_benchmark(
    known_individuals: Dict[str, List[str]],   # { 'T-001': [crop1, crop2], 'T-002': [crop1] }
    query_set: List[Tuple[str, str]],          # [ (crop_path, ground_truth_id), ... ]
    high_threshold: float = 0.85,
    review_threshold: float = 0.65,
) -> Dict:
    """
    Run formal closed/open-set Re-ID evaluation.
    """
    extractor = TigerStripeFeatureExtractor()
    matcher = TigerReIDMatcher(
        high_confidence_threshold=high_threshold,
        review_threshold=review_threshold,
    )

    # 1. Build Reference Catalogue from known individuals gallery
    reference_catalog: List[Tuple[str, np.ndarray, str]] = []
    for tid, crop_paths in known_individuals.items():
        for p in crop_paths:
            emb = extractor.extract_embedding(p)
            reference_catalog.append((tid, emb, "both"))

    total_queries = len(query_set)
    if total_queries == 0:
        return {"error": "empty query set"}

    correct_rank1 = 0
    correct_top3 = 0
    correct_unknown_rejections = 0
    false_matches = 0
    human_reviews = 0
    total_known_queries = 0
    total_unknown_queries = 0

    print("\n" + "=" * 70)
    print("  RUNNING TIGER RE-ID BENCHMARK EVALUATION")
    print("=" * 70)

    for query_path, true_id in query_set:
        query_emb = extractor.extract_embedding(query_path)
        match_res = matcher.match(
            query_embedding=query_emb,
            reference_catalog=reference_catalog,
            flank_orientation="left_flank",
        )

        is_true_unknown = (true_id is None or true_id.startswith("UNKNOWN") or true_id not in known_individuals)
        if is_true_unknown:
            total_unknown_queries += 1
        else:
            total_known_queries += 1

        top_candidates = [c[0] for c in match_res.ranked_candidates]
        pred_id = match_res.matched_tiger_id

        # Check Human Review
        if match_res.confidence_level == "MEDIUM_REVIEW_REQUIRED":
            human_reviews += 1

        if is_true_unknown:
            if match_res.is_new_individual:
                correct_unknown_rejections += 1
            else:
                false_matches += 1
        else:
            # Known tiger query
            if pred_id == true_id:
                correct_rank1 += 1
            if true_id in top_candidates[:3]:
                correct_top3 += 1
            if match_res.is_new_individual:
                # Failed to match known tiger -> false unknown
                pass

        status_icon = "✓" if (pred_id == true_id if not is_true_unknown else match_res.is_new_individual) else "✗"
        print(f"  {status_icon} Query: {Path(query_path).name:<35} | True: {str(true_id):<10} | Pred: {str(pred_id):<10} | Conf: {match_res.confidence_level:<22} | Sim: {match_res.similarity_score:.1%}")

    rank1_acc = (correct_rank1 / total_known_queries) if total_known_queries > 0 else 1.0
    top3_acc = (correct_top3 / total_known_queries) if total_known_queries > 0 else 1.0
    unknown_det_rate = (correct_unknown_rejections / total_unknown_queries) if total_unknown_queries > 0 else 1.0
    false_match_rate = (false_matches / total_unknown_queries) if total_unknown_queries > 0 else 0.0
    review_rate = human_reviews / total_queries

    report = {
        "total_queries": total_queries,
        "known_queries": total_known_queries,
        "unknown_queries": total_unknown_queries,
        "rank1_accuracy": round(rank1_acc * 100, 2),
        "top3_accuracy": round(top3_acc * 100, 2),
        "unknown_detection_rate": round(unknown_det_rate * 100, 2),
        "false_match_rate": round(false_match_rate * 100, 2),
        "human_review_rate": round(review_rate * 100, 2),
    }

    print("\n" + "=" * 70)
    print("  EVALUATION METRICS SUMMARY")
    print("=" * 70)
    print(f"  Rank-1 Accuracy             : {report['rank1_accuracy']}%")
    print(f"  Top-3 Accuracy              : {report['top3_accuracy']}%")
    print(f"  Unknown Individual Det Rate : {report['unknown_detection_rate']}%")
    print(f"  False Match Rate            : {report['false_match_rate']}%")
    print(f"  Human Review Routing Rate   : {report['human_review_rate']}%")
    print("=" * 70 + "\n")

    return report


if __name__ == "__main__":
    # Test on extracted crops
    crops_dir = Path("tiger-intelligence/data/processed/crops")
    if crops_dir.exists():
        crop_files = sorted(list(crops_dir.glob("*.jpg")))
        if len(crop_files) >= 2:
            # Gallery: First 3 crops
            gallery = {f"T-00{i+1}": [str(crop_files[i])] for i in range(min(3, len(crop_files)))}
            # Query set: Gallery crops + remaining as unknown
            queries = []
            for i, p in enumerate(crop_files):
                if i < 3:
                    queries.append((str(p), f"T-00{i+1}"))
                else:
                    queries.append((str(p), "UNKNOWN_NEW"))

            run_reid_benchmark(gallery, queries)
        else:
            print("Need at least 2 crops to run benchmark.")
    else:
        print("Crops directory not found. Run pipeline.py first.")
