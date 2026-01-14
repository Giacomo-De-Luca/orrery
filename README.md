# Embedding Analysis Platform

A comprehensive toolkit for analyzing and visualizing semantic embeddings using state-of-the-art embedding models and interactive visualization tools. Supports WordNet (153,724 English definitions) and any HuggingFace text dataset.

## Overview

This project combines multiple components to provide a complete workflow for exploring word embeddings:

1. **WordNet Embedding Pipeline** - Parse and embed English WordNet definitions
2. **HuggingFace Dataset Support** - Embed any text dataset from HuggingFace Hub
3. **Local File Support** - Embed from parquet, JSON, or CSV files
4. **Multi-Modal Embedding** - Support for text, images, and pre-computed vectors
5. **Interactive Web Visualization** - Explore embeddings in 2D/3D with advanced clustering
6. **Dimension Analysis Tools** - Understand what semantic features embeddings capture
7. **GraphQL API** - Query embeddings with semantic search capabilities

## Quick Start

```bash
# 1. Install dependencies
uv sync

# 2. Create embeddings (one-time, ~8 minutes)
cd interpretability
uv run python embed_wordnet.py

# 3. Start web visualization
cd embedding_visualization
npm install
npm run dev
# Visit http://localhost:3000

# 4. (Optional) Start GraphQL backend
./start_backend.sh
# Visit http://localhost:8000/graphql
```

## Project Structure

### `/interpretability/` - Core Embedding Pipeline

The heart of the project: WordNet parsing, embedding generation, and analysis tools.

**Key Features:**
- Parse 153,724 words from English WordNet 2024
- Generate 384-dimensional embeddings using sentence-transformers
- ChromaDB vector database for semantic search
- Dimension analysis tools to understand embedding structure
- GraphQL API backend for web applications

**Quick Commands:**
```bash
cd interpretability

# Create embeddings (run once)
uv run python embed_wordnet.py

# Semantic search
uv run python test/query_wordnet.py "small furry animal"

# Analyze embedding dimensions
uv run python analyze_dimension.py 42

# Start backend API
uv run uvicorn backend.main:app --reload
```

See [interpretability/README.md](interpretability/README.md) for detailed documentation.

### `/embedding_visualization/` - Interactive Web Visualization

Modern Next.js web application for exploring any embedding collection with 2D/3D visualization, clustering, and real-time search.

**Key Features:**
- Interactive 2D and 3D scatter plots (tested with 153k+ points)
- PCA and UMAP dimensionality reduction
- Density-based clustering with automatic labeling
- Flexible category coloring (auto-detects category fields)
- User-selectable color-by field
- Real-time semantic search
- GraphQL integration with ChromaDB
- Works with any embedding data source

**Quick Commands:**
```bash
cd embedding_visualization

# Development server
npm run dev

# Production build
npm run build
npm start
```

See [embedding_visualization/README.md](embedding_visualization/README.md) for detailed documentation.

### `/embedding-atlas/` - Reusable Visualization Framework

Apple's general-purpose embedding visualization toolkit (external package, included as reference).

**Features:**
- WebGPU-accelerated rendering
- Automatic clustering and labeling
- Kernel density estimation
- Works with any embedding dataset
- Available as Python CLI, Jupyter widget, or Streamlit component

**Note:** This is a published npm/PyPI package used as a reference implementation. The WordNet visualization uses some concepts and WASM modules from this project.

### `/tensorboard/` - TensorFlow Embedding Projector

TensorFlow's visualization tools, included for reference. The project focuses on the embedding projector component.

**Note:** Used primarily as a reference for embedding visualization techniques.

## Data Flow

```
Data Sources:
├── WordNet XML (153k words)
├── HuggingFace Datasets (any text dataset)
├── Local Files (parquet, JSON, CSV)
└── Image Datasets
    ↓
Embedding Models:
├── Text: all-MiniLM-L6-v2 (384D)
├── Image: google/vit-base-patch16-384 (768D)
└── Vector: Pre-computed embeddings (any dimension)
    ↓
ChromaDB Vector Database
    ↓
GraphQL API (FastAPI + Strawberry)
    ↓
┌─────────────┬──────────────┬────────────────┐
│   Web UI    │  CLI Tools   │   Jupyter      │
│  (Next.js)  │  (Python)    │   Notebooks    │
└─────────────┴──────────────┴────────────────┘
```

## Key Technologies

**Backend (Python):**
- ChromaDB - Vector database
- sentence-transformers - Embedding model (all-MiniLM-L6-v2)
- FastAPI + Strawberry - GraphQL API
- scikit-learn & UMAP - Dimensionality reduction

**Frontend (TypeScript/React):**
- Next.js 15 - React framework
- Plotly.js - Interactive visualizations
- WebAssembly - High-performance clustering
- Shadcn UI - Accessible component library

## Common Workflows

### Workflow 1: First-Time Setup
```bash
# 1. Install dependencies
uv sync

# 2. Create embeddings
cd interpretability
uv run python embed_wordnet.py  # ~8 minutes

# 3. Test semantic search
uv run python test/query_wordnet.py "feeling of happiness"

# 4. Start web visualization
cd ../embedding_visualization
npm install
npm run dev
```

### Workflow 2: Dimension Analysis
```bash
cd interpretability

# Analyze random dimension
uv run python analyze_dimension.py

# Analyze specific dimension
uv run python analyze_dimension.py 42

# 2D analysis in Jupyter
uv run jupyter notebook
# Open: two_dimension_analysis.ipynb
```

