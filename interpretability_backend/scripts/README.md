# Backend Scripts

Utility scripts in this folder support one-off maintenance and Docker demo
setup. Run Python entry points from the repository root with `uv run python`.

- `build_seed_snapshot.py` rebuilds the small committed seed database/vector
  snapshot from the current live stores.
- `docker_warmup_sae.py` warms Docker volumes for the optional SAE demo profile:
  it waits for the backend, downloads the configured HuggingFace checkpoint into
  `HF_HOME`, calls `prepareSaeData`, and exits without loading the model.
- `extract_direction_vectors.py` normalizes steering direction tensors into the
  small runtime `.pt` presets stored under `resources/directions/`.
- `generate_color_strips.py` generates frontend color-map JSON strips from
  backend color data.
- `migrate_chromadb_to_duckdb.py` migrates legacy Chroma-backed collection data
  into the DuckDB-centered schema.
- `poetry_refusal_cosines.py` compares the shipped poetry/refusal steering
  direction vectors.
