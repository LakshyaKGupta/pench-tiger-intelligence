# -*- mode: python ; coding: utf-8 -*-
# PyInstaller Spec for TIGERTRACK AI Local Intelligence Engine Sidecar

import sys
import os
from pathlib import Path

block_cipher = None

PROJECT_DIR = Path(os.path.abspath(os.getcwd()))
if PROJECT_DIR.name != "tiger-intelligence":
    PROJECT_DIR = PROJECT_DIR / "tiger-intelligence"

raw_added_files = [
    (str(PROJECT_DIR / "database" / "schema.sql"), "database"),
    (str(PROJECT_DIR / "models"), "models"),
    (str(PROJECT_DIR / "data" / "pench_reserve_core_boundary.geojson"), "data"),
    (str(PROJECT_DIR / "data" / "pench_reserve_buffer_boundary.geojson"), "data"),
    (str(PROJECT_DIR / "data" / "pench_village_settlement_polygons.geojson"), "data"),
]
added_files = [f for f in raw_added_files if os.path.exists(f[0])]

# Collect hidden imports for FastAPI, Uvicorn, SQLite, Torch, Timm, and Ultralytics
hidden_imports = [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "fastapi",
    "pydantic",
    "sqlite3",
    "torch",
    "torchvision",
    "timm",
    "timm.models",
    "ultralytics",
    "PIL",
    "PIL.Image",
    "numpy",
    "matplotlib",
    "matplotlib.pyplot",
]

a = Analysis(
    [str(PROJECT_DIR / "app" / "api" / "server.py")],
    pathex=[str(PROJECT_DIR)],
    binaries=[],
    datas=added_files,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "IPython", "notebook"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="tiger-intelligence-sidecar",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