### Workflow 3: Full Stack Development
```bash
# Terminal 1: Backend API
cd interpretability
uv run uvicorn backend.main:app --reload

# Terminal 2: Frontend
cd embedding_visualization
npm run dev

# Visit:
# - Frontend: http://localhost:3000
# - GraphQL: http://localhost:8000/graphql
```

## Performance

| Operation | Time | Hardware |
|-----------|------|----------|
| Parse WordNet | ~30 sec | CPU |
| Create embeddings | ~8 min | M1/M2 Mac (MPS) |
| Semantic search | <100 ms | - |
| Web visualization load | ~1-2 sec | - |
| Clustering (150k points) | ~500 ms | WASM |

## Data Summary

| Metric | Value |
|--------|-------|
| Total words | 153,724 |
| Total synsets | 120,630 |
| Embedding dimensions | 384 |
| Model | all-MiniLM-L6-v2 |
| Database size | ~200-300 MB |

## Documentation

- **Main Project CLAUDE.md** - AI assistant instructions for the entire project
- **[interpretability/README.md](interpretability/README.md)** - Embedding pipeline documentation
- **[interpretability/CLAUDE.md](interpretability/CLAUDE.md)** - AI assistant instructions for backend
- **[embedding_visualization/README.md](embedding_visualization/README.md)** - Web app documentation
- **[embedding_visualization/CLAUDE.md](embedding_visualization/CLAUDE.md)** - AI assistant instructions for frontend

## API Reference

### GraphQL API

The backend provides a GraphQL API for querying embeddings and embedding HuggingFace datasets:

```graphql
# Semantic search (returns flexible metadata)
query {
  semanticSearch(
    collectionName: "wordnet_definitions_simple"
    query: "small furry animal"
    nResults: 10
  ) {
    id
    document
    similarity
    metadata  # Contains all item-specific fields (word, pos, definition, etc.)
  }
}

# Get HuggingFace dataset info
query {
  huggingfaceDatasetInfo(datasetId: "squad") {
    configs {
      name
      splits { name numRows }
      features { name dtype }
    }
  }
}

# Preview dataset rows
query {
  huggingfaceDatasetPreview(datasetId: "squad", split: "train", nRows: 5) {
    columns
    rows
  }
}

# Embed a HuggingFace dataset
mutation {
  embedHuggingfaceDataset(input: {
    datasetId: "squad"
    collectionName: "squad_questions"
    columns: ["question", "context"]
    portion: { strategy: FIRST_N, n: 1000 }
    computeProjections: true
  }) {
    totalEmbedded
    projectionsComputed
    error
  }
}
```

Visit http://localhost:8000/graphql for the interactive playground.

### Python API

```python
from interpretability.utils.utils import setup_collection

# Connect to ChromaDB
collection = setup_collection()

# Semantic search
results = collection.query(
    query_texts=["feeling of happiness"],
    n_results=10
)

# Access results (metadata fields vary by collection)
for i, meta in enumerate(results['metadatas'][0]):
    doc = results['documents'][0][i]
    print(f"{results['ids'][0][i]}: {doc}")
    # Access any metadata fields: meta.get('word'), meta.get('category'), etc.
```

## Example Use Cases

1. **Semantic Dictionary** - Natural language search for word definitions
2. **Dimension Interpretability** - Discover what features embeddings capture
3. **Vocabulary Analysis** - Visualize how words cluster by meaning
4. **Educational Tool** - Interactive exploration of semantic relationships
5. **Research Platform** - Study embedding model behavior
6. **Dataset Exploration** - Embed and visualize any HuggingFace text dataset
7. **Image Analysis** - Explore image datasets with ViT embeddings
8. **Custom Embeddings** - Visualize pre-computed embeddings from any source

## Troubleshooting

### Common Issues

**ChromaDB collection not found:**
```bash
cd interpretability
uv run python embed_wordnet.py
```

**Port already in use:**
```bash
# Frontend (default: 3000)
cd embedding_visualization
npm run dev -- -p 3001

# Backend (default: 8000)
cd interpretability
uv run uvicorn backend.main:app --port 8001
```

**GPU not detected:**
```bash
# Check MPS (Apple Silicon)
python -c "import torch; print(torch.backends.mps.is_available())"

# Check CUDA (NVIDIA)
python -c "import torch; print(torch.cuda.is_available())"
```

## Requirements

- Python 3.12+
- Node.js 18+
- uv package manager (Python)
- npm (Node.js)
- ~2GB RAM minimum
- GPU recommended (MPS/CUDA) but not required

## License

This project uses:
- **English WordNet 2024** - CC BY 4.0
- **all-MiniLM-L6-v2** - Apache 2.0
- **embedding-atlas** - MIT License (Apple)

## Contributing

This is a research and educational project. Feel free to:
- Extend analysis tools
- Add new visualizations
- Integrate different embedding models
- Build applications on top of the API

## References

- **English WordNet**: https://en-word.net/
- **Sentence Transformers**: https://www.sbert.net/
- **ChromaDB**: https://www.trychroma.com/
- **HuggingFace Datasets**: https://huggingface.co/datasets
- **Embedding Atlas**: https://github.com/apple/embedding-atlas
- **TensorBoard Projector**: https://projector.tensorflow.org/

---

**Ready to start?** Follow the Quick Start guide above or explore individual component documentation.
