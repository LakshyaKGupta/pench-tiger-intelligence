"""
extractor.py — Wildlife Foundation Feature Extractor (MegaDescriptor-T-224)
Pench Tiger Reserve Camera Trap Intelligence System

Extracts 768-dimensional L2-normalized metric embeddings using the
pretrained MegaDescriptor-T-224 animal re-identification foundation model (BVRA/WildlifeDatasets).
"""

import os

# Enforce strict offline operation for all HuggingFace and PyTorch Hub calls
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

from typing import List, Optional, Union

import numpy as np
import timm
import torch
from PIL import Image
from torchvision import transforms

DEFAULT_REID_MODEL = "hf-hub:BVRA/MegaDescriptor-T-224"


class TigerStripeFeatureExtractor:
    """
    Wildlife Re-ID Feature Extractor using pretrained MegaDescriptor foundation model.
    Trained on animal metric loss across wild multi-taxa identification datasets.
    """

    def __init__(
        self,
        model_name: str = DEFAULT_REID_MODEL,
        device: str = "cpu",
        embedding_dim: int = 768,
        offline_mode: bool = True,
    ):
        self.device = device
        self.model_name = model_name
        self.embedding_dim = embedding_dim
        self.offline_mode = offline_mode

        # Set Hugging Face offline environment if requested
        if offline_mode:
            os.environ["HF_HUB_OFFLINE"] = "1"
            os.environ["TRANSFORMERS_OFFLINE"] = "1"

        try:
            self.model = timm.create_model(model_name, pretrained=True, num_classes=0).to(device)
            self.model.eval()
        except Exception as e:
            # If offline mode failed because weights aren't cached yet, provide clean actionable error
            if offline_mode:
                # Try loading with offline flag relaxed once if first run
                os.environ.pop("HF_HUB_OFFLINE", None)
                try:
                    self.model = timm.create_model(model_name, pretrained=True, num_classes=0).to(device)
                    self.model.eval()
                except Exception as ex2:
                    raise RuntimeError(
                        f"FATAL: Could not load Re-ID model '{model_name}'. "
                        f"Offline weights missing from local cache: {ex2}"
                    )
            else:
                raise RuntimeError(f"Failed to load Re-ID model '{model_name}': {e}")

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
