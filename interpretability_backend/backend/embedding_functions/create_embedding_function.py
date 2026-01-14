"""
Factory for creating embedding functions.
"""
from typing import Optional, Any
from chromadb.utils import embedding_functions

from .config import EmbeddingModelConfig, EmbeddingProvider


def create_embedding_function(
    config: Optional[EmbeddingModelConfig],
    device: str
) -> tuple[Any, int]:
    """
    Create an embedding function based on the configuration.

    Args:
        config: Embedding model configuration (None uses defaults)
        device: Device for local models (cpu, cuda, mps)

    Returns:
        Tuple of (embedding_function, embedding_dimension)

    Raises:
        ValueError: If provider is not supported or API key is missing
    """
    if config is None:
        config = EmbeddingModelConfig()

    provider = config.provider
    model_name = config.model_name

    if provider == EmbeddingProvider.SENTENCE_TRANSFORMERS:
        # Local sentence-transformers model
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=model_name,
            device=device
        )
        # Get dimension by doing a test embedding
        test_embedding = ef(["test"])
        dim = len(test_embedding[0])
        return ef, dim

    elif provider == EmbeddingProvider.OPENAI:
        # OpenAI API - reads from CHROMA_OPENAI_API_KEY env var
        ef = embedding_functions.OpenAIEmbeddingFunction(
            model_name=model_name
            # api_key read from CHROMA_OPENAI_API_KEY by default
        )
        # OpenAI dimensions vary by model
        dim_map = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
        }
        dim = dim_map.get(model_name, 1536)
        return ef, dim

    elif provider == EmbeddingProvider.COHERE:
        # Cohere API - reads from CHROMA_COHERE_API_KEY env var
        ef = embedding_functions.CohereEmbeddingFunction(
            model_name=model_name
            # api_key read from CHROMA_COHERE_API_KEY by default
        )
        # Cohere v3 models are 1024 dim
        dim = 1024
        return ef, dim

    elif provider == EmbeddingProvider.OLLAMA:
        # Local Ollama server
        url = config.ollama_url or "http://localhost:11434"
        ef = embedding_functions.OllamaEmbeddingFunction(
            url=url,
            model_name=model_name
        )
        # Get dimension by doing a test embedding
        test_embedding = ef(["test"])
        dim = len(test_embedding[0])
        return ef, dim

    elif provider == EmbeddingProvider.HUGGINGFACE_API:
        # HuggingFace Inference API - reads from CHROMA_HUGGINGFACE_API_KEY env var
        ef = embedding_functions.HuggingFaceEmbeddingFunction(
            model_name=model_name
            # api_key read from CHROMA_HUGGINGFACE_API_KEY by default
        )
        # Get dimension by doing a test embedding
        test_embedding = ef(["test"])
        dim = len(test_embedding[0])
        return ef, dim

    else:
        raise ValueError(f"Unsupported embedding provider: {provider}")


def get_device() -> str:
    """Detect and return the best available device for computation."""
    import torch
    if torch.backends.mps.is_available():
        return "mps"
    elif torch.cuda.is_available():
        return "cuda"
    else:
        return "cpu"
