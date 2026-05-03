"""Download and load pretrained Gemma-scope SAEs from HuggingFace."""

from pathlib import Path

import torch

from scripts.sae.sae_config import SAEConfig
from scripts.sae.sae_model import JumpReLUSAE

DTYPE_MAP: dict[str, torch.dtype] = {
    "bfloat16": torch.bfloat16,
    "float16": torch.float16,
    "float32": torch.float32,
}

# d_sae value for each Gemma-scope width suffix
WIDTH_TO_D_SAE: dict[str, int] = {
    "16k": 16384,
    "65k": 65536,
    "262k": 262144,
}


def download_sae_weights(
    repo_id: str,
    hook_type: str,
    layer_index: int,
    width: str,
    l0_size: str = "medium",
) -> Path:
    """Download SAE weights from HuggingFace, returning the cached local path.

    Gemma-scope repo structure:
        {hook_type}/layer_{N}_width_{W}_l0_{size}/params.safetensors

    Args:
        repo_id: HuggingFace repository ID (e.g. "google/gemma-scope-2-4b-pt").
        hook_type: Hook type directory (e.g. "resid_post", "mlp_out", "attn_out").
        layer_index: Decoder layer index (0-33 for Gemma3 4b).
        width: SAE width string as it appears on HF — "16k", "65k", or "262k".
        l0_size: Sparsity level — "small", "medium", or "big".

    Returns:
        Path to the locally cached params.safetensors file.
    """
    from huggingface_hub import hf_hub_download

    folder = f"layer_{layer_index}_width_{width}_l0_{l0_size}"
    filename = f"{hook_type}/{folder}/params.safetensors"
    return Path(hf_hub_download(repo_id=repo_id, filename=filename))


def load_sae(config: SAEConfig) -> JumpReLUSAE:
    """Download (if needed) and load a JumpReLU SAE from config.

    Args:
        config: SAE configuration specifying layer, width, repo, device, dtype.

    Returns:
        Loaded JumpReLUSAE ready for inference.
    """
    if config.dtype not in DTYPE_MAP:
        raise ValueError(
            f"Unknown dtype '{config.dtype}'. Valid: {list(DTYPE_MAP.keys())}"
        )
    dtype = DTYPE_MAP[config.dtype]
    path = download_sae_weights(
        config.repo_id,
        config.hook_type.value,
        config.layer_index,
        config.width,
        config.l0_size,
    )
    sae = JumpReLUSAE.from_pretrained(
        path, d_in=config.d_in, d_sae=WIDTH_TO_D_SAE[config.width],
        device=config.device, dtype=dtype,
    )
    sae.eval()
    return sae
