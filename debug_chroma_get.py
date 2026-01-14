
import chromadb
from pathlib import Path

# Use the CORRECT path
db_path = Path("/Users/jack/EmbeddingVisualisation/interpretability_backend/resources/vector_db")
print(f"Opening DB at: {db_path}")

client = chromadb.PersistentClient(path=str(db_path))
collection = client.get_collection("emotion")

print(f"Collection count: {collection.count()}")
ids = collection.get(limit=5)["ids"]
print(f"Sample IDs: {ids}")

if ids:
    test_id = ids[0]
    print(f"Testing get for ID: {test_id}")
    try:
        res = collection.get(ids=[test_id], include=["embeddings"])
        print("Success!")
        print(f"Embedding length: {len(res['embeddings'][0])}")
    except Exception as e:
        print(f"Error getting specific ID: {e}")
