"""
extractor.py — Wildlife Foundation Feature Extractor (MegaDescriptor-T-224)
Pench Tiger Reserve Camera Trap Intelligence System

Extracts 768-dimensional L2-normalized metric embeddings using the
pretrained MegaDescriptor-T-224 animal re-identification foundation model (BVRA/WildlifeDatasets).
"""

import os
import sys

# Enforce strict offline operation for all HuggingFace and PyTorch Hub calls
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

from pathlib import Path
from typing import List, Optional, Union

import numpy as np
import timm
import torch
from PIL import Image
from torchvision import transforms

DEFAULT_REID_MODEL_PATH = "tiger-intelligence/models/megadescriptor_t_224.pth"
DEFAULT_REID_MODEL = DEFAULT_REID_MODEL_PATH


class TigerStripeFeatureExtractor:
    """
    Wildlife Re-ID Feature Extractor using local pretrained MegaDescriptor foundation model.
    Trained on animal metric loss across wild multi-taxa identification datasets.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        model_name: Optional[str] = None,
        device: str = "cpu",
        embedding_dim: int = 768,
        offline_mode: bool = True,
    ):
        self.device = device
        self.embedding_dim = embedding_dim
        self.offline_mode = offline_mode
        self.model_name = model_name or model_path or DEFAULT_REID_MODEL_PATH

        # Set strict offline flags
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"

        # Resolve local weights path across development, PyInstaller, and working directories
        target_path = None
        candidates = []
        if model_path:
            candidates.append(Path(model_path))
        if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
            candidates.append(Path(sys._MEIPASS) / "models" / "megadescriptor_t_224.pth")
        candidates.extend([
            Path(__file__).resolve().parent.parent.parent / "models" / "megadescriptor_t_224.pth",
            Path.cwd() / "tiger-intelligence" / "models" / "megadescriptor_t_224.pth",
            Path.cwd() / "models" / "megadescriptor_t_224.pth",
            Path(DEFAULT_REID_MODEL_PATH),
        ])

        for cand in candidates:
            if cand.exists() and cand.is_file() and cand.stat().st_size > 10_000_000:
                target_path = cand.resolve()
                break

        if target_path is None or not target_path.exists():
            raise FileNotFoundError(
                f"FATAL: Offline Re-ID model weights not found in bundle. "
                f"Searched: {[str(c) for c in candidates]}. "
                f"Ensure 'megadescriptor_t_224.pth' is bundled in the application's models/ directory."
            )

        self.model_path = target_path

        # Direct local model construction with zero network access
        try:
            self.model = timm.create_model("swin_tiny_patch4_window7_224", pretrained=False, num_classes=0)
            state_dict = torch.load(str(self.model_path), map_location=device, weights_only=True)
            if "model" in state_dict and isinstance(state_dict["model"], dict):
                state_dict = state_dict["model"]
            self.model.load_state_dict(state_dict, strict=True)
            self.model.eval().to(device)
        except Exception as e:
            raise RuntimeError(f"Failed to load local Re-ID weights from '{self.model_path}': {e}")

        # MegaDescriptor standardization transform
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    @torch.no_grad()
    def extract_embedding(self, image_input: Union[str, Image.Image, np.ndarray]) -> np.ndarray:
        """
        Extract L2-normalized 768-dimensional metric embedding vector.
        """
        if isinstance(image_input, str):
            img = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            img = Image.fromarray(image_input).convert("RGB")
        elif isinstance(image_input, Image.Image):
            img = image_input.convert("RGB")
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        tensor = self.transform(img).unsqueeze(0).to(self.device)
        feat = self.model(tensor).squeeze().cpu().numpy()
        norm = np.linalg.norm(feat)
        if norm > 0:
            feat = feat / norm
        return feat.astype(np.float32)

    @torch.no_grad()
    def extract_batch(self, image_list: List[Union[str, Image.Image, np.ndarray]]) -> List[np.ndarray]:
        """Extract embeddings for a batch of candidate crops."""
        return [self.extract_embedding(img) for img in image_list]
