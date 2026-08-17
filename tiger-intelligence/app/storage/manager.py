"""
StorageManager: Platform-Aware Local Application Data & Filesystem Manager for TIGERTRACK AI.
Enforces strict boundary separation between application executable and user operational data.
Works cross-platform across macOS (Darwin), Windows (Win32), and Linux.
"""

import os
import sys
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("TigerTrack.StorageManager")

APP_NAME = "TIGERTRACK AI"


class StorageManager:
    """
    Manages local application storage roots, persistent directories, and disk capacity.
    """

    def __init__(self, custom_root: Optional[str] = None):
        self.platform = sys.platform
        self.root = self._resolve_root(custom_root)
        self._init_directories()

    def _resolve_root(self, custom_root: Optional[str] = None) -> Path:
        """
        Determines the canonical platform-specific application data directory.
        Priority:
        1. Explicit custom_root parameter
        2. TIGERTRACK_DATA_DIR environment variable
        3. Standard OS Application Support / AppData directory
        """
        if custom_root:
            return Path(custom_root).expanduser().resolve()

        env_root = os.environ.get("TIGERTRACK_DATA_DIR")
        if env_root:
            return Path(env_root).expanduser().resolve()

        if self.platform == "darwin":
            base = Path.home() / "Library" / "Application Support"
        elif self.platform == "win32":
            appdata = os.environ.get("APPDATA")
            base = Path(appdata) if appdata else Path.home() / "AppData" / "Roaming"
        else:  # Linux / Unix
            xdg_data = os.environ.get("XDG_DATA_HOME")
            base = Path(xdg_data) if xdg_data else Path.home() / ".local" / "share"

        return (base / APP_NAME).resolve()

    def _init_directories(self) -> None:
        """Creates standard directory hierarchy if missing."""
        self.database_dir = self.root / "database"
        self.media_dir = self.root / "media"
        self.crops_dir = self.root / "crops"
        self.quarantine_dir = self.root / "quarantine"
        self.quarantine_blanks = self.quarantine_dir / "blanks"
        self.quarantine_corrupt = self.quarantine_dir / "corrupt"
        self.quarantine_privacy = self.quarantine_dir / "privacy"
        self.imports_dir = self.root / "imports"
        self.exports_dir = self.root / "exports"
        self.logs_dir = self.root / "logs"

        subdirs = [
            self.database_dir,
            self.media_dir,
            self.crops_dir,
            self.quarantine_dir,
            self.quarantine_blanks,
            self.quarantine_corrupt,
            self.quarantine_privacy,
            self.imports_dir,
            self.exports_dir,
            self.logs_dir,
        ]

        for d in subdirs:
            d.mkdir(parents=True, exist_ok=True)

        logger.info(f"Initialized StorageManager at {self.root}")

    @property
    def database_path(self) -> Path:
        """Returns the canonical path to SQLite tiger.db."""
        return self.database_dir / "tiger.db"

    @property
    def audit_log_path(self) -> Path:
        """Returns the canonical path to the append-only audit log."""
        return self.logs_dir / "forensic_audit.log"

    def get_disk_telemetry(self) -> Dict[str, Any]:
        """
        Queries filesystem usage statistics for the storage root volume.
        """
        try:
            total, used, free = shutil.disk_usage(self.root)
            return {
                "storage_root": str(self.root),
                "total_bytes": total,
                "used_bytes": used,
                "free_bytes": free,
                "total_gb": round(total / (1024**3), 2),
                "used_gb": round(used / (1024**3), 2),
                "free_gb": round(free / (1024**3), 2),
                "percent_used": round((used / total) * 100, 1) if total > 0 else 0,
                "writable": os.access(self.root, os.W_OK),
            }
        except Exception as e:
            logger.error(f"Failed to query disk telemetry: {e}")
            return {
                "storage_root": str(self.root),
                "error": str(e),
                "writable": os.access(self.root, os.W_OK) if self.root.exists() else False,
            }

    def validate_contained_path(self, path: Path | str, allow_workspaces: bool = True) -> Path:
        """
        Strictly verifies that a given file path is contained within the authorized
        storage root (or active project workspace in dev mode) to prevent path traversal attacks.
        """
        target = Path(path).resolve()
        
        # Check if inside storage root
        try:
            target.relative_to(self.root)
            return target
        except ValueError:
            pass

        # Check fallback allowed workspace in dev mode
        if allow_workspaces:
            project_root = Path(__file__).resolve().parent.parent.parent
            workspace_root = project_root.parent
            for allowed in [project_root, workspace_root]:
                try:
                    target.relative_to(allowed.resolve())
                    return target
                except ValueError:
                    pass

        raise PermissionError(f"Security Alert: Path '{target}' is outside authorized storage boundaries.")


# Global instance
_default_manager: Optional[StorageManager] = None


def get_storage_manager() -> StorageManager:
    """Returns or creates the global StorageManager singleton."""
    global _default_manager
    if _default_manager is None:
        _default_manager = StorageManager()
    return _default_manager
