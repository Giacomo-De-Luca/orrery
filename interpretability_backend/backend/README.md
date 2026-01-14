# Embedding Visualization Backend

GraphQL API for exploring word embeddings with ChromaDB.

## Features

- **GraphQL API** with Strawberry and FastAPI
- **Semantic Search** with multiple similarity measures (cosine, L2, inner product)
- **Advanced Filtering** using ChromaDB's where clauses
- **Flexible Queries** for embeddings, metadata, and projections
- **CORS enabled** for local frontend development

## Installation

```bash
# Install dependencies
uv sync

# Or with pip
pip install -e .
```

## Running the Server

### Option 1: Direct Python
```bash
# From project root
uv run uvicorn interpretability.backend.main:app --reload --port 8000

# Or
cd interpretability
uv run python -m backend.main
```

### Option 2: Docker Compose
```bash
# From project root
docker-compose up backend
```

The server will start at `http://localhost:8000`

## GraphQL Playground

Visit `http://localhost:8000/graphql` in your browser to access the interactive GraphQL playground.

## API Endpoints

### REST Endpoints
- `GET /` - API info
- `GET /health` - Health check

### GraphQL Endpoint
- `POST /graphql` - GraphQL queries and mutations

## Example Queries

### 1. List All Collections
```graphql
query {
  collections {
    name
    count
    metadata
  }
}
```

### 2. Get Full Collection Data
```graphql
query {
  collection(name: "wordnet_definitions") {
    words
    definitions
    pos
    pca_2d
    pca_3d
    umap_2d
    umap_3d
    metadata {
      total_words
      embedding_dim
      timestamp
      pca_2d_variance
      pca_3d_variance
    }
  }
}
```

### 3. Get Embeddings with Filtering
```graphql
query {
  embeddings(
    collectionName: "wordnet_definitions"
    limit: 10
    filters: [
      { field: "pos", operator: EQ, value: "n" }
    ]
    includeEmbeddings: true
  ) {
    id
    word
    definition
    pos
    embedding
  }
}
```

### 4. Semantic Search
```graphql
query {
  semanticSearch(
    collectionName: "wordnet_definitions"
    query: "small furry animal"
    nResults: 10
    similarityMeasure: COSINE
    filters: [
      { field: "pos", operator: EQ, value: "n" }
    ]
  ) {
    id
    word
    definition
    pos
    distance
    similarity
  }
}
```

### 5. Search with Query Embedding
```graphql
query {
  semanticSearch(
    collectionName: "wordnet_definitions"
    queryEmbedding: [0.1, 0.2, 0.3, ...]  # 384-dim vector
    nResults: 10
    similarityMeasure: L2
  ) {
    word
    similarity
  }
}
```

## Filter Operators

Available filter operators:
- `EQ` - Equals ($eq)
- `NE` - Not equals ($ne)
- `GT` - Greater than ($gt)
- `GTE` - Greater than or equal ($gte)
- `LT` - Less than ($lt)
- `LTE` - Less than or equal ($lte)
- `IN` - In array ($in)
- `NIN` - Not in array ($nin)

## Similarity Measures

- `COSINE` - Cosine similarity (default)
- `L2` - Euclidean distance
- `IP` - Inner product

## Architecture

```
interpretability/backend/
├── main.py              # FastAPI app with GraphQL endpoint
├── schema.py            # Strawberry GraphQL schema
├── chromadb_client.py   # ChromaDB wrapper with filtering
└── README.md            # This file
```

## Development

The server runs with auto-reload enabled during development. Any changes to Python files will automatically restart the server.

## CORS Configuration

The backend allows requests from:
- http://localhost:3000
- http://localhost:3001
- http://127.0.0.1:3000
- http://127.0.0.1:3001

To add more origins, edit `main.py`.
