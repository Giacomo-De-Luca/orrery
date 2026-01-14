"""Utility modules for embedding operations."""

from .text_processing import format_text_for_embedding, extract_metadata
from .compute_projections import compute_projections_for_collection

__all__ = [
    "format_text_for_embedding",
    "extract_metadata",
    "compute_projections_for_collection",
]
