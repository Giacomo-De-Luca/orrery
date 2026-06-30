"""Embedding loading utilities.

Reads dense embedding vectors from ChromaDB and returns them aligned to a caller
-supplied list of item IDs. Reused by embedding-space topic clustering and by the
topic-quality evaluator (silhouette in the original embedding space).
"""

import logging

import chromadb
import numpy as np
from chromadb.config import Settings

from ..utils.resource_paths import CHROMA_DB_PATH

logger = logging.getLogger("orrery." + __name__)


def load_embeddings_for_ids(
    collection_name: str, ids: list[str], load_batch_size: int = 5000
) -> np.ndarray | None:
    """Load embeddings from ChromaDB ordered to match ``ids``.

    Reads all ``(id, embedding)`` pairs from the collection in batches, builds an
    ``id -> vector`` lookup, then returns a ``(len(ids), dim)`` array in the exact
    order of the requested ``ids``.

    Args:
        collection_name: Name of the ChromaDB collection.
        ids: Item IDs whose embeddings to return, in the desired output order.
        load_batch_size: Number of records to read per ChromaDB ``get`` call.

    Returns:
        A float64 numpy array aligned to ``ids``, or ``None`` if the collection is
        missing, empty, or any requested id has no embedding.
    """
    try:
        client = chromadb.PersistentClient(
            path=str(CHROMA_DB_PATH.resolve()),
            settings=Settings(anonymized_telemetry=False),
        )
        collection = client.get_collection(name=collection_name, embedding_function=None)
    except Exception as e:
        logger.error("Could not open ChromaDB collection %r: %s", collection_name, e)
        return None

    count = collection.count()
    if count == 0:
        logger.warning("Collection %r has no vectors", collection_name)
        return None

    id_to_vector: dict[str, np.ndarray] = {}
    for offset in range(0, count, load_batch_size):
        limit = min(load_batch_size, count - offset)
        batch = collection.get(include=["embeddings"], limit=limit, offset=offset)
        for item_id, vector in zip(batch["ids"], batch["embeddings"], strict=True):
            id_to_vector[item_id] = vector

    missing = [i for i in ids if i not in id_to_vector]
    if missing:
        logger.error(
            "%d/%d requested ids have no embedding in %r (e.g. %s)",
            len(missing),
            len(ids),
            collection_name,
            missing[:3],
        )
        return None

    return np.array([id_to_vector[i] for i in ids], dtype=np.float64)
