# Topic-Quality Evaluation

Standalone metrics for scoring extracted topics, plus a config-driven runner. This
package is intentionally decoupled from the extraction pipeline and from the
GraphQL/DuckDB layers — it reads existing data, computes scores, and reports them.
Persisting metrics to DuckDB or exposing them over GraphQL is deliberately **not**
done here yet (a later decision).

## Structure

| File | Purpose |
|---|---|
| `quality_metrics.py` | `TopicQualityEvaluator` — the metric implementations (pure, no DB/model). |
| `run_evaluation.py` | Config-driven runner: loads current labels + projections + embeddings, evaluates, prints a report, writes JSON. |
| `eval_config.toml` | Which collections to evaluate and the metric parameters. |
| `evaluation_results.json` | Output (generated). |

## Run

```bash
uv run python -m interpretability_backend.evaluation.run_evaluation
# custom config:
ORRERY_EVAL_CONFIG=/path/to/config.toml uv run python -m interpretability_backend.evaluation.run_evaluation
```

The runner evaluates the **current active** topic extraction of each collection
listed in `eval_config.toml`.

## Metrics

| Metric | Measures | Range / direction | Notes |
|---|---|---|---|
| **DBCV** | Density-based cluster validity | [-1, 1], higher better | The HDBSCAN-appropriate metric. **Only available from a live fitted model** — `null` when scoring stored labels (see below). |
| **Silhouette (embedding)** | Are the clusters real in the original vector space | [-1, 1], higher better | Cosine; noise excluded; subsampled to `sample_size`. |
| **Silhouette (projection)** | Separation in the 2D/3D space clustering ran on | [-1, 1], higher better | Euclidean. Partly circular when clustering was done on the projection — read alongside the embedding-space number. |
| **Topic diversity** | Redundancy across topics | (0, 1], higher = less overlap | Unique words ÷ total words across topics' top-N keywords. |
| **Coherence C_v** | Keyword interpretability (best human correlation) | typically (0, 1) | gensim `CoherenceModel`. Primary coherence metric. |
| **Coherence U_Mass** | Keyword co-occurrence | ≤ 0, higher (closer to 0) better | gensim `CoherenceModel`. |

### Projection vs embedding space
Clustering currently runs on the 2D/3D projection (UMAP/PCA). A silhouette on those
same coordinates is partly circular (it scores the space clustering optimized in).
The embedding-space silhouette is the more meaningful "are these clusters real?"
number. The extraction pipeline also supports clustering on the original embeddings
directly via `TopicExtractionConfig(cluster_on="embedding")` — BERTopic reports that
UMAP-then-cluster is usually better, so this is opt-in and the default stays
`"projection"`.

### Coherence uses no embedding model
C_v / U_Mass are computed against the documents themselves via gensim, so no
embedding model (potentially remote/API) is loaded. Keyword tokenization mirrors the
c-TF-IDF `CountVectorizer` stop-words config.

### DBCV caveat
DBCV is read from a fitted HDBSCAN model's `relative_validity_`, which is not
persisted with an extraction. When re-scoring stored labels here it is therefore
`null`; it is populated only inside a fresh-extraction flow that still holds the
fitted model.

## Tests
Unit tests (synthetic data, no DB/model):
```bash
uv run pytest interpretability_backend/unit_tests/test_topic_quality_metrics.py -v
```
