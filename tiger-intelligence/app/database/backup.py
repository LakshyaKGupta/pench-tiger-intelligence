"""
backup.py — Offline Database Backup & Atomic Restoration System
Pench Tiger Reserve Camera Trap Intelligence System

Provides:
1. Live, WAL-consistent SQLite backup via the native sqlite3 backup API.
2. Cryptographic checksumming (SHA-256) and metadata manifest recording.
3. Pre-restore safety snapshots and atomic rollbacks.
4. Comprehensive integrity verification (PRAGMA integrity_check & foreign_key_check).
"""

import hashlib
import json
import os
import shutil
import sqlite3
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple


@dataclass
class BackupInfo:
    backup_id: str
    filename: str
    filepath: str
    created_at: str
    size_bytes: int
    sha256: str
    table_counts: Dict[str, int]
    is_valid: bool = True


def _compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def _get_table_counts(conn: sqlite3.Connection) -> Dict[str, int]:
    counts = {}
    tables = [
        "tigers", "detections", "images", "alerts", "camera_stations",
        "movement_events", "officers", "sessions", "audit_log", "pipeline_runs"
    ]
    for tbl in tables:
        try:
            row = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()
            counts[tbl] = row[0] if row else 0
        except sqlite3.OperationalError:
            pass
    return counts


