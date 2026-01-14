"""Local data file client for loading parquet, JSON, CSV and TSV files."""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional, List, Dict, Any
import pandas as pd


@dataclass
class LocalFileInfo:
    """Information about a local data file."""
    file_path: str
    file_type: str  # parquet, json, jsonl, csv, tsv
    columns: List[str]
    num_rows: int
    file_size_bytes: int
    error: Optional[str] = None


@dataclass
class LocalFilePreview:
    """Preview rows from a local file."""
    file_path: str
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    error: Optional[str] = None


def _detect_file_type(file_path: str) -> str:
    """Detect file type from extension."""
    suffix = Path(file_path).suffix.lower()
    if suffix == ".parquet":
        return "parquet"
    elif suffix == ".json":
        return "json"
    elif suffix in (".jsonl", ".ndjson"):
        return "jsonl"
    elif suffix == ".csv":
        return "csv"
    elif suffix == ".tsv":
        return "tsv"
    else:
        return "unknown"


def load_local_dataframe(file_path: str, nrows: Optional[int] = None) -> pd.DataFrame:
    """
    Load data from a local file into a pandas DataFrame.

    Supports parquet, JSON, JSONL/NDJSON, CSV and TSV formats.

    Args:
        file_path: Path to the local file
        nrows: Number of rows to load (optional)

    Returns:
        pandas DataFrame with the loaded data
    """
    suffix = Path(file_path).suffix.lower()

    if suffix == ".parquet":
        # Parquet doesn't support direct nrows in read_parquet, but we can use metadata or other libs
        # For simplicity with pandas, we read normally. Optimizing parquet would require pyarrow.
        df = pd.read_parquet(file_path)
        if nrows:
            df = df.head(nrows)
    elif suffix == ".json":
        # standard json is usually a single object or list, hard to stream without custom parser
        df = pd.read_json(file_path)
        if nrows:
            df = df.head(nrows)
    elif suffix in (".jsonl", ".ndjson"):
        df = pd.read_json(file_path, lines=True, nrows=nrows)
    elif suffix == ".csv":
        df = pd.read_csv(file_path, nrows=nrows)
    elif suffix == ".tsv":
        df = pd.read_csv(file_path, sep='\t', nrows=nrows)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")

    return df


def get_local_file_info(file_path: str) -> LocalFileInfo:
    """
    Get information about a local data file.

    Args:
        file_path: Path to the local file

    Returns:
        LocalFileInfo with columns, row count, and file metadata
    """
    path = Path(file_path)

    if not path.exists():
        return LocalFileInfo(
            file_path=file_path,
            file_type="unknown",
            columns=[],
            num_rows=0,
            file_size_bytes=0,
            error=f"File not found: {file_path}"
        )

    file_type = _detect_file_type(file_path)
    if file_type == "unknown":
        return LocalFileInfo(
            file_path=file_path,
            file_type=file_type,
            columns=[],
            num_rows=0,
            file_size_bytes=path.stat().st_size,
            error=f"Unsupported file type: {path.suffix}"
        )

    try:
        df = load_local_dataframe(file_path)
        return LocalFileInfo(
            file_path=file_path,
            file_type=file_type,
            columns=list(df.columns),
            num_rows=len(df),
            file_size_bytes=path.stat().st_size
        )
    except Exception as e:
        return LocalFileInfo(
            file_path=file_path,
            file_type=file_type,
            columns=[],
            num_rows=0,
            file_size_bytes=path.stat().st_size if path.exists() else 0,
            error=str(e)
        )


def get_local_file_preview(
    file_path: str,
    n_rows: int = 5
) -> LocalFilePreview:
    """
    Get preview rows from a local data file.

    Args:
        file_path: Path to the local file
        n_rows: Number of rows to preview (default: 5)

    Returns:
        LocalFilePreview with column names and sample rows
    """
    try:
        # Optimization: Only load necessary rows for preview
        df = load_local_dataframe(file_path, nrows=n_rows)

        # Get preview rows
        preview_df = df.head(n_rows)

        # Convert to list of dicts, handling non-serializable types
        rows = []
        for _, row in preview_df.iterrows():
            row_dict = {}
            for col in df.columns:
                value = row[col]
                if pd.isna(value):
                    row_dict[col] = None
                elif isinstance(value, (str, int, float, bool)):
                    row_dict[col] = value
                elif isinstance(value, list):
                    row_dict[col] = value[:10] if len(value) > 10 else value
                else:
                    row_dict[col] = str(value)[:200]
            rows.append(row_dict)

        return LocalFilePreview(
            file_path=file_path,
            columns=list(df.columns),
            rows=rows,
            total_rows=len(df)
        )
    except Exception as e:
        return LocalFilePreview(
            file_path=file_path,
            columns=[],
            rows=[],
            total_rows=0,
            error=str(e)
        )


def load_local_file_portion(
    file_path: str,
    n_rows: Optional[int] = None,
    start_row: Optional[int] = None,
    end_row: Optional[int] = None,
    sample_n: Optional[int] = None,
    sample_seed: int = 42
) -> tuple[List[Dict[str, Any]], int]:
    """
    Load a portion of a local data file.

    Args:
        file_path: Path to the local file
        n_rows: Load first N rows (mutually exclusive with other options)
        start_row: Start row for range selection
        end_row: End row for range selection
        sample_n: Random sample N rows
        sample_seed: Seed for random sampling

    Returns:
        Tuple of (list of row dicts, total rows in file)
    """
    df = load_local_dataframe(file_path)
    total = len(df)

    if sample_n is not None:
        # Random sample
        import random
        random.seed(sample_seed)
        n = min(sample_n, total)
        df = df.sample(n=n, random_state=sample_seed)
    elif start_row is not None or end_row is not None:
        # Row range
        start = max(0, start_row or 0)
        end = min(total, end_row or total)
        df = df.iloc[start:end]
    elif n_rows is not None:
        # First N rows
        df = df.head(n_rows)

    # Convert to list of dicts
    rows = []
    for _, row in df.iterrows():
        row_dict = {}
        for col in df.columns:
            value = row[col]
            if pd.isna(value):
                row_dict[col] = None
            elif isinstance(value, (str, int, float, bool, list)):
                row_dict[col] = value
            else:
                # Convert numpy arrays and other types
                try:
                    row_dict[col] = value.tolist() if hasattr(value, 'tolist') else str(value)
                except Exception:
                    row_dict[col] = str(value)
        rows.append(row_dict)

    return rows, total
