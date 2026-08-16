"""
triage.py — Evidence-Preserving Triage Policy for Camera Trap Data
Pench Tiger Reserve Camera Trap Intelligence System

Decouples detection confidence from triage routing:
  1. KEEP (High Confidence >= 0.20) -> Proceed to Species Classifier / Privacy Protector
  2. REVIEW (Uncertain / Ambiguous [0.08, 0.20)) -> Route to Human Review Queue (Data Preserved)
  3. QUARANTINE (High Confidence Blank < 0.08) -> Reversibly stage in quarantine (Never Deleted)

Safety Invariant:
  Uncertainty NEVER causes destructive deletion. Low model confidence routes to REVIEW, not QUARANTINE.
"""

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.detection.detector import ImageDetectionResult


class TriageAction(str, Enum):
    KEEP = "KEEP"
    REVIEW = "REVIEW"
    QUARANTINE = "QUARANTINE"


@dataclass
class TriageDecision:
    image_path: str
    action: TriageAction
    reason: str
    subject_category: str  # "animal", "person", "vehicle", "blank", "uncertain"
    top_confidence: float
    box_count: int
    is_reversible: bool = True
    audit_log_entry: Optional[Dict] = None


class CameraTrapTriagePolicy:
    """
    Triage policy engine ensuring conservative, evidence-preserving triage decisions.
    """

    def __init__(
        self,
        keep_threshold: float = 0.20,
        quarantine_threshold: float = 0.08,
    ):
        self.keep_threshold = keep_threshold
        self.quarantine_threshold = quarantine_threshold

    def evaluate(self, detection: ImageDetectionResult) -> TriageDecision:
        """
        Evaluate subject detection output and determine the evidence-preserving triage action.
        """
        top_conf = detection.top_confidence

        # Case 1: Definite Subject Detected (Animal, Person, or Vehicle with Conf >= keep_threshold)
        if not detection.is_blank and top_conf >= self.keep_threshold:
            if detection.has_animal:
                cat = "animal"
                reason = f"High-confidence animal detection (conf={top_conf:.2f})"
            elif detection.has_human:
                cat = "person"
                reason = f"High-confidence person detection (conf={top_conf:.2f}) -> Privacy Blur required"
            elif detection.has_vehicle:
                cat = "vehicle"
                reason = f"High-confidence vehicle detection (conf={top_conf:.2f}) -> Security Log"
            else:
                cat = "unknown_subject"
                reason = f"High-confidence subject detection (conf={top_conf:.2f})"

            return TriageDecision(
                image_path=detection.image_path,
                action=TriageAction.KEEP,
                reason=reason,
                subject_category=cat,
                top_confidence=top_conf,
                box_count=len(detection.boxes),
                audit_log_entry={
                    "stage": "TRIAGE",
                    "decision": "KEEP",
                    "category": cat,
                    "confidence": round(top_conf, 4),
                    "boxes": len(detection.boxes),
                    "reason": reason,
                }
            )

        # Case 2: Ambiguous / Low Confidence Detection [quarantine_threshold, keep_threshold)
        # Model noticed a possible subject, but is uncertain -> DO NOT QUARANTINE!
        if (not detection.is_blank and top_conf >= self.quarantine_threshold) or (0 < top_conf < self.keep_threshold):
            return TriageDecision(
                image_path=detection.image_path,
                action=TriageAction.REVIEW,
                reason=f"Uncertain detection (conf={top_conf:.2f} in review band [{self.quarantine_threshold:.2f}, {self.keep_threshold:.2f})) -> Preserving for human audit",
                subject_category="uncertain",
                top_confidence=top_conf,
                box_count=len(detection.boxes),
                audit_log_entry={
                    "stage": "TRIAGE",
                    "decision": "REVIEW",
                    "category": "uncertain",
                    "confidence": round(top_conf, 4),
                    "boxes": len(detection.boxes),
                    "reason": "Model uncertainty preservation",
                }
            )

        # Case 3: High-Confidence Blank (< quarantine_threshold with 0 detection boxes)
        return TriageDecision(
            image_path=detection.image_path,
            action=TriageAction.QUARANTINE,
            reason=f"High-confidence blank frame (no subjects detected, top_conf < {self.quarantine_threshold:.2f})",
            subject_category="blank",
            top_confidence=top_conf,
            box_count=0,
            audit_log_entry={
                "stage": "TRIAGE",
                "decision": "QUARANTINE",
                "category": "blank",
                "confidence": round(top_conf, 4),
                "boxes": 0,
                "reason": "Reversible blank quarantine",
            }
        )
