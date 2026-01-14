"""
Utility functions for WordNet Embedding project.

This module provides shared functionality used across multiple scripts.
Used by query_wordnet.py and analyze_dimension.py to READ existing embeddings.
"""

import chromadb
from chromadb.utils import embedding_functions
import torch
import numpy as np
from tqdm import tqdm
from typing import Tuple, List

# Constants for reading embeddings (used by query and analysis scripts)
DB_PATH = "interpretability/resources/vector_db"
COLLECTION_NAME = "wordnet_definitions"
MODEL_NAME = "all-MiniLM-L6-v2"
LOADING_BATCH_SIZE = 10000


def get_device() -> str:
    """
    Detect and return the best available device for computation.

    Returns:
        Device string: 'mps', 'cuda', or 'cpu'
    """
    if torch.backends.mps.is_available():
        return "mps"
    elif torch.cuda.is_available():
        return "cuda"
    else:
        return "cpu"


def setup_collection():
    """
    Connect to existing WordNet vector database and get the collection.

    This function is for READING existing embeddings only.
    To CREATE embeddings, use embed_wordnet.py.

    Returns:
        Tuple of (collection, device)

    Raises:
        ValueError: If collection doesn't exist
    """
    device = get_device()

    # Initialize ChromaDB client
    client = chromadb.PersistentClient(path=DB_PATH)

    # Create embedding function (needed to query)
    # Set local_files_only=True to avoid network calls if model is cached
    import os
    os.environ['HF_HUB_OFFLINE'] = '1'  # Force offline mode
    
    sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=MODEL_NAME,
        device=device
    )

    # Get existing collection
    try:
        collection = client.get_collection(
            name=COLLECTION_NAME,
            embedding_function=sentence_transformer_ef
        )
    except Exception as e:
        raise ValueError(
            f"Collection '{COLLECTION_NAME}' not found in {DB_PATH}. "
            f"Please run 'embed_wordnet.py' first to create the embeddings. "
            f"Error: {e}"
        )

    return collection, device


def get_all_embeddings(collection, show_progress: bool = True) -> Tuple[List[str], np.ndarray]:
    """
    Retrieve all word embeddings from the collection.

    Args:
        collection: ChromaDB collection object
        show_progress: Whether to show progress bars

    Returns:
        Tuple of (words, embeddings_array)
        - words: List of word strings
        - embeddings_array: numpy array of shape (n_words, embedding_dim)
    """
    if show_progress:
        print("Retrieving all embeddings from collection...")

    # Get total count
    total_count = collection.count()
    if show_progress:
        print(f"Total words in collection: {total_count:,}")

    batch_size = LOADING_BATCH_SIZE
    all_words = []
    all_embeddings = []

    # Get all IDs first
    all_ids = []
    offset = 0

    if show_progress:
        print("Fetching all word IDs...")

    while True:
        results = collection.get(
            limit=batch_size,
            offset=offset,
            include=[]  # Don't include anything, just get IDs
        )

        if not results['ids']:
            break

        all_ids.extend(results['ids'])
        offset += batch_size

    if show_progress:
        print(f"Retrieved {len(all_ids):,} word IDs")

    # Now fetch embeddings in batches
    if show_progress:
        print("Fetching embeddings...")
        iterator = tqdm(range(0, len(all_ids), batch_size), desc="Loading batches", unit="batch")
    else:
        iterator = range(0, len(all_ids), batch_size)

    for i in iterator:
        batch_ids = all_ids[i:i + batch_size]

        results = collection.get(
            ids=batch_ids,
            include=['embeddings', 'metadatas']
        )

        # Extract words and embeddings
        for j, embedding in enumerate(results['embeddings']):
            word = results['metadatas'][j]['word']
            all_words.append(word)
            all_embeddings.append(embedding)

    embeddings_array = np.array(all_embeddings)

    if show_progress:
        print(f"✓ Loaded {len(all_words):,} word embeddings")
        print(f"✓ Embedding dimensions: {embeddings_array.shape[1]}")

    return all_words, embeddings_array


def get_collection_without_embedding_function():
    """
    Connect to existing WordNet vector database WITHOUT loading the embedding model.
    
    Use this when you only need to READ embeddings, not create new ones.
    This avoids network calls to Hugging Face.

    Returns:
        ChromaDB collection object

    Raises:
        ValueError: If collection doesn't exist
    """
    # Initialize ChromaDB client
    client = chromadb.PersistentClient(path=DB_PATH)

    # Get existing collection WITHOUT embedding function
    try:
        collection = client.get_collection(name=COLLECTION_NAME)
    except Exception as e:
        raise ValueError(
            f"Collection '{COLLECTION_NAME}' not found in {DB_PATH}. "
            f"Please run 'embed_wordnet.py' first to create the embeddings. "
            f"Error: {e}"
        )

    return collection


def print_device_info(device: str):
    """
    Print information about the device being used.

    Args:
        device: Device string ('mps', 'cuda', or 'cpu')
    """
    if device == "mps":
        print("✓ Metal Performance Shaders (MPS) available - using GPU acceleration")
    elif device == "cuda":
        print("✓ CUDA available - using GPU acceleration")
    else:
        print("⚠ No GPU acceleration available - using CPU")

    print(f"Device: {device}")