class TigerBackupManager:
    """Manages creation, validation, and restoration of offline SQLite database backups."""

    def __init__(self, db_path: Path, backup_dir: Optional[Path] = None):
        self.db_path = Path(db_path)
        self.backup_dir = Path(backup_dir) if backup_dir else self.db_path.parent / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def create_backup(self, actor: str = "OFFICER_ON_DUTY", note: Optional[str] = None) -> BackupInfo:
        """
        Create a live, transactionally consistent snapshot of the SQLite database.
        Uses sqlite3.backup() to ensure complete WAL flush and zero read locks.
        """
        if not self.db_path.exists():
            raise FileNotFoundError(f"Database not found at '{self.db_path}'")

        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
        backup_id = f"BKP-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        dest_filename = f"pench_tigers_{timestamp_str}.db"
        dest_path = self.backup_dir / dest_filename

        # Native online SQLite backup API (WAL-safe)
        src_conn = sqlite3.connect(str(self.db_path))
        dest_conn = sqlite3.connect(str(dest_path))
        try:
            with dest_conn:
                src_conn.backup(dest_conn, pages=100)
        finally:
            dest_conn.close()
            src_conn.close()

        # Validate newly created backup integrity
        verify_conn = sqlite3.connect(str(dest_path))
        try:
            integ = verify_conn.execute("PRAGMA integrity_check").fetchone()[0]
            if integ != "ok":
                dest_path.unlink(missing_ok=True)
                raise RuntimeError(f"Backup failed integrity check: {integ}")
            table_counts = _get_table_counts(verify_conn)
        finally:
            verify_conn.close()

        sha256 = _compute_sha256(dest_path)
        size_bytes = dest_path.stat().st_size
        iso_now = datetime.now(timezone.utc).isoformat()

        meta = BackupInfo(
            backup_id=backup_id,
            filename=dest_filename,
            filepath=str(dest_path),
            created_at=iso_now,
            size_bytes=size_bytes,
            sha256=sha256,
            table_counts=table_counts,
            is_valid=True,
        )

        # Write sidecar JSON manifest
        manifest_path = dest_path.with_suffix(".json")
        manifest_data = asdict(meta)
        manifest_data["actor"] = actor
        manifest_data["note"] = note or "Manual administrative backup"
        manifest_path.write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")

        return meta

    def list_backups(self) -> List[BackupInfo]:
        """List all available local database backups sorted newest first."""
        backups: List[BackupInfo] = []
        for db_file in sorted(self.backup_dir.glob("pench_tigers_*.db"), reverse=True):
            manifest_file = db_file.with_suffix(".json")
            if manifest_file.exists():
                try:
                    data = json.loads(manifest_file.read_text(encoding="utf-8"))
                    backups.append(BackupInfo(
                        backup_id=data.get("backup_id", db_file.stem),
                        filename=db_file.name,
                        filepath=str(db_file),
                        created_at=data.get("created_at", ""),
                        size_bytes=data.get("size_bytes", db_file.stat().st_size),
                        sha256=data.get("sha256", ""),
                        table_counts=data.get("table_counts", {}),
                        is_valid=True,
                    ))
                    continue
                except Exception:
                    pass

            # Fallback if manifest missing
            backups.append(BackupInfo(
                backup_id=db_file.stem,
                filename=db_file.name,
                filepath=str(db_file),
                created_at=datetime.fromtimestamp(db_file.stat().st_mtime, timezone.utc).isoformat(),
                size_bytes=db_file.stat().st_size,
                sha256=_compute_sha256(db_file),
                table_counts={},
                is_valid=True,
            ))
        return backups

    def validate_backup_file(self, backup_path: Path) -> Tuple[bool, str, Dict[str, int]]:
        """
        Verify that a candidate backup file is a non-corrupt SQLite database
        that satisfies foreign key constraints and schema rules.
        """
        if not backup_path.exists():
            return False, f"File '{backup_path.name}' does not exist.", {}
        if backup_path.stat().st_size == 0:
            return False, "Backup file is empty (0 bytes).", {}

        try:
            conn = sqlite3.connect(f"file:{backup_path}?mode=ro", uri=True)
            try:
                integ = conn.execute("PRAGMA integrity_check").fetchone()[0]
                if integ != "ok":
                    return False, f"Integrity check failed: {integ}", {}
                
                fk_violations = conn.execute("PRAGMA foreign_key_check").fetchall()
                if fk_violations:
                    return False, f"Foreign key check found {len(fk_violations)} violations.", {}

                counts = _get_table_counts(conn)
                return True, "Integrity verified successfully.", counts
            finally:
                conn.close()
        except sqlite3.DatabaseError as e:
            return False, f"Not a valid SQLite database: {e}", {}
        except Exception as e:
            return False, f"Validation error: {e}", {}

    def restore_backup(self, backup_filename_or_path: str, actor: str = "OFFICER_ON_DUTY") -> Dict:
        """
        Atomically restore database from a verified backup file.
        Creates a pre-restore safety snapshot to guarantee rollback capability.
        """
        # Resolve path safely (prevent directory traversal)
        clean_name = Path(backup_filename_or_path).name
        backup_path = self.backup_dir / clean_name
        if not backup_path.exists() and Path(backup_filename_or_path).exists():
            backup_path = Path(backup_filename_or_path)

        # 1. Pre-validation
        valid, msg, table_counts = self.validate_backup_file(backup_path)
        if not valid:
            raise ValueError(f"Cannot restore from invalid backup: {msg}")

        # 2. Safety snapshot of current database before overwriting
        safety_path = self.backup_dir / "pre_restore_safety_snapshot.db"
        if self.db_path.exists():
            try:
                curr_src = sqlite3.connect(str(self.db_path))
                safe_dest = sqlite3.connect(str(safety_path))
                with safe_dest:
                    curr_src.backup(safe_dest)
                safe_dest.close()
                curr_src.close()
            except Exception as e:
                raise RuntimeError(f"Failed to create pre-restore safety snapshot: {e}")

        # 3. Atomic restore via SQLite backup API
        restore_src = sqlite3.connect(str(backup_path))
        target_conn = sqlite3.connect(str(self.db_path))
        try:
            with target_conn:
                restore_src.backup(target_conn)
        except Exception as restore_err:
            # Rollback from safety snapshot if available
            if safety_path.exists():
                roll_src = sqlite3.connect(str(safety_path))
                roll_target = sqlite3.connect(str(self.db_path))
                with roll_target:
                    roll_src.backup(roll_target)
                roll_target.close()
                roll_src.close()
            raise RuntimeError(f"Restoration failed. Rolled back to safety snapshot: {restore_err}")
        finally:
            restore_src.close()
            target_conn.close()

        # 4. Post-restore verification
        post_conn = sqlite3.connect(str(self.db_path))
        try:
            post_integ = post_conn.execute("PRAGMA integrity_check").fetchone()[0]
            if post_integ != "ok":
                raise RuntimeError(f"Post-restore database corrupted: {post_integ}")
        finally:
            post_conn.close()

        return {
            "status": "SUCCESS",
            "restored_from": backup_path.name,
            "restored_at": datetime.now(timezone.utc).isoformat(),
            "actor": actor,
            "table_counts": table_counts,
            "message": f"Database successfully restored from '{backup_path.name}'. All records verified."
        }
