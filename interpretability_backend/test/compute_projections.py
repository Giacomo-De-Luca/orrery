"""
Compute and export embedding projections (PCA and UMAP) for visualization.

This script:
1. Loads embeddings from ChromaDB
2. Computes PCA projections (2D and 3D)
3. Computes UMAP projections (2D and 3D)
4. Exports all data to JSON for the Next.js frontend
"""

import json
import time
from pathlib import Path

import chromadb
import numpy as np
from chromadb.utils import embedding_functions
from sklearn.decomposition import PCA
from tqdm import tqdm

# Check if umap is available, if not, provide helpful error
try:
    import umap
except ImportError:
    print("ERROR: umap-learn is not installed.")
    print("Please install it with: uv add umap-learn")
    exit(1)


def load_embeddings_from_chromadb(db_path: str, collection_name: str = "wordnet_definitions_simple"):
    """Load all embeddings and metadata from ChromaDB."""
    print(f"Loading embeddings from {db_path}...")

    # Initialize client
    client = chromadb.PersistentClient(path=db_path)

    # Get collection
    collection = client.get_collection(name=collection_name)

    # Get all data
    print("Fetching all data from collection...")
    all_data = collection.get(
        include=["embeddings", "metadatas", "documents"]
    )

    # Convert to numpy arrays
    embeddings = np.array(all_data['embeddings'])
    ids = all_data['ids']
    metadatas = all_data['metadatas']
    words = [meta['word'] for meta in metadatas]
    definitions = all_data['documents']
    pos_tags = [meta.get('pos', 'unknown') for meta in metadatas]

    print(f"Loaded {len(words)} embeddings with {embeddings.shape[1]} dimensions")

    return collection, embeddings, ids, metadatas, words, definitions, pos_tags


def compute_pca_projections(embeddings: np.ndarray, n_components_2d: int = 2, n_components_3d: int = 3):
    """Compute PCA projections in 2D and 3D."""
    print("\nComputing PCA projections...")

    # 2D PCA
    print("  Computing 2D PCA...")
    start = time.time()
    pca_2d = PCA(n_components=n_components_2d, random_state=42)
    coords_2d = pca_2d.fit_transform(embeddings)
    print(f"  2D PCA completed in {time.time() - start:.2f}s")
    print(f"  Explained variance: {pca_2d.explained_variance_ratio_.sum():.4f}")

    # 3D PCA
    print("  Computing 3D PCA...")
    start = time.time()
    pca_3d = PCA(n_components=n_components_3d, random_state=42)
    coords_3d = pca_3d.fit_transform(embeddings)
    print(f"  3D PCA completed in {time.time() - start:.2f}s")
    print(f"  Explained variance: {pca_3d.explained_variance_ratio_.sum():.4f}")

    return {
        '2d': coords_2d,
        '3d': coords_3d,
        '2d_variance': pca_2d.explained_variance_ratio_.tolist(),
        '3d_variance': pca_3d.explained_variance_ratio_.tolist()
    }


def compute_umap_projections(embeddings: np.ndarray, n_components_2d: int = 2, n_components_3d: int = 3):
    """Compute UMAP projections in 2D and 3D."""
    print("\nComputing UMAP projections...")

    # 2D UMAP
    print("  Computing 2D UMAP...")
    start = time.time()
    reducer_2d = umap.UMAP(
        n_components=n_components_2d,
        n_neighbors=15,
        min_dist=0.1,
        metric='cosine',
        random_state=42,
        verbose=True
    )
    coords_2d = reducer_2d.fit_transform(embeddings)
    print(f"  2D UMAP completed in {time.time() - start:.2f}s")

    # 3D UMAP
    print("  Computing 3D UMAP...")
    start = time.time()
    reducer_3d = umap.UMAP(
        n_components=n_components_3d,
        n_neighbors=15,
        min_dist=0.1,
        metric='cosine',
        random_state=42,
        verbose=True
    )
    coords_3d = reducer_3d.fit_transform(embeddings)
    print(f"  3D UMAP completed in {time.time() - start:.2f}s")

    return {
        '2d': coords_2d,
        '3d': coords_3d
    }


def export_to_json(
    embeddings: np.ndarray,
    words: list,
    definitions: list,
    pos_tags: list,
    pca_results: dict,
    umap_results: dict,
    output_path: str
):
    """Export all data to JSON format for Next.js frontend."""
    print(f"\nExporting data to {output_path}...")

    # Prepare the data structure
    # Note: We export embeddings separately to reduce main JSON size
    data = {
        'metadata': {
            'total_words': len(words),
            'embedding_dim': embeddings.shape[1],
            'pca_2d_variance': pca_results['2d_variance'],
            'pca_3d_variance': pca_results['3d_variance'],
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        },
        'words': words,
        'definitions': definitions,
        'pos': pos_tags,
        'projections': {
            'pca_2d': pca_results['2d'].tolist(),
            'pca_3d': pca_results['3d'].tolist(),
            'umap_2d': umap_results['2d'].tolist(),
            'umap_3d': umap_results['3d'].tolist(),
        },
    }

    # Write to JSON
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    print("Writing projections JSON file...")
    with open(output_file, 'w') as f:
        json.dump(data, f)

    # Get file size
    file_size_mb = output_file.stat().st_size / (1024 * 1024)
    print(f"Projections data exported! File size: {file_size_mb:.2f} MB")

    # Export full embeddings separately as NPY (more efficient)
    embeddings_npy_path = output_file.with_name('embeddings_raw.npy')
    print(f"Saving raw embeddings to {embeddings_npy_path}...")
    np.save(embeddings_npy_path, embeddings)
    npy_size_mb = embeddings_npy_path.stat().st_size / (1024 * 1024)
    print(f"Raw embeddings saved! File size: {npy_size_mb:.2f} MB")


