# SAE Module

Hook-based system for attaching pretrained [Gemma-scope](https://huggingface.co/google/gemma-scope-2-4b-it) JumpReLU Sparse Autoencoders to the raw PyTorch Gemma3 model, capturing feature activations during inference, and looking up Neuronpedia autointerpreter labels. No SAELens or TransformerLens dependency.

## Folder layout

The top level of this folder holds the **core library** (SAE model, config, loading, hooks, steering, activation store, feature labels). Larger tooling lives in subpackages:

- [`exploration/`](exploration/) — Interactive / notebook-facing feature exploration (`NeuronpediaExplorer`, `PromptExplorer`).
- [`pipeline/`](pipeline/) — Data preparation (`prepare_sae_data`, `extract_decoder_vectors`).
- [`diagnostics/`](diagnostics/) — Manual smoke tests and steering/alignment diagnostics. Not pytest.

## Quick Start

```python
from scripts.inference.gemma_pytorch import GemmaPytorchInference
from scripts.sae import HookManager, SAEConfig, FeatureLabelStore

# Load model
wrapper = GemmaPytorchInference("google/gemma-3-4b-it")

# Attach SAE to layer 29 (prefill only — skip decode tokens)
config = SAEConfig(layer_index=29, prefill_only=True)
manager = HookManager()
manager.add_sae(config)

# Run inference with SAE hooks
with manager.session(wrapper.model.model.layers) as store:
    wrapper.generate("The cat sat on the warm red mat", output_len=1)
    acts = store.prefill(layer=29).feature_acts[0]  # (seq_len, 16384)

# Look up labels for top features
label_store = FeatureLabelStore("resources/sae_labels/neuronpedia_gemma-3-4b-it")
model_id, layer, hook, width = label_store.params_from_config(config)

densities = label_store.get_densities(model_id, layer, hook, width)
mask = (densities > 0) & (densities < 0.01)  # exclude high-frequency features

results = label_store.label_top_k_per_token(
    acts, model_id, layer, hook, width, k=5, mask=mask,
)
```

## Files

| File | Class | Purpose |
|---|---|---|
| `sae_config.py` | `SAEConfig`, `HookType` | Configuration dataclass. Derives HF `repo_id` and Neuronpedia `model_id` from `model_size` + `variant`. |
| `sae_model.py` | `JumpReLUSAE` | Minimal `nn.Module` matching Gemma-scope weight format (`w_enc`, `w_dec`, `b_enc`, `b_dec`, `threshold`). |
| `loading.py` | `load_sae()` | Downloads SAE weights from HuggingFace Hub via `hf_hub_download`. |
| `hook_manager.py` | `HookManager` | Attaches/detaches SAEs as forward hooks on decoder layers. Supports `prefill_only`, read-only mode, and steering interventions composed alongside activation capture. |
| `activation_store.py` | `ActivationStore` | Captures feature activations per forward pass. Provides `prefill()`, `latest()`, `all_feature_acts()`. |
| `feature_labels.py` | `FeatureLabelStore` | SQLite-backed Neuronpedia label lookup. Stores labels, densities, 256-dim explanation embeddings, and top/bottom logits. Supports multiple labelling methods and feature-to-feature similarity search. |
| `steering.py` | `SteeringOp`, `SteeringMode`, `apply_steering()`, `resolve_op()` | Steering specs and math for additive / orthogonal / ablation / projection-cap interventions on SAE features or raw direction vectors. |

## SAEConfig

```python
SAEConfig(
    layer_index=29,         # 0-33 for Gemma3 4b
    hook_type=HookType.RESID_POST,  # RESID_POST, MLP_OUT, ATTN_OUT
    model_size="4b",        # derives repo_id + neuronpedia_model_id
    variant="it",           # "it" (instruction-tuned) or "pt" (base)
    width=16_384,           # SAE feature count (16k, 65k, 262k)
    l0_size="medium",       # sparsity level: "small", "medium", "big"
    d_in=2560,              # model hidden size
    prefill_only=False,     # only capture the first forward pass
    read_only=True,         # False enables activation steering
)
```

`config.repo_id` -> `"google/gemma-scope-2-4b-it"`
`config.neuronpedia_model_id` -> `"gemma-3-4b-it"`

## Steering

`HookManager` can apply steering interventions on the residual stream during inference. Four modes are supported, all broadcast across every token position. The direction `v` can be a row of `sae.w_dec` (via `feature_index`) or a raw vector.

| Mode | Formula | Notes |
|---|---|---|
| `ADDITIVE` | `h + strength * v` | Pure push along `v`. |
| `ORTHOGONAL` | `h + (strength - 1) * ((h · v) / (v · v)) * v` | Scales only the component parallel to `v`. `strength=1` is identity, `strength=0` removes the direction. |
| `ABLATION` | `h + (strength - 1) * (h · v) * v` | `v` always L2-normalised. `strength=0` fully ablates. |
| `PROJECTION_CAP` | `h + (clip(h · v, cap_min, cap_max) - h · v) * v` | `v` always L2-normalised. Conditional — no-op when `h · v` is inside the bounds. Either bound may be `None`. `strength_multiplier` is ignored. |

```python
from scripts.sae import HookManager, SAEConfig, SteeringOp, SteeringMode

manager = HookManager()
manager.add_sae(SAEConfig(layer_index=9))    # for feature lookup + capture
manager.add_sae(SAEConfig(layer_index=29))   # capture only

manager.add_steering([
    # amplify SAE feature 4287 at layer 9
    SteeringOp(layer_index=9, mode=SteeringMode.ADDITIVE,
               feature_index=4287, strength=6.0, normalise=True),
    # partially suppress a feature direction at layer 29
    SteeringOp(layer_index=29, mode=SteeringMode.ORTHOGONAL,
               feature_index=1234, strength=0.3),
    # fully ablate a custom direction at layer 20 (no SAE registered there)
    SteeringOp(layer_index=20, mode=SteeringMode.ABLATION,
               vector=my_direction, strength=0.0),
    # cap how strongly a feature can fire — only intervenes if proj > 5.0
    SteeringOp(layer_index=9, mode=SteeringMode.PROJECTION_CAP,
               feature_index=4287, cap_max=5.0),
])

with manager.session(wrapper.model.model.layers) as store:
    wrapper.generate("What colour is the sky?")
    feats_9 = store.prefill(layer=9).feature_acts  # post-steering activations
```

Notes:

- Multiple ops on the same layer compose in insertion order.
- A layer can have steering without an SAE registered; a lightweight steering-only hook is attached.
- Feature activations captured during a steered session reflect the **post-steering** hidden state — i.e. "given this intervention, what features are active?".
- `manager.set_strength_multiplier(m)` scales every additive / orthogonal / ablation op globally.
- **Warning**: combining steering with `read_only=False` on the same layer replaces the steered state with its (lossy) SAE reconstruction. A `warnings.warn` is raised at `attach()` time.

## FeatureLabelStore

Backed by a single SQLite database (`features.db`) in the labels directory. JSONL files are auto-imported on first query and re-imported when the source file changes.

### Label Methods

Each feature can have multiple labels under different method names. The Neuronpedia autointerpreter label is stored as `method="label"`. Custom methods can be written:

```python
store.write_labels({0: "my label", 1: "another"}, model_id, layer, hook, width, method="custom")
store.get_label(0, model_id, layer, hook, width, method="custom")  # "my label"
store.get_label(0, model_id, layer, hook, width, method="label")   # original Neuronpedia label
```

### Feature Similarity

The stored 256-dim explanation embeddings (from Neuronpedia's autointerpreter) enable feature-to-feature similarity search:

```python
# Find features with similar explanations to feature 4287 ("colors and hues")
similar = store.find_similar_features(4287, model_id, layer, hook, width, k=10)
# -> [(idx, cosine_similarity, label), ...]
```

Note: these are text embeddings of the label strings, not SAE activations. Since we don't know the embedding model, only feature-to-feature similarity is supported (not text queries).

### Logits

```python
logits = store.get_logits(0, model_id, layer, hook, width)
# {"top": [("token", score), ...], "bottom": [("token", score), ...]}
```

## Data Layout

```
resources/sae_labels/neuronpedia_gemma-3-4b-it/
    features.db                                          # single SQLite DB (auto-generated)
    gemma-3-4b-it_9-gemmascope-2-res-16k_features.jsonl  # source JSONL (~65 MB)
    gemma-3-4b-it_9-gemmascope-2-res-16k_activations.jsonl  # activation examples (~1.8 GB)
    activations/9-gemmascope-2-res-16k/batch-*.jsonl.gz  # raw activation batches
    ...
```

The features JSONL files contain density, labels, embeddings, and logits. The activation files contain ~20 token-level activation examples per feature (512 tokens each). Activations are NOT imported into the DB due to size.
