"""Configuration for SAE hook attachment to Gemma3 models."""

from dataclasses import dataclass
from enum import Enum


class HookType(Enum):
    """Where in a decoder layer to attach the SAE hook."""

    RESID_POST = "resid_post"  # after full layer output (both residual adds)
    MLP_OUT = "mlp_out"  # after MLP block output
    ATTN_OUT = "attn_out"  # after attention block output


@dataclass
class SAEConfig:
    """Configuration for a single pretrained SAE to attach.

    The model_size, variant, hook_type, layer_index, width, and l0_size
    determine the HuggingFace repo and path:
        google/gemma-scope-2-{model_size}-{variant}
        {hook_type}/layer_{N}_width_{W}k_l0_{size}/params.safetensors

    The Neuronpedia model ID is derived as:
        gemma-3-{model_size}       (variant="pt")
        gemma-3-{model_size}-it    (variant="it")
    """

    layer_index: int
    hook_type: HookType = HookType.RESID_POST
    model_size: str = "4b"
    variant: str = "it"  # "pt" (pretrained/base) or "it" (instruction-tuned)
    width: str = "16k"  # "16k", "65k", or "262k"
    l0_size: str = "medium"  # "small", "medium", or "big"
    d_in: int = 2560
    dtype: str = "bfloat16"
    device: str = "mps"
    collect_last_only: bool = False
    prefill_only: bool = False
    read_only: bool = True

    @property
    def repo_id(self) -> str:
        """HuggingFace repository ID for SAE weights."""
        return f"google/gemma-scope-2-{self.model_size}-{self.variant}"

    @property
    def neuronpedia_model_id(self) -> str:
        """Neuronpedia model ID for label lookups."""
        base = f"gemma-3-{self.model_size}"
        return base if self.variant == "pt" else f"{base}-{self.variant}"