def store_projections_in_chromadb(
    collection,
    ids: list,
    metadatas: list,
    pca_results: dict,
    umap_results: dict
):
    """Store projection coordinates directly in ChromaDB metadata."""
    print("\nStoring projections in ChromaDB metadata...")

    # Update metadata with projection coordinates
    # Note: ChromaDB only supports str, int, float, bool in metadata
    # So we store projections as JSON strings
    updated_metadatas = []
    for i, metadata in enumerate(tqdm(metadatas, desc="Preparing metadata")):
        # Create updated metadata with projections as JSON strings
        updated_meta = metadata.copy()
        updated_meta['pca_2d'] = json.dumps(pca_results['2d'][i].tolist())
        updated_meta['pca_3d'] = json.dumps(pca_results['3d'][i].tolist())
        updated_meta['umap_2d'] = json.dumps(umap_results['2d'][i].tolist())
        updated_meta['umap_3d'] = json.dumps(umap_results['3d'][i].tolist())
        updated_metadatas.append(updated_meta)

    # Update collection in batches
    batch_size = 1000
    print(f"Updating collection in batches of {batch_size}...")

    for i in tqdm(range(0, len(ids), batch_size), desc="Updating batches"):
        batch_ids = ids[i:i + batch_size]
        batch_metadatas = updated_metadatas[i:i + batch_size]

        collection.update(
            ids=batch_ids,
            metadatas=batch_metadatas
        )

    print(f"✓ Stored projections for {len(ids)} items in ChromaDB")

    # Update collection-level metadata
    current_metadata = collection.metadata or {}
    current_metadata.update({
        'pca_2d_variance': json.dumps(pca_results['2d_variance']),
        'pca_3d_variance': json.dumps(pca_results['3d_variance']),
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'has_projections': True
    })
    collection.modify(metadata=current_metadata)
    print(f"✓ Updated collection metadata")


def update_collections_manifest(collection_name: str, metadata: dict, base_path: str):
    """Update the collections.json manifest file."""
    manifest_path = Path(base_path) / "collections.json"

    # Load existing manifest or create new one
    collections = {}
    if manifest_path.exists():
        with open(manifest_path, 'r') as f:
            collections = json.load(f)

    # Add or update this collection
    collections[collection_name] = {
        "name": collection_name,
        "display_name": collection_name.replace('_', ' ').title(),
        "total_words": metadata['total_words'],
        "embedding_dim": metadata['embedding_dim'],
        "timestamp": metadata['timestamp'],
        "data_file": f"{collection_name}.json",
    }

    # Save manifest
    with open(manifest_path, 'w') as f:
        json.dump(collections, f, indent=2)

    print(f"Updated collections manifest at {manifest_path}")


def main():
    """Main function to orchestrate the projection computation."""
    # Configuration
    collection_name = "wordnet_definitions_simple"  # Name of this embedding collection
    db_path = "interpretability/resources/vector_db"

    print("=" * 60)
    print("Embedding Projection Computation")
    print(f"Collection: {collection_name}")
    print("=" * 60)

    # Load embeddings
    collection, embeddings, ids, metadatas, words, definitions, pos_tags = load_embeddings_from_chromadb(db_path, collection_name)

    # Compute PCA projections
    pca_results = compute_pca_projections(embeddings)

    # Compute UMAP projections
    umap_results = compute_umap_projections(embeddings)

    # Store projections in ChromaDB
    store_projections_in_chromadb(
        collection=collection,
        ids=ids,
        metadatas=metadatas,
        pca_results=pca_results,
        umap_results=umap_results
    )

    print("\n" + "=" * 60)
    print("✓ All projections computed and stored in ChromaDB!")
    print("=" * 60)
    print(f"\nCollection: {collection_name}")
    print(f"Database: {db_path}")
    print("\nProjections are now stored in each item's metadata:")
    print("  - pca_2d: [x, y]")
    print("  - pca_3d: [x, y, z]")
    print("  - umap_2d: [x, y]")
    print("  - umap_3d: [x, y, z]")
    print("\nYou can now run the backend and frontend to visualize:")
    print("  ./start_backend.sh")
    print("  cd embedding_visualization && npm run dev")


if __name__ == "__main__":
    main()
