"""
Projection computation utilities.

This module handles computing PCA and UMAP projections for embedding collections.
"""

import chromadb
from chromadb.config import Settings
import time
import json
import numpy as np
from tqdm import tqdm

from ..embedding_functions.config import DB_PATH


def compute_projections_for_collection(collection_name: str) -> bool:
    """
    Compute PCA and UMAP projections for a collection.

    This is a simplified version that reuses logic from compute_projections.py.

    Args:
        collection_name: Name of the collection

    Returns:
        True if successful, False otherwise
    """
    try:
        from sklearn.decomposition import PCA

        # Check if umap is available
        try:
            import umap
            has_umap = True
        except ImportError:
            has_umap = False
            print("Warning: umap-learn not installed, skipping UMAP projections")

        db_path = str(DB_PATH.resolve())
        client = chromadb.PersistentClient(
            path=db_path,
            settings=Settings(anonymized_telemetry=False)
        )

        collection = client.get_collection(name=collection_name)

        # Get all embeddings
        print(f"Loading embeddings from {collection_name}...")
        all_data = collection.get(include=["embeddings", "metadatas"])

        embeddings = np.array(all_data['embeddings'])
        ids = all_data['ids']
        metadatas = all_data['metadatas']

        print(f"Computing projections for {len(ids)} items...")

        # Compute PCA
        print("Computing PCA projections...")
        pca_2d = PCA(n_components=2, random_state=42)
        pca_3d = PCA(n_components=3, random_state=42)

        coords_pca_2d = pca_2d.fit_transform(embeddings)
        coords_pca_3d = pca_3d.fit_transform(embeddings)

        pca_results = {
            '2d': coords_pca_2d,
            '3d': coords_pca_3d,
            '2d_variance': pca_2d.explained_variance_ratio_.tolist(),
            '3d_variance': pca_3d.explained_variance_ratio_.tolist()
        }

        # Compute UMAP if available
        umap_results = None
        if has_umap:
            print("Computing UMAP projections...")
            reducer_2d = umap.UMAP(n_components=2, n_neighbors=15, min_dist=0.1,
                                   metric='cosine', random_state=42, verbose=False)
            reducer_3d = umap.UMAP(n_components=3, n_neighbors=15, min_dist=0.1,
                                   metric='cosine', random_state=42, verbose=False)

            coords_umap_2d = reducer_2d.fit_transform(embeddings)
            coords_umap_3d = reducer_3d.fit_transform(embeddings)

            umap_results = {
                '2d': coords_umap_2d,
                '3d': coords_umap_3d
            }

        # Update metadata with projections
        print("Storing projections in ChromaDB...")
        batch_size = 1000

        for i in tqdm(range(0, len(ids), batch_size), desc="Updating metadata"):
            batch_ids = ids[i:i + batch_size]
            batch_metadatas = []

            for j, idx in enumerate(range(i, min(i + batch_size, len(ids)))):
                meta = metadatas[idx].copy()
                meta['pca_2d'] = json.dumps(coords_pca_2d[idx].tolist())
                meta['pca_3d'] = json.dumps(coords_pca_3d[idx].tolist())

                if umap_results:
                    meta['umap_2d'] = json.dumps(umap_results['2d'][idx].tolist())
                    meta['umap_3d'] = json.dumps(umap_results['3d'][idx].tolist())
                else:
                    meta['umap_2d'] = json.dumps([0, 0])
                    meta['umap_3d'] = json.dumps([0, 0, 0])

                batch_metadatas.append(meta)

            collection.update(ids=batch_ids, metadatas=batch_metadatas)

        # Update collection metadata
        current_metadata = collection.metadata or {}
        current_metadata.update({
            'pca_2d_variance': json.dumps(pca_results['2d_variance']),
            'pca_3d_variance': json.dumps(pca_results['3d_variance']),
            'has_projections': True,
            'projections_computed_at': time.strftime('%Y-%m-%d %H:%M:%S')
        })
        collection.modify(metadata=current_metadata)

        print("Projections computed and stored successfully!")
        return True

    except Exception as e:
        print(f"Error computing projections: {e}")
        return False
