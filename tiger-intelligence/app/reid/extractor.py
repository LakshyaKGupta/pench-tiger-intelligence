"""
extractor.py — Deep Visual Stripe Feature Extractor for Individual Tiger Re-ID
Pench Tiger Reserve Camera Trap Intelligence System

Extracts 768-dimensional L2-normalized visual stripe embeddings from flank crops.
"""

from typing import List, Union

import numpy as np
import timm
import torch
from PIL import Image
from torchvision import transforms


class TigerStripeFeatureExtractor:
    """
    High-capacity feature extractor for fine-grained animal stripe patterns.
    Uses pre-trained ConvNeXt visual metric backbone with L2 normalization.
    """

    def __init__(
        self,
        model_name: str = "convnext_tiny",
        device: str = "cpu",
        embedding_dim: int = 768,
    ):
        self.device = device
        self.model_name = model_name
        self.embedding_dim = embedding_dim

        # Initialize visual backbone
        self.model = timm.create_model(model_name, pretrained=True, num_classes=0).to(device)
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    @torch.no_grad()
    def extract_embedding(self, image_input: Union[str, Image.Image, np.ndarray]) -> np.ndarray:
        """
        Extract L2-normalized embedding vector from a crop.
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
        """Extract embeddings for a batch of crops."""
        return [self.extract_embedding(img) for img in image_list]
