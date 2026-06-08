# Backend Agent Notes

Follow the root `AGENTS.md` rules. Historical backend notes also live in
`CLAUDE.md`; prefer the root instructions if they conflict.

## Production Docker

- Runtime resource paths are centralized in `backend/utils/resource_paths.py`.
- Local development defaults to `interpretability_backend/resources/`.
- Docker sets `STARMAP_RESOURCE_DIR=/data`,
  `STARMAP_SEED_DIR=/app/interpretability_backend/resources/seed`,
  `STARMAP_DIRECTIONS_DIR=/app/interpretability_backend/resources/directions`, and
  `HF_HOME=/models/huggingface`.
- The optional SAE profile runs `scripts/docker_warmup_sae.py` with
  `uv run python`; it warms volumes only and must not auto-load Gemma into
  memory.

Detailed Docker behavior is documented in `../documentation/DOCKER.md`.
Script structure is documented in `scripts/README.md`.
