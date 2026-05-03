"""JumpReLU Sparse Autoencoder matching the Gemma-scope architecture."""

from pathlib import Path

import torch
from torch import nn


class JumpReLUSAE(nn.Module):
    """JumpReLU SAE for inference on pretrained Gemma-scope weights.

    Architecture: input -> centre -> encode -> JumpReLU -> decode
    Weights are loaded from Gemma-scope safetensors files.
    """

    def __init__(self, d_in: int, d_sae: int) -> None:
        super().__init__()
        self.d_in = d_in
        self.d_sae = d_sae
        self.w_enc = nn.Parameter(torch.zeros(d_in, d_sae))
        self.w_dec = nn.Parameter(torch.zeros(d_sae, d_in))
        self.b_enc = nn.Parameter(torch.zeros(d_sae))
        self.b_dec = nn.Parameter(torch.zeros(d_in))
        self.threshold = nn.Parameter(torch.zeros(d_sae))

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """Encode input to sparse feature activations via JumpReLU.

        Args:
            x: Input tensor of shape (..., d_in).

        Returns:
            Sparse feature activations of shape (..., d_sae).
        """
        pre_acts = (x - self.b_dec) @ self.w_enc + self.b_enc
        mask = (pre_acts > self.threshold).to(pre_acts.dtype)
        return pre_acts * mask

    def decode(self, feature_acts: torch.Tensor) -> torch.Tensor:
        """Reconstruct input from feature activations.

        Args:
            feature_acts: Sparse activations of shape (..., d_sae).

        Returns:
            Reconstruction of shape (..., d_in).
        """
        return feature_acts @ self.w_dec + self.b_dec

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """Run full SAE forward pass.

        Returns:
            (feature_acts, reconstruction) tuple.
        """
        feature_acts = self.encode(x)
        return feature_acts, self.decode(feature_acts)

    @classmethod
    def from_pretrained(
        cls,
        path: Path,
        d_in: int,
        d_sae: int,
        device: str = "cpu",
        dtype: torch.dtype = torch.bfloat16,
    ) -> "JumpReLUSAE":
        """Load from a Gemma-scope params.safetensors file."""
        from safetensors.torch import load_file

        state = load_file(str(path))
        sae = cls(d_in, d_sae)
        sae.w_enc.data = state["w_enc"].to(dtype=dtype)
        sae.w_dec.data = state["w_dec"].to(dtype=dtype)
        sae.b_enc.data = state["b_enc"].to(dtype=dtype)
        sae.b_dec.data = state["b_dec"].to(dtype=dtype)
        sae.threshold.data = state["threshold"].to(dtype=dtype)
        return sae.to(device)
