"""Shim entry point agar `uvicorn circlo_api:app` tetap bekerja dari root proyek."""
from scripts.circlo_api import app

__all__ = ["app"]
