"""Sparse Autoencoder (SAE) support for Gemma3 interpretability.

Provides JumpReLU SAE loading from Gemma-scope pretrained weights
and hook-based activation capture on the raw PyTorch model.
"""

from sae.activation_store import ActivationRecord, ActivationStore
from sae.feature_labels import FeatureLabelStore
from sae.hook_manager import HookManager
from sae.loading import load_sae
from sae.exploration.prompt_explorer import PromptExplorer, PromptExplorerConfig
from sae.sae_config import HookType, SAEConfig
from sae.sae_model import JumpReLUSAE
from sae.steering import (
    SteeringMode,
    SteeringOp,
    apply_steering,
    resolve_op,
)

__all__ = [
    "ActivationRecord",
    "ActivationStore",
    "FeatureLabelStore",
    "HookManager",
    "HookType",
    "JumpReLUSAE",
    "PromptExplorer",
    "PromptExplorerConfig",
    "SAEConfig",
    "SteeringMode",
    "SteeringOp",
    "apply_steering",
    "load_sae",
    "resolve_op",
]
