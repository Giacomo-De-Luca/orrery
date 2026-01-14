# Embedding Visualization

Interactive web application for exploring any embedding collection in 2D/3D with clustering, semantic search, and real-time filtering. Supports flexible metadata with automatic field detection.

## Quick Start

```bash
# Install and run
npm install
npm run dev

# Open http://localhost:3000
```

## Features

- **2D/3D Visualization** - Interactive scatter plots with 150k+ points (WebGL)
- **PCA & UMAP** - Multiple dimensionality reduction methods
- **Density Clustering** - Automatic semantic region detection with c-TF-IDF labels
- **Flexible Category Coloring** - Auto-detects category fields, user-selectable
- **Color Presets** - Built-in palettes for known types (e.g., POS) + dynamic colors
- **Unified Search** - Text search with auto-select, semantic search, and results list
- **Multiple Distance Metrics** - Cosine, Euclidean (L2), Inner Product for similarity search
- **GraphQL Integration** - Semantic search via backend API
- **Any Data Source** - Works with any embedding collection in ChromaDB
- **Dataset Embedding** - Embed HuggingFace datasets or local files directly from the UI
- **Multiple Embedding Providers** - SentenceTransformers, OpenAI, Cohere, Ollama, HuggingFace API

## User Interface

### Visualization Controls (Left Sidebar)

- **Projection Method**: PCA (linear) or UMAP (non-linear)
- **Dimensions**: 2D or 3D
- **Color By**: None or Category (auto-detected from metadata)
- **Category Field**: Select which metadata field to use for coloring
- **Distance Metric**: Cosine Similarity, Euclidean (L2), or Inner Product
- **Search**: Text filter with auto-select and results list

### Search Workflow

The sidebar search provides a unified experience:

1. **Type to filter** - Local text matching highlights points instantly
2. **Auto-select** - First matching item is automatically selected
3. **Semantic search** - Selection triggers similarity search via GraphQL
4. **Results list** - All text matches shown in scrollable sidebar list
5. **Click to switch** - Select different items from the list to explore

This creates a powerful workflow: narrow down with text → explore semantically similar items.

### Density Clustering (2D Only)

1. Switch to 2D mode
2. Click "Show Clusters" button
3. View cluster boundaries (dotted lines) and labels
4. Each cluster colored by dominant category

### Mouse Controls

**2D**: Click-drag to pan, scroll to zoom, click point to select, lasso/box select tools available
**3D**: Drag to rotate, right-drag to pan, scroll to zoom, click point to select

### Resizable Layout

The dashboard features resizable panels:
- **Horizontal**: Plot area and legend (when category coloring is active)
- **Vertical**: Visualization and search results table (when results are shown)

Drag panel edges to resize. Plot view state (zoom/camera) is preserved during resize.

## Architecture

```
app/
├── components/
│   ├── DashboardPanel.tsx        # Main dashboard with resizable panels
│   ├── ScatterPlot2D.tsx         # 2D visualization + clustering (responsive)
│   ├── ScatterPlot3D.tsx         # 3D visualization (responsive)
│   ├── VisualizationPanel.tsx    # Legacy panel wrapper
│   ├── Legend.tsx                # Category color legend
│   ├── SimilarItemsTable.tsx     # Semantic search results table
│   ├── TextSearchResultsList.tsx # Text search matches list (sidebar)
│   └── EmbeddingSidebar.tsx      # Controls sidebar
├── page.tsx                      # Main app (search orchestration)
└── layout.tsx

lib/
├── density-clustering/           # WASM clustering (from embedding-atlas)
├── hooks/
│   ├── useContainerDimensions.ts # Responsive sizing hook
│   ├── useEmbeddingData.ts       # Data loading
│   ├── useDensityClustering.ts   # Clustering logic
│   └── useEmbedDataset.ts        # Dataset embedding operations
├── utils/                        # Clustering & labeling utilities
└── graphql/
    ├── queries.ts                # GraphQL queries
    └── mutations.ts              # Embedding mutations & types

public/data/
├── collections.json              # Collection metadata
└── wordnet_definitions.json      # Pre-computed projections (47MB)
```

## Technologies

