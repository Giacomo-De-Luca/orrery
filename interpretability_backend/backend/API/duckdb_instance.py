"""Shared DuckDB client instance for API layer."""

from typing import Optional
from ..clients.duckdb_client import DuckDBClient

# Shared DuckDB client instance (lazy singleton)
_duckdb_client: Optional[DuckDBClient] = None


def get_duckdb_client() -> DuckDBClient:
    """Get shared DuckDB client instance.

    Returns:
        Singleton DuckDBClient instance, created on first call.
    """
    global _duckdb_client
    if _duckdb_client is None:
        _duckdb_client = DuckDBClient()
    return _duckdb_client
