# `scripts/sae/diagnostics/`

Manual smoke tests and diagnostics for the SAE hook system. **Not pytest** — each script has hardcoded prompts / feature indices and is intended to be run directly for quick sanity checks.

| File | Purpose |
|---|---|
| `check_feature_index_alignment.py` | For each `(layer, feature)` in `CASES`, loads a top-activating Neuronpedia record, replays the exact token sequence through our SAE hook, and reports whether our capture peaks on the same token with a comparable magnitude. Validates SAE feature-index alignment with Neuronpedia. |
| `smoke_steering_pirate.py` | Runs baseline + several additive-steering generations on a "pirate" feature at increasing strengths. Quick visual check that steering is being applied and scales reasonably. |
| `debug_steering_injection.py` | Monkey-patches `apply_steering` to log `(h_in, h_out, v)` and reports delta norms + cosine alignment. Used when steering appears to have no effect. |

Run with:

```
uv run python -m scripts.sae.diagnostics.check_feature_index_alignment
uv run python -m scripts.sae.diagnostics.smoke_steering_pirate
uv run python -m scripts.sae.diagnostics.debug_steering_injection
```
