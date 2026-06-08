# Production Docker Demo

`docker-compose.yml` is the production demo launcher. It builds immutable
backend/frontend images, stores mutable runtime data in named volumes, and
seeds a fresh data volume from the committed demo snapshot.

## Default Demo

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/health
- GraphQL Playground: http://localhost:8000/graphql

The backend runs without `--reload` and without source bind mounts. On first
startup it copies `interpretability_backend/resources/seed/` into the
`starmap_backend_data` volume only when `/data/main.duckdb` is absent. Existing
volume data is never overwritten.

## Reset Behavior

```bash
# Stop containers but keep created collections and uploaded files.
docker compose down

# Remove runtime data/model-cache volumes; next startup reseeds from git.
docker compose down -v
docker compose up --build
```

## Optional SAE Cache Profile

```bash
docker compose --profile sae up --build
```

The `sae-warmup` service uses the backend image and shared volumes. It waits for
the backend healthcheck, prefetches `google/gemma-3-4b-it` into `HF_HOME`, then
calls GraphQL `prepareSaeData` for GemmaScope layer 9 residual-post 16k with
activations and visualization collection creation disabled.

This profile is cache-only. It does not call `loadModel`; the user still clicks
"Load Model" in the UI, and that load should use the warmed HuggingFace/model
cache and prepared SAE files.

SAE mode may require network access, HuggingFace gated-model access, disk space,
and enough RAM/GPU memory when the model is later loaded. Provide a token with
one of:

```bash
HF_TOKEN=... docker compose --profile sae up --build
HUGGINGFACE_HUB_TOKEN=... docker compose --profile sae up --build
HUGGINGFACE_API_KEY=... docker compose --profile sae up --build
```

## Volumes

| Volume | Mounted At | Contents |
|--------|------------|----------|
| `starmap_backend_data` | `/data` | DuckDB, ChromaDB, uploads, job state, SAE labels, SAE vectors |
| `starmap_hf_cache` | `/models/huggingface` | HuggingFace model and SAE weight cache |

Large artifacts are not baked into images or committed to git. The committed
seed snapshot and small steering direction presets remain in the backend image.

## Runtime Path Environment

| Variable | Docker Value | Purpose |
|----------|--------------|---------|
| `STARMAP_RESOURCE_DIR` | `/data` | Mutable backend resource root |
| `STARMAP_SEED_DIR` | `/app/interpretability_backend/resources/seed` | Read-only seed snapshot in image |
| `STARMAP_DIRECTIONS_DIR` | `/app/interpretability_backend/resources/directions` | Small shipped steering direction presets |
| `HF_HOME` | `/models/huggingface` | HuggingFace/model cache volume |

Local development keeps the historical defaults under
`interpretability_backend/resources/` when these variables are unset.

## Frontend API URLs

The production frontend image is built with:

| Variable | Default |
|----------|---------|
| `NEXT_PUBLIC_GRAPHQL_URL` | `http://localhost:8000/graphql` |
| `NEXT_PUBLIC_GRAPHQL_WS_URL` | `ws://localhost:8000/graphql` |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` |

File uploads use `${NEXT_PUBLIC_API_BASE_URL}/upload`.

The Docker frontend build sets `STARMAP_DOCKER_BUILD=1`, which skips the Next.js
ESLint and TypeScript build gates for the current frontend backlog. This keeps
the production demo image buildable while preserving normal local build signals.
