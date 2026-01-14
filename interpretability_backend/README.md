# WordNet Embedding Analysis Suite

A complete toolkit for parsing, embedding, querying, and analyzing English WordNet definitions using vector embeddings.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Core Components](#core-components)
4. [Installation & Setup](#installation--setup)
5. [Usage Guide](#usage-guide)
6. [API Reference](#api-reference)
7. [Analysis Tools](#analysis-tools)
8. [Technical Details](#technical-details)
9. [Troubleshooting](#troubleshooting)
10. [Examples & Use Cases](#examples--use-cases)

---

## Overview

### What This Does

This project provides a complete pipeline for working with English WordNet:

1. **Parse WordNet** - Access 153,724 English words with definitions and semantic relationships
2. **Create Embeddings** - Convert definitions to 384D vectors using sentence transformers
3. **Semantic Search** - Natural language queries to find words by meaning
4. **Dimension Analysis** - Explore what semantic features each dimension captures
5. **2D Visualization** - Plot words across dimension pairs to discover patterns

### Data Summary

| Metric | Value |
|--------|-------|
| Total words | 153,724 |
| Total synsets | 120,630 |
| Total senses | 212,478 |
| Embedding dimensions | 384 |
| Embedding model | all-MiniLM-L6-v2 |
| Database size | ~200-300 MB |

### Performance

| Operation | Time | Device |
|-----------|------|--------|
| Parse WordNet | ~30 sec | CPU |
| Embed all words | ~8 min | MPS (M1/M2) |
| Query database | <100 ms | - |
| Single dimension analysis | ~30 sec | - |
| 2D notebook (full) | ~1 min | - |

---

## Quick Start

### 1. Install Dependencies
```bash
uv sync
```

### 2. Explore WordNet (Optional)
```bash
# See what's available
uv run python interpretability/test/example_usage.py
uv run python interpretability/test/synset_examples.py
```

### 3. Create Embeddings (Required once, ~8 min)
```bash
uv run python interpretability/embed_wordnet.py
```

This will:
- Parse 153,724 words from WordNet
- Extract first definition for each word
- Embed using `all-MiniLM-L6-v2` model (384 dimensions)
- Store vectors in ChromaDB persistent database at `interpretability/resources/vector_db/`
- Use MPS acceleration on Apple Silicon (or CUDA/CPU)

### 4. Start Exploring!

**Semantic Search:**
```bash
# Command line query
uv run python interpretability/test/query_wordnet.py "a small furry animal that meows"

# Interactive mode
uv run python interpretability/test/query_wordnet.py
```

**Analyze Single Dimension:**
```bash
# Random dimension
uv run python interpretability/analyze_dimension.py

# Specific dimension (0-383)
uv run python interpretability/analyze_dimension.py 42
```

**2D Dimension Analysis:**
```bash
uv run jupyter notebook
# Open interpretability/two_dimension_analysis.ipynb
```

---

## Core Components

### 1. WordNet Parser

Parse and navigate the English WordNet database with 153,724 words, 120,630 synsets, and 212,478 senses.

**Features:**
- Word lookups with definitions and examples
- Synonym discovery
- Hypernym/hyponym navigation (general/specific concepts)
- Semantic relationship exploration
- Chain traversal (e.g., dog → canid → carnivore → mammal)

**Quick Example:**
```python
from interpretability.utils.wordnet_parser import WordNetParser

wn = WordNetParser('interpretability/resources/english-wordnet-2024.xml')
wn.parse()  # Takes ~30 seconds

# Get all words
all_words = wn.get_all_words()  # 153,724 words

# Look up definitions
defs = wn.get_definitions('run')
for d in defs[:3]:
    print(f"[{d['part_of_speech']}] {d['definition']}")
    for ex in d['examples']:
        print(f"  Example: {ex}")

# Find synonyms
synonyms = wn.get_synonyms('happy')
# ['felicitous', 'glad', 'well-chosen']

# Navigate semantic relationships
dog_synsets = wn.get_synsets_for_word('dog')
hypernyms = wn.get_hypernyms(dog_synsets[0].id)
for h in hypernyms:
    words = wn.get_words_in_synset(h.id)
    print(f"{words}: {h.definition}")
```

### 2. Embedding Pipeline

Convert WordNet definitions into searchable vector embeddings.

**What it does:**
- Processes all 153,724 words
- Extracts first definition for each word
- Embeds using `all-MiniLM-L6-v2` model
- Stores in ChromaDB persistent database
- Uses MPS acceleration (Apple Silicon) or CUDA/CPU

**Create embeddings:**
```bash
uv run python interpretability/embed_wordnet.py
```

**Performance:**
- Processing: ~1000 words per batch
- Time: ~5-15 minutes (depending on hardware)
- Database size: ~200-300 MB
- Device: MPS (Apple Silicon), CUDA (NVIDIA), or CPU

### 3. Semantic Search

Query the vector database using natural language to find words by meaning, not just keywords.

**Command Line:**
```bash
uv run python interpretability/test/query_wordnet.py "a small furry animal that meows"
```

**Interactive Mode:**
```bash
uv run python interpretability/test/query_wordnet.py
```

Commands:
- Type any natural language query to search
- `examples` - Toggle showing usage examples
- `quit` or `exit` - Exit the program

**Example Queries:**
```bash
uv run python interpretability/test/query_wordnet.py "feeling of great happiness"
# Returns: joy, elation, euphoria, bliss...

uv run python interpretability/test/query_wordnet.py "large gray animal with trunk"
# Returns: elephant, mammoth, pachyderm...

uv run python interpretability/test/query_wordnet.py "very smart person"
# Returns: genius, intellectual, scholar, savant...
```

**Programmatic Usage:**
```python
import chromadb
from chromadb.utils import embedding_functions

# Initialize client
client = chromadb.PersistentClient(path="interpretability/resources/vector_db")

# Setup embedding function
ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2",
    device="mps"  # or "cuda" or "cpu"
)

# Get collection
collection = client.get_collection(
    name="wordnet_definitions",
    embedding_function=ef
)

# Query
results = collection.query(
    query_texts=["feeling of great happiness"],
    n_results=10
)

# Access results
for i, meta in enumerate(results['metadatas'][0]):
    similarity = 1 - results['distances'][0][i]
    print(f"{meta['word']}: {similarity:.3f}")
```

### 4. Dimension Analysis

Analyze individual dimensions of the 384-dimensional embeddings to understand what semantic features they capture.

**Analyze random dimension:**
```bash
uv run python interpretability/analyze_dimension.py
```

**Analyze specific dimension:**
```bash
uv run python interpretability/analyze_dimension.py 42
```

**Output:**
- Statistics (mean, std, min, max)
- 10 words with lowest values
- 10 words with highest values
- Visualization saved as `interpretability/results/dimension_N_analysis.png`

**What dimensions might capture:**
- **Abstract vs. Concrete** - Ideas vs. physical objects
- **Positive vs. Negative** - Emotional valence
- **Animate vs. Inanimate** - Living vs. non-living things
- **Size** - Large vs. small objects
- **Time** - Past vs. future
- **Complexity** - Simple vs. complex concepts

### 5. Two-Dimension Visualization

Visualize how words are distributed across two embedding dimensions simultaneously using Jupyter notebooks.

**Start the notebook:**
```bash
uv run jupyter notebook
# Open interpretability/two_dimension_analysis.ipynb
```

**What you get:**
1. **2D Scatter Plot** - See how words cluster in 2D space
2. **Labeled Extremes** - Top N words on both dimensions labeled
3. **Density Heatmap** - Where words concentrate
4. **Quadrant Analysis** - Words grouped by high/low on each dimension
5. **Interactive Exploration** - Easy function to try different dimension pairs

**Quick plotting:**
```python
# Try different dimension pairs
quick_plot(0, 1)     # Dimensions 0 vs 1
quick_plot(10, 20)   # Dimensions 10 vs 20
quick_plot(42, 100)  # Dimensions 42 vs 100
```

---

## Installation & Setup

### Dependencies

Install all required packages:
```bash
uv sync
```

**Core dependencies:**
- `chromadb>=1.3.4` - Vector database
- `sentence-transformers>=5.1.2` - Embeddings
- `torch` - ML framework
- `matplotlib>=3.8.0` - Plotting
- `tqdm>=4.66.0` - Progress bars
- `jupyter>=1.0.0` - Notebook interface
- `scipy>=1.11.0` - Statistical functions

### Required Files

- `interpretability/resources/english-wordnet-2024.xml` - WordNet data file
- `interpretability/utils/wordnet_parser.py` - Parser module
- `interpretability/embed_wordnet.py` - Embedding script
- `interpretability/test/query_wordnet.py` - Query interface
- `interpretability/analyze_dimension.py` - Dimension analysis
- `interpretability/two_dimension_analysis.ipynb` - 2D visualization notebook

### Generated Files

After running the pipeline:
```
Embedding/
└── interpretability/
    ├── resources/
    │   └── vector_db/              # ChromaDB database (after embed_wordnet.py)
    │       ├── chroma.sqlite3
    │       └── [collection data]
    └── results/
        ├── dimension_N_analysis.png    # 1D analysis plots
        ├── two_dim_analysis_X_vs_Y.png # 2D scatter plots
        └── two_dim_density_X_vs_Y.png  # Density heatmaps
```

---

## Usage Guide

### Complete Workflow

**Step 1: Explore WordNet Structure (Optional)**
```bash
uv run python interpretability/test/example_usage.py
uv run python interpretability/test/synset_examples.py
```

**Step 2: Create Embeddings (Required once)**
```bash
uv run python interpretability/embed_wordnet.py
```

**Step 3: Query Semantically**
```bash
uv run python interpretability/test/query_wordnet.py "your query"
uv run python interpretability/test/query_wordnet.py  # interactive
```

**Step 4: Analyze Dimensions**
```bash
uv run python interpretability/analyze_dimension.py  # random
uv run python interpretability/analyze_dimension.py 42  # specific
```

**Step 5: 2D Analysis**
```bash
uv run jupyter notebook
# Open interpretability/two_dimension_analysis.ipynb
```

### Example Workflows

#### Workflow A: Quick Semantic Search
```bash
# 1. Create embeddings (once)
uv run python interpretability/embed_wordnet.py

# 2. Query
uv run python interpretability/test/query_wordnet.py
> feeling of great joy
> vehicle with two wheels
> computer programming language
```

#### Workflow B: Dimension Exploration
```bash
# 1. Analyze random dimensions
uv run python interpretability/analyze_dimension.py

# 2. Analyze specific dimension
uv run python interpretability/analyze_dimension.py 42

# 3. Compare dimension pairs in notebook
uv run jupyter notebook
# Open interpretability/two_dimension_analysis.ipynb
```

#### Workflow C: Research
```bash
# 1. Parse WordNet
uv run python interpretability/test/synset_examples.py

# 2. Create embeddings
uv run python interpretability/embed_wordnet.py

# 3. Systematic dimension analysis
for i in {0..50}; do
    uv run python interpretability/analyze_dimension.py $i
done

# 4. 2D analysis of interesting pairs
# Use notebook to visualize
```

---

## API Reference

### Word-Level Methods

#### `get_all_words()` → List[str]
Returns a sorted list of all unique words in WordNet.

```python
words = wn.get_all_words()
# ['hood', "'s Gravenhage", ..., 'zymurgy']
```

#### `get_definitions(word: str)` → List[Dict]
Returns all definitions for a word with their examples.

```python
defs = wn.get_definitions('bank')
# [
#   {
#     'sense_number': 1,
#     'part_of_speech': 'n',
#     'definition': 'sloping land (especially the slope beside a body of water)',
#     'examples': ['they pulled the canoe up on the bank']
#   },
#   ...
# ]
```

#### `get_word(word: str)` → List[Word]
Returns detailed Word objects for all parts of speech.

```python
word_entries = wn.get_word('run')
for entry in word_entries:
    print(f"{entry.word} ({entry.part_of_speech})")
    for sense in entry.senses:
        print(f"  - {sense.definition}")
```

#### `search_words(prefix: str)` → List[str]
Find all words starting with a given prefix.

```python
comp_words = wn.search_words('comp')
# ['comp', 'compact', 'compact car', ..., 'compulsion']
```

#### `get_stats()` → Dict
Get statistics about WordNet.

```python
stats = wn.get_stats()
# {
#   'total_words': 153724,
#   'total_synsets': 120630,
#   'total_senses': 212478
# }
```

### Synset Methods

#### `get_synset(synset_id: str)` → Optional[Synset]
Get a specific synset by its ID.

```python
synset = wn.get_synset('oewn-02086723-n')
# Returns Synset object with definition, examples, relations
```

#### `get_synsets_for_word(word: str)` → List[Synset]
Get all synsets (senses) for a given word.

```python
dog_synsets = wn.get_synsets_for_word('dog')
for synset in dog_synsets:
    print(f"{synset.definition}")
    print(f"  Examples: {synset.examples}")
```

#### `get_synonyms(word: str, sense_number: Optional[int])` → List[str]
Get synonyms for a word. Optionally filter by specific sense number.

```python
# All synonyms across all senses
synonyms = wn.get_synonyms('happy')
# ['felicitous', 'glad', 'well-chosen']

# Synonyms for a specific sense (1-indexed)
synonyms = wn.get_synonyms('happy', sense_number=2)
# ['felicitous']
```

#### `get_words_in_synset(synset_id: str)` → List[str]
Get all words that belong to a synset.

```python
words = wn.get_words_in_synset('oewn-02086723-n')
# ['Canis familiaris', 'dog', 'domestic dog']
```

### Relationship Navigation Methods

#### `get_related_synsets(synset_id: str, relation_type: Optional[str])` → List[Synset]
Get synsets related by a specific relationship type.

```python
# Get all related synsets
related = wn.get_related_synsets('oewn-02086723-n')

# Get only hypernyms
hypernyms = wn.get_related_synsets('oewn-02086723-n', 'hypernym')
```

#### `get_hypernyms(synset_id: str)` → List[Synset]
Get hypernyms (more general concepts) for a synset.

```python
hypernyms = wn.get_hypernyms('oewn-02086723-n')  # dog
# Returns: canid, domestic animal
```

#### `get_hyponyms(synset_id: str)` → List[Synset]
Get hyponyms (more specific concepts) for a synset.

```python
hyponyms = wn.get_hyponyms('oewn-02086723-n')  # dog
# Returns: puppy, hunting dog, working dog, etc.
```

#### `get_relation_types(synset_id: str)` → List[str]
Get all available relation types for a synset.

```python
rel_types = wn.get_relation_types('oewn-02086723-n')
# ['hypernym', 'hyponym', 'holo_member', 'mero_part']
```

#### `explore_synset_chain(synset_id: str, relation_type: str, max_depth: int)` → List[List[Synset]]
Explore chains of synset relationships up to a certain depth.

```python
# Explore hypernym chain from 'cat' -> 'feline' -> 'carnivore' -> ...
cat_synsets = wn.get_synsets_for_word('cat')
chains = wn.explore_synset_chain(cat_synsets[0].id, 'hypernym', max_depth=5)

for chain in chains:
    for synset in chain:
        words = wn.get_words_in_synset(synset.id)
        print(f"{words[0]}: {synset.definition}")
```

### Data Structures

**Word**
- `word`: str - The word form
- `part_of_speech`: str - Part of speech (n, v, a, r, s)
- `senses`: List[Sense] - All senses/meanings

**Sense**
- `synset_id`: str - Reference to synset
- `definition`: str - The definition
- `part_of_speech`: str - Part of speech
- `examples`: List[str] - Usage examples

**Synset**
- `id`: str - Unique synset identifier
- `definition`: str - The definition
- `part_of_speech`: str - Part of speech
- `examples`: List[str] - Usage examples
- `members`: List[str] - Member words
- `relations`: List[SynsetRelation] - Relationships to other synsets

**SynsetRelation**
- `relation_type`: str - Type of relationship
- `target_synset_id`: str - ID of the related synset

### Part of Speech Codes

- `n` - noun
- `v` - verb
- `a` - adjective
- `r` - adverb
- `s` - adjective satellite

### Relation Types

**Hierarchical Relations:**
- `hypernym` - More general concept (e.g., "animal" is hypernym of "dog")
- `hyponym` - More specific concept (e.g., "puppy" is hyponym of "dog")
- `instance_hyponym` - Specific instance (e.g., "Paris" is instance of "capital")

**Part-Whole Relations:**
- `holonym` / `holo_member` / `holo_part` - The whole
- `meronym` / `mero_member` / `mero_part` / `mero_substance` - The part

**Other Relations:**
- `similar` - Similar in meaning
- `also` - See also
- `attribute` - Attribute relationship
- `entails` - One action entails another
- `is_entailed_by` - Reverse of entails
- `causes` - Causal relationship
- `is_caused_by` - Reverse of causes
- `domain_topic` - Topic domain
- `pertainym` - Pertaining to (adjectives to nouns)

---

## Analysis Tools

### Single Dimension Analysis

Analyze individual dimensions to discover what semantic features they capture.

**Usage:**
```bash
# Random dimension
uv run python interpretability/analyze_dimension.py

# Specific dimension
uv run python interpretability/analyze_dimension.py 42
```

**Output:**
```
Dimension 42 statistics:
  Mean: 0.0234
  Std: 0.1456
  Min: -0.8923
  Max: 0.9145

Lowest 10 words:
 1. abstract              : -0.892341
 2. theoretical           : -0.845623
 3. conceptual            : -0.823456

Highest 10 words:
 1. concrete              : +0.914532
 2. physical              : +0.897654
 3. tangible              : +0.876543
```

**Visualization:** Saved as `interpretability/results/dimension_N_analysis.png`

**Programmatic Usage:**
```python
from interpretability.analyze_dimension import setup_collection, get_all_embeddings
import numpy as np

# Load embeddings
collection, device = setup_collection()
words, embeddings = get_all_embeddings(collection)

# Analyze dimension 42
dimension = 42
dimension_values = embeddings[:, dimension]

# Find extremes
sorted_indices = np.argsort(dimension_values)
bottom_10 = [(words[i], dimension_values[i]) for i in sorted_indices[:10]]
top_10 = [(words[i], dimension_values[i]) for i in sorted_indices[-10:][::-1]]

print("Lowest:", bottom_10)
print("Highest:", top_10)
```

### Two-Dimension Visualization

Explore how words cluster in 2D space using the Jupyter notebook.

**Start notebook:**
```bash
uv run jupyter notebook
# Open interpretability/two_dimension_analysis.ipynb
```

**Features:**
- 2D scatter plot with labeled extremes
- Density heatmap
- Quadrant analysis
- Correlation statistics
- Interactive exploration

**Quick exploration:**
```python
# In the notebook
quick_plot(0, 1)     # Dimensions 0 vs 1
quick_plot(10, 20)   # Dimensions 10 vs 20
quick_plot(42, 100)  # Dimensions 42 vs 100
```

**Configuration:**
```python
# Modify these in the notebook
dim_x = 10          # X-axis dimension
dim_y = 50          # Y-axis dimension
top_n = 20          # Number of labeled extremes
sample_size = 10000 # Words to plot (or None for all)
```

### Advanced Analysis

**Find most informative dimensions:**
```python
import numpy as np

# Calculate variance for each dimension
variances = np.var(embeddings, axis=0)

# Dimensions with high variance are more informative
informative_dims = np.argsort(variances)[-20:][::-1]

print("Top 20 most informative dimensions:")
for i, dim in enumerate(informative_dims, 1):
    print(f"{i:2d}. Dimension {dim:3d}: variance = {variances[dim]:.4f}")
```

**Create semantic axes:**
```python
def get_semantic_axis(word1, word2, collection):
    """Get the direction from word1 to word2 in embedding space."""
    result1 = collection.get(ids=[word1], include=['embeddings'])
    result2 = collection.get(ids=[word2], include=['embeddings'])

    emb1 = np.array(result1['embeddings'][0])
    emb2 = np.array(result2['embeddings'][0])

    # Direction vector (normalized)
    axis = (emb2 - emb1) / np.linalg.norm(emb2 - emb1)
    return axis

# Example: happy-sad axis
axis = get_semantic_axis('happy', 'sad', collection)

# Project all words onto this axis
projections = embeddings @ axis

# Find extremes
sorted_idx = np.argsort(projections)
print("Most 'happy' words:", [words[i] for i in sorted_idx[-10:][::-1]])
print("Most 'sad' words:", [words[i] for i in sorted_idx[:10]])
```

---

## Technical Details

### Embedding Model

- **Model**: `all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Speed**: ~1000 embeddings/second on M1/M2
- **Quality**: Good balance of speed and accuracy
- **Source**: sentence-transformers library

### Vector Database

- **Database**: ChromaDB
- **Storage**: Persistent (survives restarts)
- **Location**: `vector_db/` directory
- **Format**: SQLite + HNSW index
- **Features**: Fast similarity search, metadata filtering

### Distance Metric

- **Metric**: Cosine similarity (default for sentence-transformers)
- **Range**: 0 (identical) to 2 (opposite)
- **Similarity score**: `1 - distance` (0 to 1)

### Hardware Acceleration

- **MPS** (Apple Silicon): ~10x faster than CPU
- **CUDA** (NVIDIA): ~15x faster than CPU
- **CPU**: Fallback, works everywhere

### Performance Benchmarks

Typical performance on different hardware:

| Hardware | Time | Speed |
|----------|------|-------|
| M1 Mac (MPS) | ~8 min | ~320 words/sec |
| M2 Mac (MPS) | ~6 min | ~420 words/sec |
| RTX 3080 (CUDA) | ~5 min | ~500 words/sec |
| Intel i7 (CPU) | ~45 min | ~60 words/sec |

---

## Troubleshooting

### Common Issues

**ChromaDB Error: Collection not found**
```bash
# Re-run the embedding script
uv run python embed_wordnet.py
```

**MPS Not Available**
```bash
# Check PyTorch MPS support
python -c "import torch; print(torch.backends.mps.is_available())"
```

**Out of Memory During Embedding**
- Reduce `batch_size` in `embed_wordnet.py` (default: 1000)
- Close other applications
- Use a smaller embedding model

**Out of Memory During Analysis**
```python
# Load embeddings in smaller batches
batch_size = 5000
for i in range(0, len(all_ids), batch_size):
    # Process batch
    pass
```

**Slow Performance**
- Check that MPS/CUDA is being used (printed during startup)
- Ensure no other heavy processes are running
- Consider using a smaller model or batch size

**Jupyter Kernel Not Found**
```bash
# Check available kernels
uv run jupyter kernelspec list
```

**Notebook: Labels Overlapping**
- Reduce `top_n` to show fewer labels
- Adjust plot size in the code

**Notebook: Slow Plotting**
- Reduce `sample_size` to 5000 or less
- Plot fewer words for faster rendering

---

## Examples & Use Cases

### Use Cases

**Basic Dictionary & Word Operations:**
1. Dictionary lookups - Get all definitions for any English word
2. Word lists - Generate lists of all English words
3. Prefix search - Find all words starting with a pattern
4. Spell checking - Verify if words exist in the dictionary

**Semantic & Relationship Analysis:**
5. Synonym discovery - Find synonyms for words and specific senses
6. Semantic similarity - Compare words based on shared hypernyms
7. Word sense disambiguation - Distinguish between different meanings
8. Concept hierarchies - Navigate hypernym/hyponym relationships

**NLP & Research Applications:**
9. Text analysis - Extract semantic information from text
10. Knowledge graphs - Build semantic networks from relationships
11. Ontology exploration - Navigate WordNet's taxonomic structure
12. Educational tools - Build vocabulary trainers, quiz apps, thesaurus tools
13. Linguistic research - Study polysemy, semantic fields, lexical relations

### Example Code Patterns

**Get word definition with examples:**
```python
defs = wn.get_definitions('run')
for d in defs[:3]:
    print(f"[{d['part_of_speech']}] {d['definition']}")
    for ex in d['examples']:
        print(f"  Ex: {ex}")
```

**Find all synonyms for each sense:**
```python
word = 'bank'
word_entries = wn.get_word(word)
for entry in word_entries:
    for i, sense in enumerate(entry.senses, 1):
        syns = wn.get_synonyms(word, i)
        print(f"Sense {i}: {sense.definition}")
        print(f"  Synonyms: {syns}")
```

**Navigate concept hierarchy:**
```python
# Start with a word
synsets = wn.get_synsets_for_word('dog')
synset_id = synsets[0].id

# Go more general
hypernyms = wn.get_hypernyms(synset_id)
for h in hypernyms:
    print(f"↑ {wn.get_words_in_synset(h.id)}")

# Go more specific
hyponyms = wn.get_hyponyms(synset_id)
for h in hyponyms[:5]:
    print(f"↓ {wn.get_words_in_synset(h.id)}")
```

**Find semantic similarity:**
```python
# Compare two words via shared hypernyms
cat_synsets = wn.get_synsets_for_word('cat')
dog_synsets = wn.get_synsets_for_word('dog')

cat_hypernyms = set(h.id for h in wn.get_hypernyms(cat_synsets[0].id))
dog_hypernyms = set(h.id for h in wn.get_hypernyms(dog_synsets[0].id))

shared = cat_hypernyms & dog_hypernyms
print(f"Shared concepts: {len(shared)}")
```

**Analyze word polysemy:**
```python
synsets = wn.get_synsets_for_word('bank')
print(f"'bank' has {len(synsets)} different meanings")

for i, s in enumerate(synsets, 1):
    words = wn.get_words_in_synset(s.id)
    print(f"{i}. [{s.part_of_speech}] {s.definition}")
    print(f"   Also: {', '.join(words)}")
```

**Batch queries:**
```python
# Query multiple concepts at once
queries = [
    "happy feeling",
    "sad emotion",
    "large animal"
]

results = collection.query(
    query_texts=queries,
    n_results=5
)

# Results are returned per query
for i, query in enumerate(queries):
    print(f"\nQuery: {query}")
    for j, word_id in enumerate(results['ids'][i]):
        meta = results['metadatas'][i][j]
        print(f"  {j+1}. {meta['word']}: {meta['definition']}")
```

**Filter by part of speech:**
```python
# Find only nouns
results = collection.query(
    query_texts=["happy"],
    n_results=10,
    where={"pos": "n"}
)

# Find only verbs
results = collection.query(
    query_texts=["move quickly"],
    n_results=10,
    where={"pos": "v"}
)
```

### Semantic Search Examples

```bash
# Find by description
"a small furry animal that meows" → cat, kitten, feline

# Find by concept
"feeling of great happiness" → joy, elation, euphoria, bliss

# Find by properties
"large gray animal with trunk" → elephant, mammoth, pachyderm

# Find by function
"device for measuring time" → clock, watch, chronometer

# Find by action
"process of changing liquid to gas" → evaporation, vaporization
```

### Dimension Analysis Discoveries

Some dimensions might capture:
- **Emotion**: positive vs. negative words
- **Size**: large vs. small objects
- **Abstract/Concrete**: ideas vs. physical things
- **Animate/Inanimate**: living vs. non-living
- **Time**: past vs. future concepts
- **Complexity**: simple vs. complex
- **Motion**: static vs. dynamic

---

## Learning Path

1. **Beginner**: Start with `example_usage.py` to understand word lookups
2. **Intermediate**: Run `synset_examples.py` to explore relationships
3. **Advanced**: Create embeddings and try semantic search
4. **Expert**: Analyze dimensions to understand embedding structure

## Quick Commands Cheat Sheet

```bash
# 1. Explore WordNet
uv run python interpretability/test/synset_examples.py

# 2. Create embeddings (once)
uv run python interpretability/embed_wordnet.py

# 3. Query semantically
uv run python interpretability/test/query_wordnet.py "your query"
uv run python interpretability/test/query_wordnet.py  # interactive

# 4. Analyze dimensions
uv run python interpretability/analyze_dimension.py  # random
uv run python interpretability/analyze_dimension.py 42  # specific

# 5. 2D visualization
uv run jupyter notebook
# Open interpretability/two_dimension_analysis.ipynb
```

## Files Overview

| File | Purpose |
|------|---------|
| [embed_wordnet.py](interpretability/embed_wordnet.py) | Create vector embeddings (run once) |
| [query_wordnet.py](interpretability/test/query_wordnet.py) | Semantic search interface |
| [analyze_dimension.py](interpretability/analyze_dimension.py) | Analyze single dimensions |
| [two_dimension_analysis.ipynb](interpretability/two_dimension_analysis.ipynb) | 2D visualization notebook |
| [wordnet_parser.py](interpretability/utils/wordnet_parser.py) | Core WordNet parser |
| [example_usage.py](interpretability/test/example_usage.py) | Basic word operations |
| [synset_examples.py](interpretability/test/synset_examples.py) | Synset relationships |

## Next Steps

Choose your path:

**Path 1: Quick Start**
```bash
uv run python interpretability/embed_wordnet.py    # ~8 min
uv run python interpretability/test/query_wordnet.py    # Start querying
```

**Path 2: Deep Dive**
```bash
uv run python interpretability/embed_wordnet.py              # Create embeddings
uv run python interpretability/analyze_dimension.py          # Explore dimensions
uv run jupyter notebook                      # 2D analysis
```

**Path 3: Research**
- Read the API reference
- Run all examples
- Create custom analyses
- Build your own tools

---

## License

This project uses:
- **English WordNet 2024** - CC BY 4.0
- **all-MiniLM-L6-v2** - Apache 2.0

## Contributing

This is a research/educational toolkit. Feel free to:
- Extend the analysis scripts
- Add new visualizations
- Create custom embeddings
- Build applications

---

**Ready to start?** Run `uv run python embed_wordnet.py`
