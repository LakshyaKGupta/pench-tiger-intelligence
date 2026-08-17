"""
adapter.py — Universal Ingestion Source Adapters for TIGERTRACK AI.
Supports SD Cards, Local Folders, USB Drives, and future-compatible camera sources.
Provides pre-scan inspection (file counts, duplicates, corruption, byte volume) before pipeline execution.
"""

import hashlib
import os
import sys
from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from PIL import Image

SUPPORTED_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}


class IngestionSourceType(str, Enum):
    SD_CARD = "SD_CARD"
    LOCAL_FOLDER = "LOCAL_FOLDER"
    USB_STORAGE = "USB_STORAGE"
    NETWORK_CAMERA = "NETWORK_CAMERA"


class PreScanReport:
    def __init__(
        self,
        source_path: str,
        source_type: IngestionSourceType,
        total_discovered: int,
        total_bytes: int,
        supported_images: int,
        unsupported_files: int,
        duplicate_images: int,
        corrupt_images: int,
        new_actionable_images: int,
        sample_files: List[str],
    ):
        self.source_path = source_path
        self.source_type = source_type
        self.total_discovered = total_discovered
        self.total_bytes = total_bytes
        self.total_mb = round(total_bytes / (1024 * 1024), 2)
        self.supported_images = supported_images
        self.unsupported_files = unsupported_files
        self.duplicate_images = duplicate_images
        self.corrupt_images = corrupt_images
        self.new_actionable_images = new_actionable_images
        self.sample_files = sample_files

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_path": self.source_path,
            "source_type": self.source_type.value,
            "total_discovered": self.total_discovered,
            "total_bytes": self.total_bytes,
            "total_mb": self.total_mb,
            "supported_images": self.supported_images,
            "unsupported_files": self.unsupported_files,
            "duplicate_images": self.duplicate_images,
            "corrupt_images": self.corrupt_images,
            "new_actionable_images": self.new_actionable_images,
            "sample_files": self.sample_files,
        }


class IngestionSourceAdapter(ABC):
    """Abstract base class for all camera-trap ingestion source adapters."""

    def __init__(self, root_path: str | Path):
        self.root_path = Path(root_path).resolve()

    @abstractmethod
    def get_source_type(self) -> IngestionSourceType:
        pass

    def discover_all_files(self) -> List[Path]:
        """Recursively discovers all regular files within the source tree."""
        if not self.root_path.exists():
            return []
        if self.root_path.is_file():
            return [self.root_path]

        discovered = []
        for root, _, files in os.walk(self.root_path):
            for f in files:
                if not f.startswith("."):  # ignore hidden files
                    discovered.append(Path(root) / f)
        return discovered

    def prescan(self, existing_hashes: Optional[Set[str]] = None) -> PreScanReport:
        """
        Performs a fast non-destructive pre-scan of candidate media:
        - Validates file extensions against supported formats
        - Fast SHA-256 calculation to identify duplicates against existing database records
        - Verifies image header integrity with PIL to detect corrupt files
        """
        all_files = self.discover_all_files()
        total_bytes = sum(f.stat().st_size for f in all_files if f.is_file())

        supported: List[Path] = []
        unsupported = 0

        for f in all_files:
            if f.suffix in SUPPORTED_EXTENSIONS:
                supported.append(f)
            else:
                unsupported += 1

        duplicates = 0
        corrupt = 0
        actionable = 0
        known_hashes = existing_hashes or set()

        for img_path in supported:
            try:
                # Fast hash calculation
                h = hashlib.sha256()
                with open(img_path, "rb") as fp:
                    while chunk := fp.read(65536):
                        h.update(chunk)
                file_hash = h.hexdigest()

                if file_hash in known_hashes:
                    duplicates += 1
                    continue

                # Header verification
                with Image.open(img_path) as im:
                    im.verify()

                actionable += 1

            except Exception:
                corrupt += 1

        sample_names = [f.name for f in supported[:10]]

        return PreScanReport(
            source_path=str(self.root_path),
            source_type=self.get_source_type(),
            total_discovered=len(all_files),
            total_bytes=total_bytes,
            supported_images=len(supported),
            unsupported_files=unsupported,
            duplicate_images=duplicates,
            corrupt_images=corrupt,
            new_actionable_images=actionable,
            sample_files=sample_names,
        )


class MountedSDCardAdapter(IngestionSourceAdapter):
    """Adapter for camera-trap SD Cards, auto-detecting DCIM and camera folders."""

    def get_source_type(self) -> IngestionSourceType:
        return IngestionSourceType.SD_CARD


class LocalFolderAdapter(IngestionSourceAdapter):
    """Adapter for user-selected local camera trap folders or staging directories."""

    def get_source_type(self) -> IngestionSourceType:
        return IngestionSourceType.LOCAL_FOLDER


class USBStorageAdapter(IngestionSourceAdapter):
    """Adapter for mounted external USB/SSD storage volumes."""

    def get_source_type(self) -> IngestionSourceType:
        return IngestionSourceType.USB_STORAGE


def get_adapter_for_path(path: str | Path) -> IngestionSourceAdapter:
    """Factory creating the appropriate adapter based on path characteristics."""
    p = Path(path).resolve()
    
    # Check for typical SD Card directory layout
    if (p / "DCIM").exists() or any("DCIM" in part for part in p.parts):
        return MountedSDCardAdapter(p)
    
    # Check for /Volumes mount on macOS or drive root on Windows
    if sys.platform == "darwin" and str(p).startswith("/Volumes/"):
        return USBStorageAdapter(p)
    elif sys.platform == "win32" and len(p.parts) <= 2:
        return USBStorageAdapter(p)

    return LocalFolderAdapter(p)


def list_available_media_sources() -> List[Dict[str, Any]]:
    """
    Auto-discovers removable storage volumes and default staging folders available on the local workstation.
    """
    sources: List[Dict[str, Any]] = []

    if sys.platform == "darwin":
        volumes_root = Path("/Volumes")
        if volumes_root.exists():
            for v in volumes_root.iterdir():
                if v.is_dir() and not v.name.startswith("Macintosh") and not v.name.startswith("."):
                    try:
                        has_dcim = (v / "DCIM").exists()
                        sources.append({
                            "name": v.name,
                            "path": str(v),
                            "type": "SD_CARD" if has_dcim else "USB_DRIVE",
                            "has_dcim": has_dcim,
                        })
                    except Exception:
                        pass
    elif sys.platform == "win32":
        import string
        for letter in string.ascii_uppercase:
            drive = Path(f"{letter}:\\")
            if drive.exists():
                try:
                    has_dcim = (drive / "DCIM").exists()
                    sources.append({
                        "name": f"Drive {letter}:",
                        "path": str(drive),
                        "type": "SD_CARD" if has_dcim else "USB_DRIVE",
                        "has_dcim": has_dcim,
                    })
                except Exception:
                    pass

    return sources