- **Next.js 15** - React framework
- **Plotly.js** - Interactive plots (WebGL)
- **WebAssembly** - High-performance clustering (Rust → WASM)
- **react-resizable-panels** - Resizable dashboard layout
- **Shadcn UI** - Accessible components
- **Apollo Client** - GraphQL integration
- **Tailwind CSS** - Styling

## Full Stack Setup (with Backend)

```bash
# Terminal 1: Backend
cd ../interpretability
uv run uvicorn backend.main:app --reload

# Terminal 2: Frontend
npm run dev

# Access:
# - Frontend: http://localhost:3000
# - GraphQL: http://localhost:8000/graphql
```

## Customization

### Clustering Parameters

Edit `VisualizationPanel.tsx`:

```typescript
const { boundaries, labels } = useDensityClusters(points2d, {
  gridWidth: 200,        // Density resolution (100-400)
  kernelRadius: 3,       // Gaussian smoothing (2-5)
  unionThreshold: 10,    // Merge distance (5-20)
  minClusterSize: 50,    // Min points (20-100)
  topKeywords: 4,        // Keywords per label (1-10)
});
```

### Color Scheme

Colors are managed in `lib/categoryColors.ts`:
- **Presets**: Built-in palettes for known category types (e.g., POS colors)
- **Dynamic**: Automatic color generation for unknown categories
- Edit `POS_PRESET` for Part of Speech colors or add new presets

## Performance

- **Load**: ~1-2 sec for 47MB JSON
- **Render**: 153k points @ 60fps (WebGL)
- **Clustering**: ~500ms (WASM)
- **Memory**: ~500MB browser

## Embedding Datasets

The application supports embedding datasets directly from the frontend via GraphQL mutations.

### Test Page

Visit `/test-embed` to test the embedding functionality:
- Fetch HuggingFace dataset info and preview
- Load local files (parquet, JSON, CSV)
- Select embedding provider and model
- Embed datasets into ChromaDB collections

### Supported Embedding Providers

| Provider | Example Models | API Key Required |
|----------|---------------|------------------|
| SentenceTransformers | `all-MiniLM-L6-v2`, `all-mpnet-base-v2` | No (local) |
| OpenAI | `text-embedding-3-small`, `text-embedding-3-large` | Yes (`CHROMA_OPENAI_API_KEY`) |
| Cohere | `embed-english-v3.0`, `embed-multilingual-v3.0` | Yes (`CHROMA_COHERE_API_KEY`) |
| Ollama | `nomic-embed-text`, `mxbai-embed-large` | No (local) |
| HuggingFace API | `sentence-transformers/all-MiniLM-L6-v2` | Yes (`CHROMA_HUGGINGFACE_API_KEY`) |

### Using the Hook

```typescript
import { useEmbedDataset } from '@/lib/hooks/useEmbedDataset';

function MyComponent() {
  const {
    fetchHFDatasetInfo,
    fetchHFDatasetPreview,
    embedHFDataset,
    embedLoading,
    error,
  } = useEmbedDataset();

  const handleEmbed = async () => {
    const result = await embedHFDataset({
      datasetId: 'squad',
      collectionName: 'my_collection',
      columns: ['question'],
      embeddingModel: {
        provider: 'SENTENCE_TRANSFORMERS',
        modelName: 'all-MiniLM-L6-v2',
      },
      computeProjections: true,
    });
    console.log(`Embedded ${result?.totalEmbedded} items`);
  };
}
```

## Troubleshooting

**Error Loading Data**: Ensure backend is running or data files exist in `public/data/`

**Clusters Not Showing**: Must be in 2D mode, click "Show Clusters"

**Slow Performance**: Try 2D, disable POS coloring, clear browser cache

**Port In Use**: `npm run dev -- -p 3001`

## Related Documentation

- **Parent Project**: [../README.md](../README.md)
- **AI Instructions**: [CLAUDE.md](CLAUDE.md)
- **Backend**: [../interpretability/README.md](../interpretability/README.md)
- **GraphQL API**: [../interpretability/backend/README.md](../interpretability/backend/README.md)

## Credits

- Clustering: Apple's embedding-atlas (WASM)
- c-TF-IDF: Grootendorst, 2022
- WordNet: English WordNet 2024 (CC BY 4.0)
- Model: sentence-transformers (all-MiniLM-L6-v2)
