"""
matcher.py — Multi-Reference Tiger Re-ID Matcher & Evidence Decision Engine
Pench Tiger Reserve Camera Trap Intelligence System

Matches dual query candidate crops against multi-reference individual galleries.
Decision bands:
  - similarity >= confident_threshold: HIGH CONFIDENCE (Automatic Match)
  - review_threshold <= similarity < confident_threshold: MEDIUM (Human Review Required)
  - similarity < review_threshold: LOW (New / Unknown Individual)
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Union

import numpy as np


@dataclass
class MatchResult:
    matched_tiger_id: Optional[str]
    similarity_score: float
    confidence_level: str  # 'HIGH', 'MEDIUM_REVIEW_REQUIRED', 'LOW_NEW_INDIVIDUAL'
    composite_confidence: float
    is_new_individual: bool
    selected_crop_type: str
    best_matching_reference_crop: str
    evidence_breakdown: dict
    ranked_candidates: List[Tuple[str, float]]


class TigerReIDMatcher:
    """
    Nearest-neighbor metric matcher evaluating query candidate embeddings against
    multi-reference galleries of known individual tigers.
    """

    def __init__(
        self,
        confident_threshold: float = 0.65,
        review_threshold: float = 0.45,
    ):
        self.confident_thr = confident_threshold
        self.review_thr = review_threshold

    def match_candidates(
        self,
        query_candidate_embeddings: List[Tuple[str, np.ndarray]],  # [('left_candidate', emb), ('right_candidate', emb), ...]
        reference_gallery: Union[List[Dict], List[Tuple[str, np.ndarray, str]]],
        image_quality_score: float = 0.90,
        temporal_consistency_score: float = 0.85,
    ) -> MatchResult:
        """
        Compare dual query candidate embeddings against multi-reference individual gallery.
        """
        if not reference_gallery:
            # First tiger ever in the database
            evidence = {
                "reid_similarity": 0.0,
                "confident_threshold": self.confident_thr,
                "review_threshold": self.review_thr,
                "selected_query_crop": query_candidate_embeddings[0][0] if query_candidate_embeddings else "body_candidate",
                "best_matching_reference": "none",
                "reason": "Reference database empty — enrolled as first individual",
            }
            return MatchResult(
                matched_tiger_id=None,
                similarity_score=0.0,
                confidence_level="LOW_NEW_INDIVIDUAL",
                composite_confidence=0.50,
                is_new_individual=True,
                selected_crop_type=query_candidate_embeddings[0][0] if query_candidate_embeddings else "body_candidate",
                best_matching_reference_crop="none",
                evidence_breakdown=evidence,
                ranked_candidates=[],
            )

        # Normalize reference gallery format
        norm_gallery: List[Dict] = []
        for item in reference_gallery:
            if isinstance(item, dict):
                norm_gallery.append(item)
            elif isinstance(item, (list, tuple)) and len(item) >= 2:
                norm_gallery.append({
                    "tiger_id": item[0],
                    "embedding": item[1],
                    "crop_type": item[2] if len(item) > 2 else "flank",
                })

        # 1. Compute pairwise similarities between all query candidates and all gallery embeddings
        # Group maximum similarity per individual tiger_id
        tiger_best_scores: Dict[str, Tuple[float, str, str]] = {}  # tid -> (max_sim, q_crop, ref_crop)

        for q_type, q_emb in query_candidate_embeddings:
            for ref in norm_gallery:
                tid = ref["tiger_id"]
                ref_emb = ref["embedding"]
                ref_crop = ref.get("crop_type", "flank")

                sim = float(np.dot(q_emb, ref_emb))

                if tid not in tiger_best_scores or sim > tiger_best_scores[tid][0]:
                    tiger_best_scores[tid] = (sim, q_type, ref_crop)

        # Rank individuals descending by aggregated similarity
        ranked_tids = sorted(tiger_best_scores.items(), key=lambda x: x[1][0], reverse=True)
        best_tid, (best_sim, best_q_crop, best_ref_crop) = ranked_tids[0]

        # 2. Decision Logic based on Configurable Thresholds
        if best_sim >= self.confident_thr:
            conf_level = "HIGH"
            is_new = False
            reason = (
                f"Confident stripe match ({best_sim:.1%}) with catalogue individual {best_tid} "
                f"(exceeds confident threshold {self.confident_thr:.0%})"
            )
        elif best_sim >= self.review_thr:
            conf_level = "MEDIUM_REVIEW_REQUIRED"
            is_new = False
            reason = (
                f"Moderate stripe similarity ({best_sim:.1%}) with {best_tid} "
                f"(within review band {self.review_thr:.0%}–{self.confident_thr:.0%}) — flagged for human review"
            )
        else:
            conf_level = "LOW_NEW_INDIVIDUAL"
            is_new = True
            reason = (
                f"Low similarity ({best_sim:.1%}) across all known tigers "
                f"(below threshold {self.review_thr:.0%}) — new individual candidate"
            )

        composite_conf = (
            0.55 * max(0.0, best_sim)
            + 0.25 * image_quality_score
            + 0.20 * temporal_consistency_score
        )
        composite_conf = min(1.0, max(0.0, composite_conf))

        ranked_list = [(tid, round(score_info[0], 4)) for tid, score_info in ranked_tids[:5]]

        evidence = {
            "reid_similarity": round(best_sim, 4),
            "confident_threshold": self.confident_thr,
            "review_threshold": self.review_thr,
            "selected_query_crop": best_q_crop,
            "best_matching_reference_crop": best_ref_crop,
            "composite_confidence": round(composite_conf, 4),
            "top_candidate_id": best_tid,
            "reason": reason,
        }

        return MatchResult(
            matched_tiger_id=best_tid if not is_new else None,
            similarity_score=best_sim,
            confidence_level=conf_level,
            composite_confidence=composite_conf,
            is_new_individual=is_new,
            selected_crop_type=best_q_crop,
            best_matching_reference_crop=best_ref_crop,
            evidence_breakdown=evidence,
            ranked_candidates=ranked_list,
        )

    # Backward-compatible single-query match method
    def match(
        self,
        query_embedding: np.ndarray,
        reference_catalog: Union[List[Dict], List[Tuple[str, np.ndarray, str]]],
        flank_orientation: str = "body_candidate",
        image_quality_score: float = 0.90,
        temporal_consistency_score: float = 0.85,
    ) -> MatchResult:
        """Backward-compatible match method for single query embedding."""
        candidates = [(flank_orientation, query_embedding)]
        return self.match_candidates(
            query_candidate_embeddings=candidates,
            reference_gallery=reference_catalog,
            image_quality_score=image_quality_score,
            temporal_consistency_score=temporal_consistency_score,
        )
