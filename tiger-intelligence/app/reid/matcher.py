"""
matcher.py — Nearest-Neighbor Tiger Re-ID Matcher & Evidence-Based Scorer
Pench Tiger Reserve Camera Trap Intelligence System

Calculates multi-factor explainable confidence:
  confidence = 0.50 * reid_similarity
             + 0.20 * flank_visibility
             + 0.15 * image_quality
             + 0.15 * temporal_consistency
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np


@dataclass
class MatchResult:
    matched_tiger_id: Optional[str]
    similarity_score: float
    confidence_level: str  # 'HIGH', 'MEDIUM_REVIEW_REQUIRED', 'LOW_NEW_INDIVIDUAL'
    composite_confidence: float
    is_new_individual: bool
    evidence_breakdown: dict
    ranked_candidates: List[Tuple[str, float]]


class TigerReIDMatcher:
    """
    Matches query stripe embeddings against reference database of known individual tigers.
    """

    def __init__(
        self,
        high_confidence_threshold: float = 0.85,
        review_threshold: float = 0.65,
    ):
        self.high_thr = high_confidence_threshold
        self.review_thr = review_threshold

    def match(
        self,
        query_embedding: np.ndarray,
        reference_catalog: List[Tuple[str, np.ndarray, str]],  # [(tiger_id, emb, flank_side), ...]
        flank_orientation: str = "ambiguous",
        image_quality_score: float = 0.90,
        temporal_consistency_score: float = 0.85,
    ) -> MatchResult:
        """
        Compare query embedding against all known tiger embeddings in reference catalog.
        """
        if not reference_catalog:
            # First tiger ever in the database
            evidence = {
                "reid_similarity": 0.0,
                "flank_visibility": 0.80 if flank_orientation != "ambiguous" else 0.50,
                "image_quality": image_quality_score,
                "temporal_consistency": 1.0,
                "composite_score": 0.50,
                "reason": "Reference database empty — registered as first individual",
            }
            return MatchResult(
                matched_tiger_id=None,
                similarity_score=0.0,
                confidence_level="LOW_NEW_INDIVIDUAL",
                composite_confidence=0.50,
                is_new_individual=True,
                evidence_breakdown=evidence,
                ranked_candidates=[],
            )

        # 1. Compute cosine similarity against all references
        scores: List[Tuple[str, float, str]] = []
        for tid, ref_emb, side in reference_catalog:
            sim = float(np.dot(query_embedding, ref_emb))
            scores.append((tid, sim, side))

        # Sort descending by similarity
        scores.sort(key=lambda x: x[1], reverse=True)
        best_tid, best_sim, best_side = scores[0]

        # 2. Multi-factor Evidence Scoring
        flank_vis_score = 0.95 if flank_orientation in ("left_flank", "right_flank") else 0.60
        
        # Penalize if flank orientation mismatches (e.g. left vs right)
        if flank_orientation != "ambiguous" and best_side != "both" and flank_orientation != best_side:
            flank_vis_score *= 0.85

        composite_conf = (
            0.50 * max(0.0, best_sim)
            + 0.20 * flank_vis_score
            + 0.15 * image_quality_score
            + 0.15 * temporal_consistency_score
        )
        composite_conf = min(1.0, max(0.0, composite_conf))

        # 3. Categorize Decision
        if best_sim >= self.high_thr:
            conf_level = "HIGH"
            is_new = False
            reason = f"High visual stripe similarity ({best_sim:.1%}) with catalogue individual {best_tid}"
        elif best_sim >= self.review_thr:
            conf_level = "MEDIUM_REVIEW_REQUIRED"
            is_new = False
            reason = f"Moderate similarity ({best_sim:.1%}) with {best_tid} — flagged for human review"
        else:
            conf_level = "LOW_NEW_INDIVIDUAL"
            is_new = True
            reason = f"Low similarity ({best_sim:.1%}) to all known tigers — distinct stripe pattern suggests new individual"

        ranked_list = [(s[0], round(s[1], 4)) for s in scores[:5]]

        evidence = {
            "reid_similarity": round(best_sim, 4),
            "flank_visibility": round(flank_vis_score, 4),
            "image_quality": round(image_quality_score, 4),
            "temporal_consistency": round(temporal_consistency_score, 4),
            "composite_score": round(composite_conf, 4),
            "top_match_id": best_tid,
            "top_match_side": best_side,
            "reason": reason,
        }

        return MatchResult(
            matched_tiger_id=best_tid if not is_new else None,
            similarity_score=best_sim,
            confidence_level=conf_level,
            composite_confidence=composite_conf,
            is_new_individual=is_new,
            evidence_breakdown=evidence,
            ranked_candidates=ranked_list,
        )
