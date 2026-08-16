"""
evaluate_reid.py — Quantitative Evaluation Benchmark for Tiger Re-ID
Pench Tiger Reserve Camera Trap Intelligence System

Evaluates:
  1. Rank-1 Accuracy (Known Individuals)
  2. Rank-3 Accuracy (Known Individuals)
  3. Unknown Individual Detection Rate (Open-Set Rejection)
  4. False Match Rate (Critical Failure Mode)
  5. Human Review Routing Rate
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np

# Add tiger-intelligence to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.reid.extractor import DEFAULT_REID_MODEL, TigerStripeFeatureExtractor
from app.reid.matcher import TigerReIDMatcher


def run_reid_benchmark(
    known_individuals: Dict[str, List[Union[str, np.ndarray]]],   # { 'T-001': [crop1, crop2], 'T-002': [crop1] }
    query_set: List[Tuple[Union[str, np.ndarray], Optional[str]]], # [ (crop_path_or_emb, ground_truth_id), ... ]
    confident_threshold: float = 0.65,
    review_threshold: float = 0.45,
    model_name: str = DEFAULT_REID_MODEL,
) -> Dict:
    """
    Run formal closed/open-set Re-ID evaluation using multi-reference gallery.
    """
    extractor = TigerStripeFeatureExtractor(model_name=model_name)
    matcher = TigerReIDMatcher(
        confident_threshold=confident_threshold,
        review_threshold=review_threshold,
    )

    # 1. Build Multi-Reference Gallery
    reference_gallery: List[Dict] = []
    for tid, crops in known_individuals.items():
        for item in crops:
            if isinstance(item, (str, Path)):
                emb = extractor.extract_embedding(str(item))
            elif isinstance(item, np.ndarray):
                emb = item
            else:
                continue
            reference_gallery.append({
                "tiger_id": tid,
                "embedding": emb,
                "crop_type": "gallery_ref",
                "source_crop_path": str(item) if isinstance(item, (str, Path)) else None,
            })

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

    print("\n" + "=" * 78)
    print("  RUNNING TIGER RE-ID BENCHMARK EVALUATION (MEGADESCRIPTOR)")
    print("=" * 78)
    print(f"  Gallery Individuals       : {len(known_individuals)}")
    print(f"  Total Gallery References  : {len(reference_gallery)}")
    print(f"  Total Query Instances     : {total_queries}")
    print(f"  Confident Match Threshold : {confident_threshold:.0%}")
    print(f"  Human Review Threshold    : {review_threshold:.0%}")
    print("-" * 78)

    for query_item, true_id in query_set:
        if isinstance(query_item, (str, Path)):
            query_emb = extractor.extract_embedding(str(query_item))
            query_name = Path(query_item).name
        elif isinstance(query_item, np.ndarray):
            query_emb = query_item
            query_name = "embedding_vector"
        else:
            continue

        match_res = matcher.match(
            query_embedding=query_emb,
            reference_catalog=reference_gallery,
            flank_orientation="body_candidate",
        )

        is_true_unknown = (true_id is None or true_id.startswith("UNKNOWN") or true_id not in known_individuals)
        if is_true_unknown:
            total_unknown_queries += 1
        else:
            total_known_queries += 1

        top_candidates = [c[0] for c in match_res.ranked_candidates]
        pred_id = match_res.matched_tiger_id

        # Check Human Review Routing
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

        status_icon = "✓" if ((pred_id == true_id and not is_true_unknown) or (match_res.is_new_individual and is_true_unknown)) else "✗"
        print(
            f"  {status_icon} Query: {query_name[:28]:<28} | "
            f"True: {str(true_id):<8} | "
            f"Pred: {str(pred_id or 'NEW'):<8} | "
            f"Conf: {match_res.confidence_level:<22} | "
            f"Sim: {match_res.similarity_score:.1%}"
        )

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

    print("\n" + "=" * 78)
    print("  EVALUATION METRICS SUMMARY")
    print("=" * 78)
    print(f"  Rank-1 Accuracy             : {report['rank1_accuracy']}%")
    print(f"  Top-3 Accuracy              : {report['top3_accuracy']}%")
    print(f"  Unknown Individual Det Rate : {report['unknown_detection_rate']}%")
    print(f"  False Match Rate            : {report['false_match_rate']}%")
    print(f"  Human Review Routing Rate   : {report['human_review_rate']}%")
    print("=" * 78 + "\n")

    return report


if __name__ == "__main__":
    crops_dir = Path("tiger-intelligence/data/processed/crops")
    if crops_dir.exists():
        crop_files = sorted(list(crops_dir.glob("*.jpg")))
        if len(crop_files) >= 2:
            gallery = {f"T-00{i+1}": [str(crop_files[i])] for i in range(min(3, len(crop_files)))}
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
