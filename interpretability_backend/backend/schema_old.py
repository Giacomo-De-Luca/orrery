"""GraphQL schema for embedding visualization backend."""

import strawberry
from typing import List, Optional, Dict, Any
from enum import Enum


# JSON scalar type for flexible metadata
@strawberry.scalar(
    serialize=lambda v: v,
    parse_value=lambda v: v,
)
class JSON:
    """JSON scalar type."""
    __slots__ = ()


# ========== HuggingFace Dataset Types ==========

@strawberry.type
class HFSplitInfo:
    """Information about a dataset split."""
    name: str
    num_rows: Optional[int] = None
    num_bytes: Optional[int] = None


@strawberry.type
class HFFeatureInfo:
    """Information about a dataset feature/column."""
    name: str
    dtype: str
    description: Optional[str] = None


@strawberry.type
class HFConfigInfo:
    """Information about a dataset configuration."""
    name: str
    splits: List[HFSplitInfo]
    features: List[HFFeatureInfo]


@strawberry.type
class HFDatasetInfo:
    """Complete information about a HuggingFace dataset."""
    dataset_id: str
    description: Optional[str] = None
    license: Optional[str] = None
    configs: List[HFConfigInfo]
    default_config: Optional[str] = None
    error: Optional[str] = None


@strawberry.type
class HFDatasetPreview:
    """Preview rows from a dataset."""
    dataset_id: str
    config: Optional[str] = None
    split: str
    columns: List[str]
    rows: List[JSON]
    total_rows: Optional[int] = None
    error: Optional[str] = None


@strawberry.enum
class PortionStrategyEnum(Enum):
    """Strategy for selecting which rows to embed."""
    FIRST_N = "first_n"
    RANDOM_SAMPLE = "random_sample"
    ROW_RANGE = "row_range"
    ALL = "all"


@strawberry.input
class PortionInput:
    """Input for selecting dataset portion."""
    strategy: PortionStrategyEnum
    n: Optional[int] = None  # For FIRST_N and RANDOM_SAMPLE
    start: Optional[int] = None  # For ROW_RANGE
    end: Optional[int] = None  # For ROW_RANGE
    seed: int = 42  # For RANDOM_SAMPLE


# ========== Embedding Model Types ==========

@strawberry.enum
class EmbeddingProviderEnum(Enum):
    """Embedding model provider.

    - SENTENCE_TRANSFORMERS: Local models via sentence-transformers library
    - OPENAI: OpenAI API (requires CHROMA_OPENAI_API_KEY env var)
    - COHERE: Cohere API (requires CHROMA_COHERE_API_KEY env var)
    - OLLAMA: Local Ollama server (no API key required)
    - HUGGINGFACE_API: HuggingFace Inference API (requires CHROMA_HUGGINGFACE_API_KEY env var)
    """
    SENTENCE_TRANSFORMERS = "sentence_transformers"
    OPENAI = "openai"
    COHERE = "cohere"
    OLLAMA = "ollama"
    HUGGINGFACE_API = "huggingface_api"


@strawberry.input
class EmbeddingModelInput:
    """Configuration for embedding model.

    Model names are free-form strings - any valid model for the provider works.

    Examples:
    - SentenceTransformers: "all-MiniLM-L6-v2", "all-mpnet-base-v2", "BAAI/bge-small-en-v1.5"
    - OpenAI: "text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"
    - Cohere: "embed-english-v3.0", "embed-multilingual-v3.0"
    - Ollama: "nomic-embed-text", "mxbai-embed-large"
    - HuggingFace API: "sentence-transformers/all-MiniLM-L6-v2"
    """
    provider: EmbeddingProviderEnum
    model_name: str
    # Provider-specific options
    ollama_url: Optional[str] = None  # Default: http://localhost:11434


@strawberry.input
class EmbedDatasetInput:
    """Input for embedding a HuggingFace dataset."""
    dataset_id: str
    collection_name: str
    config: Optional[str] = None
    split: str = "train"
    columns: Optional[List[str]] = None  # Columns to embed
    text_template: Optional[str] = None  # Template for combining columns
    id_column: Optional[str] = None  # Column to use as document ID
    portion: Optional[PortionInput] = None
    metadata_columns: Optional[List[str]] = None
    compute_projections: bool = True  # Whether to compute PCA/UMAP after embedding
    # Embedding model configuration (default: SentenceTransformers with all-MiniLM-L6-v2)
    embedding_model: Optional[EmbeddingModelInput] = None


@strawberry.type
class EmbedDatasetResult:
    """Result of embedding a dataset."""
    collection_name: str
    total_embedded: int
    embedding_dim: int
    device: str
    duration_seconds: float
    projections_computed: bool = False
    error: Optional[str] = None
    # Model information
    embedding_provider: Optional[str] = None
    embedding_model: Optional[str] = None


# ========== Local File Types ==========

@strawberry.type
class LocalFileInfo:
    """Information about a local data file."""
    file_path: str
    file_type: str
    columns: List[str]
    num_rows: int
    file_size_bytes: int
    error: Optional[str] = None


@strawberry.type
class LocalFilePreview:
    """Preview rows from a local file."""
    file_path: str
    columns: List[str]
    rows: List[JSON]
    total_rows: int
    error: Optional[str] = None


@strawberry.enum
class DataTypeEnum(Enum):
    """Type of data to embed."""
    TEXT = "text"
    IMAGE = "image"
    VECTOR = "vector"


@strawberry.input
class EmbedLocalFileInput:
    """Input for embedding a local file."""
    file_path: str
    collection_name: str
    data_type: DataTypeEnum = DataTypeEnum.TEXT
    columns: Optional[List[str]] = None  # Columns to embed (for text)
    text_template: Optional[str] = None
    image_column: Optional[str] = None  # Column containing image data
    vector_column: Optional[str] = None  # Column containing pre-computed vectors
    id_column: Optional[str] = None
    metadata_columns: Optional[List[str]] = None
    n_rows: Optional[int] = None  # Limit rows
    sample_n: Optional[int] = None  # Random sample
    sample_seed: int = 42
    compute_projections: bool = True
    # Embedding model configuration (default: SentenceTransformers with all-MiniLM-L6-v2)
    # Only used for TEXT data_type; IMAGE uses ViT, VECTOR uses pre-computed
    embedding_model: Optional[EmbeddingModelInput] = None


@strawberry.enum
class SimilarityMeasure(Enum):
    """Similarity/distance metrics supported by ChromaDB."""
    COSINE = "cosine"
    L2 = "l2"
    IP = "ip"  # Inner product


@strawberry.enum
class FilterOperator(Enum):
    """Filter operators for ChromaDB where clauses."""
    EQ = "$eq"
    NE = "$ne"
    GT = "$gt"
    GTE = "$gte"
    LT = "$lt"
    LTE = "$lte"
    IN = "$in"
    NIN = "$nin"


@strawberry.input
class FilterInput:
    """Input for filtering collections."""
    field: str
    operator: FilterOperator
    value: JSON


@strawberry.type
class CollectionMetadata:
    """Metadata about a collection."""
    total_items: Optional[int] = None  # Generic item count
    total_words: Optional[int] = None  # Legacy: same as total_items
    embedding_dim: Optional[int] = None
    timestamp: Optional[str] = None
    pca_2d_variance: Optional[List[float]] = None
    pca_3d_variance: Optional[List[float]] = None
    # Source metadata (varies by data source)
    source_dataset: Optional[str] = None  # HuggingFace dataset ID
    source_split: Optional[str] = None
    source_file: Optional[str] = None  # Local file path
    embedded_columns: Optional[str] = None
    has_projections: Optional[bool] = None


@strawberry.type
class Collection:
    """Information about a collection."""
    name: str
    metadata: Optional[JSON] = None
    count: int


@strawberry.type
class EmbeddingItem:
    """Single embedding item with all associated data."""
    id: str
    word: Optional[str] = None
    definition: Optional[str] = None
    pos: Optional[str] = None
    embedding: Optional[List[float]] = None
    document: Optional[str] = None
    metadata: Optional[JSON] = None


@strawberry.type
class SemanticSearchResult:
    """Result from semantic search."""
    id: str
    document: Optional[str] = None
    metadata: Optional[JSON] = None  # All item metadata
    distance: float
    similarity: float
    embedding: Optional[List[float]] = None


@strawberry.type
class ProjectionData:
    """Complete projection data for visualization.

    Generic structure that works with any data source:
    - ids: unique identifiers for each item
    - documents: the main text content (what was embedded)
    - item_metadata: raw metadata per item (flexible schema)
    - available_fields: list of available metadata field names
    - Projections: PCA and UMAP coordinates
    """
    ids: List[str]
    documents: List[str]
    item_metadata: List[JSON]  # Raw metadata per item - flexible schema
    available_fields: List[str]  # What metadata fields are available
    # Projections
    pca_2d: List[List[float]]
    pca_3d: List[List[float]]
    umap_2d: List[List[float]]
    umap_3d: List[List[float]]
    # Collection-level metadata
    metadata: CollectionMetadata


def build_where_clause(filters: Optional[List[FilterInput]]) -> Optional[Dict[str, Any]]:
    """Build ChromaDB where clause from filter inputs.

    Args:
        filters: List of filter inputs

    Returns:
        ChromaDB where clause dictionary
    """
    if not filters:
        return None

    where = {}
    for f in filters:
        if f.operator == FilterOperator.EQ:
            where[f.field] = {"$eq": f.value}
        elif f.operator == FilterOperator.NE:
            where[f.field] = {"$ne": f.value}
        elif f.operator == FilterOperator.GT:
            where[f.field] = {"$gt": f.value}
        elif f.operator == FilterOperator.GTE:
            where[f.field] = {"$gte": f.value}
        elif f.operator == FilterOperator.LT:
            where[f.field] = {"$lt": f.value}
        elif f.operator == FilterOperator.LTE:
            where[f.field] = {"$lte": f.value}
        elif f.operator == FilterOperator.IN:
            where[f.field] = {"$in": f.value}
        elif f.operator == FilterOperator.NIN:
            where[f.field] = {"$nin": f.value}

    return where if where else None


@strawberry.type
class Query:
    """GraphQL query root."""

    @strawberry.field
    def collections(self, info) -> List[Collection]:
        """List all available collections.

        Returns:
            List of collections with metadata
        """
        from .chromadb_client import ChromaDBClient

        client = ChromaDBClient()
        collections = client.list_collections()

        return [
            Collection(
                name=col["name"],
                metadata=col["metadata"],
                count=col["count"]
            )
            for col in collections
        ]

    @strawberry.field
    def huggingface_dataset_info(self, dataset_id: str, info=None) -> HFDatasetInfo:
        """Get information about a HuggingFace dataset.

        Args:
            dataset_id: HuggingFace dataset ID (e.g., "squad", "glue")

        Returns:
            Dataset info with configs, splits, features, and metadata
        """
        from .huggingface_client import get_dataset_info as hf_get_info

        result = hf_get_info(dataset_id)

        # Convert dataclass to GraphQL type
        configs = []
        for cfg in result.configs:
            splits = [HFSplitInfo(name=s.name, num_rows=s.num_rows, num_bytes=s.num_bytes)
                      for s in cfg.splits]
            features = [HFFeatureInfo(name=f.name, dtype=f.dtype, description=f.description)
                        for f in cfg.features]
            configs.append(HFConfigInfo(name=cfg.name, splits=splits, features=features))

        return HFDatasetInfo(
            dataset_id=result.dataset_id,
            description=result.description,
            license=result.license,
            configs=configs,
            default_config=result.default_config,
            error=result.error
        )

    @strawberry.field
    def huggingface_dataset_preview(
        self,
        dataset_id: str,
        config: Optional[str] = None,
        split: str = "train",
        n_rows: int = 5,
        info=None
    ) -> HFDatasetPreview:
        """Get preview rows from a HuggingFace dataset.

        Args:
            dataset_id: HuggingFace dataset ID
            config: Configuration name (None for default)
            split: Split name (default: "train")
            n_rows: Number of rows to preview (default: 5)

        Returns:
            Preview with column names and sample rows
        """
        from .huggingface_client import get_dataset_preview as hf_get_preview

        result = hf_get_preview(dataset_id, config, split, n_rows)

        return HFDatasetPreview(
            dataset_id=result.dataset_id,
            config=result.config,
            split=result.split,
            columns=result.columns,
            rows=result.rows,
            total_rows=result.total_rows,
            error=result.error
        )

    @strawberry.field
    def local_file_info(self, file_path: str, info=None) -> LocalFileInfo:
        """Get information about a local data file.

        Args:
            file_path: Path to local file (parquet, json, csv)

        Returns:
            File info with columns, row count, and file metadata
        """
        print(f"DEBUG: local_file_info resolver called with file_path={file_path}")
        from .local_data_client import get_local_file_info as get_info

        try:
            result = get_info(file_path)
            print(f"DEBUG: get_info returned: {result}")
        except Exception as e:
            print(f"DEBUG: get_info raised exception: {e}")
            raise e

        return LocalFileInfo(
            file_path=result.file_path,
            file_type=result.file_type,
            columns=result.columns,
            num_rows=result.num_rows,
            file_size_bytes=result.file_size_bytes,
            error=result.error
        )

    @strawberry.field
    def local_file_preview(
        self,
        file_path: str,
        n_rows: int = 5,
        info=None
    ) -> LocalFilePreview:
        """Get preview rows from a local data file.

        Args:
            file_path: Path to local file
            n_rows: Number of rows to preview (default: 5)

        Returns:
            Preview with column names and sample rows
        """
        from .local_data_client import get_local_file_preview as get_preview

        result = get_preview(file_path, n_rows)

        return LocalFilePreview(
            file_path=result.file_path,
            columns=result.columns,
            rows=result.rows,
            total_rows=result.total_rows,
            error=result.error
        )

    @strawberry.field
    def collection(self, name: str, info) -> Optional[ProjectionData]:
        """Get complete projection data for a collection.

        Args:
            name: Collection name

        Returns:
            Projection data with PCA/UMAP projections from ChromaDB metadata.
            Generic structure - no hardcoded field names.
        """
        from .chromadb_client import ChromaDBClient

        client = ChromaDBClient()

        # Load projection data directly from ChromaDB metadata
        projection_data = client.get_projection_data(name)

        return ProjectionData(
            ids=projection_data["ids"],
            documents=projection_data["documents"],
            item_metadata=projection_data["item_metadata"],
            available_fields=projection_data["available_fields"],
            pca_2d=projection_data["pca_2d"],
            pca_3d=projection_data["pca_3d"],
            umap_2d=projection_data["umap_2d"],
            umap_3d=projection_data["umap_3d"],
            metadata=CollectionMetadata(**projection_data["metadata"])
        )

    @strawberry.field
    def embeddings(
        self,
        collection_name: str,
        limit: int = 100,
        offset: int = 0,
        filters: Optional[List[FilterInput]] = None,
        include_embeddings: bool = True,
        include_documents: bool = True,
        include_metadata: bool = True,
        info = None
    ) -> List[EmbeddingItem]:
        """Get embeddings from a collection with optional filtering.

        Args:
            collection_name: Name of the collection
            limit: Maximum number of items to return
            offset: Number of items to skip
            filters: List of filters to apply
            include_embeddings: Whether to include embedding vectors
            include_documents: Whether to include documents
            include_metadata: Whether to include metadata

        Returns:
            List of embedding items
        """
        from .chromadb_client import ChromaDBClient

        client = ChromaDBClient()

        # Build include list
        include = []
        if include_embeddings:
            include.append("embeddings")
        if include_documents:
            include.append("documents")
        if include_metadata:
            include.append("metadatas")

        # Build where clause
        where = build_where_clause(filters)

        # Get results
        results = client.get_all_items(
            collection_name=collection_name,
            limit=limit,
            offset=offset,
            where=where,
            include=include
        )

        # Convert to EmbeddingItem list
        items = []
        for i, item_id in enumerate(results["ids"]):
            item = EmbeddingItem(id=item_id)

            if "embeddings" in results and results["embeddings"]:
                item.embedding = results["embeddings"][i]

            if "documents" in results and results["documents"]:
                item.document = results["documents"][i]

            if "metadatas" in results and results["metadatas"]:
                metadata = results["metadatas"][i]
                item.word = metadata.get("word")
                item.definition = metadata.get("definition")
                item.pos = metadata.get("pos")
                item.metadata = metadata

            items.append(item)

        return items

    @strawberry.field
    def semantic_search(
        self,
        collection_name: str,
        query: Optional[str] = None,
        query_embedding: Optional[List[float]] = None,
        n_results: int = 10,
        similarity_measure: SimilarityMeasure = SimilarityMeasure.COSINE,
        filters: Optional[List[FilterInput]] = None,
        include_embeddings: bool = False,
        info = None
    ) -> List[SemanticSearchResult]:
        """Perform semantic search on a collection.

        Args:
            collection_name: Name of the collection
            query: Text query to search for
            query_embedding: Pre-computed query embedding vector
            n_results: Number of results to return
            similarity_measure: Similarity metric to use
            filters: List of filters to apply
            include_embeddings: Whether to include embedding vectors in results

        Returns:
            List of search results with similarities
        """
        from .chromadb_client import ChromaDBClient

        client = ChromaDBClient()

        # Build where clause
        where = build_where_clause(filters)

        # Perform search
        results = client.semantic_search(
            collection_name=collection_name,
            query_texts=[query] if query else None,
            query_embeddings=[query_embedding] if query_embedding else None,
            n_results=n_results,
            where=where,
            distance_metric=similarity_measure.value
        )

        # Convert to SemanticSearchResult list
        search_results = []
        if results["ids"]:
            for i, item_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
                document = results["documents"][0][i] if results.get("documents") else None
                distance = results["distances"][0][i]
                similarity = results["similarities"][0][i]

                result = SemanticSearchResult(
                    id=item_id,
                    document=document,
                    metadata=metadata,
                    distance=distance,
                    similarity=similarity
                )

                if include_embeddings and results.get("embeddings"):
                    result.embedding = results["embeddings"][0][i]

                search_results.append(result)

        return search_results

    @strawberry.field
    def semantic_search_by_id(
        self,
        collection_name: str,
        item_id: str,
        n_results: int = 10,
        similarity_measure: SimilarityMeasure = SimilarityMeasure.COSINE,
        filters: Optional[List[FilterInput]] = None,
        info = None
    ) -> List[SemanticSearchResult]:
        """Find similar items using an existing item's embedding.

        Args:
            collection_name: Name of the collection
            item_id: ID of the item to find similar items for
            n_results: Number of results to return
            similarity_measure: Similarity metric to use
            filters: List of filters to apply

        Returns:
            List of search results with similarities
        """
        from .chromadb_client import ChromaDBClient

        client = ChromaDBClient()
        collection = client.get_collection(collection_name)

        # Get the embedding for the item
        item_data = collection.get(
            ids=[item_id],
            include=["embeddings"]
        )

        # Check if embeddings exist and have data
        if (item_data is None or
            "embeddings" not in item_data or
            len(item_data["embeddings"]) == 0):
            return []

        query_embedding = item_data["embeddings"][0]

        # Build where clause
        where = build_where_clause(filters)

        # Perform search using the item's embedding
        results = client.semantic_search(
            collection_name=collection_name,
            query_texts=None,
            query_embeddings=[query_embedding],
            n_results=n_results + 1,  # +1 to account for the item itself
            where=where,
            distance_metric=similarity_measure.value
        )

        # Convert to SemanticSearchResult list, excluding the query item itself
        search_results = []
        if results["ids"]:
            for i, result_id in enumerate(results["ids"][0]):
                # Skip the item itself
                if result_id == item_id:
                    continue

                metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
                document = results["documents"][0][i] if results.get("documents") else None
                distance = results["distances"][0][i]
                similarity = results["similarities"][0][i]

                result = SemanticSearchResult(
                    id=result_id,
                    document=document,
                    metadata=metadata,
                    distance=distance,
                    similarity=similarity
                )

                search_results.append(result)

                # Stop once we have enough results (excluding the query item)
                if len(search_results) >= n_results:
                    break

        return search_results


@strawberry.type
class Mutation:
    """GraphQL mutation root."""

    @strawberry.mutation
    def embed_huggingface_dataset(self, input: EmbedDatasetInput, info=None) -> EmbedDatasetResult:
        """Embed a HuggingFace dataset into a ChromaDB collection.

        Args:
            input: Configuration for embedding the dataset

        Returns:
            Result with statistics about the embedding operation
        """
        from .embed_dataset import (
            embed_huggingface_dataset as do_embed,
            compute_projections_for_collection,
            EmbeddingConfig,
            EmbeddingModelConfig,
            EmbeddingProvider
        )
        from .huggingface_client import PortionConfig, PortionStrategy

        # Convert GraphQL input to EmbeddingConfig
        portion = None
        if input.portion:
            strategy_map = {
                PortionStrategyEnum.FIRST_N: PortionStrategy.FIRST_N,
                PortionStrategyEnum.RANDOM_SAMPLE: PortionStrategy.RANDOM_SAMPLE,
                PortionStrategyEnum.ROW_RANGE: PortionStrategy.ROW_RANGE,
                PortionStrategyEnum.ALL: PortionStrategy.ALL,
            }
            portion = PortionConfig(
                strategy=strategy_map[input.portion.strategy],
                n=input.portion.n,
                start=input.portion.start,
                end=input.portion.end,
                seed=input.portion.seed
            )

        # Convert embedding model input
        embedding_model = None
        if input.embedding_model:
            provider_map = {
                EmbeddingProviderEnum.SENTENCE_TRANSFORMERS: EmbeddingProvider.SENTENCE_TRANSFORMERS,
                EmbeddingProviderEnum.OPENAI: EmbeddingProvider.OPENAI,
                EmbeddingProviderEnum.COHERE: EmbeddingProvider.COHERE,
                EmbeddingProviderEnum.OLLAMA: EmbeddingProvider.OLLAMA,
                EmbeddingProviderEnum.HUGGINGFACE_API: EmbeddingProvider.HUGGINGFACE_API,
            }
            embedding_model = EmbeddingModelConfig(
                provider=provider_map[input.embedding_model.provider],
                model_name=input.embedding_model.model_name,
                ollama_url=input.embedding_model.ollama_url
            )

        config = EmbeddingConfig(
            dataset_id=input.dataset_id,
            collection_name=input.collection_name,
            config=input.config,
            split=input.split,
            columns=input.columns,
            text_template=input.text_template,
            id_column=input.id_column,
            portion=portion,
            metadata_columns=input.metadata_columns,
            embedding_model=embedding_model
        )

        # Run embedding
        result = do_embed(config)

        # Compute projections if requested and embedding succeeded
        projections_computed = False
        if input.compute_projections and result.error is None and result.total_embedded > 0:
            projections_computed = compute_projections_for_collection(input.collection_name)

        return EmbedDatasetResult(
            collection_name=result.collection_name,
            total_embedded=result.total_embedded,
            embedding_dim=result.embedding_dim,
            device=result.device,
            duration_seconds=result.duration_seconds,
            projections_computed=projections_computed,
            error=result.error,
            embedding_provider=result.embedding_provider,
            embedding_model=result.embedding_model
        )

    @strawberry.mutation
    def embed_local_file(self, input: EmbedLocalFileInput, info=None) -> EmbedDatasetResult:
        """Embed a local file (parquet/json/csv) into a ChromaDB collection.

        Supports text, image, and pre-computed vector embeddings.

        Args:
            input: Configuration for embedding the local file

        Returns:
            Result with statistics about the embedding operation
        """
        from .embed_dataset import (
            embed_local_file as do_embed,
            compute_projections_for_collection,
            LocalFileEmbeddingConfig,
            DataType,
            EmbeddingModelConfig,
            EmbeddingProvider
        )

        # Convert GraphQL enum to internal enum
        data_type_map = {
            DataTypeEnum.TEXT: DataType.TEXT,
            DataTypeEnum.IMAGE: DataType.IMAGE,
            DataTypeEnum.VECTOR: DataType.VECTOR,
        }

        # Convert embedding model input
        embedding_model = None
        if input.embedding_model:
            provider_map = {
                EmbeddingProviderEnum.SENTENCE_TRANSFORMERS: EmbeddingProvider.SENTENCE_TRANSFORMERS,
                EmbeddingProviderEnum.OPENAI: EmbeddingProvider.OPENAI,
                EmbeddingProviderEnum.COHERE: EmbeddingProvider.COHERE,
                EmbeddingProviderEnum.OLLAMA: EmbeddingProvider.OLLAMA,
                EmbeddingProviderEnum.HUGGINGFACE_API: EmbeddingProvider.HUGGINGFACE_API,
            }
            embedding_model = EmbeddingModelConfig(
                provider=provider_map[input.embedding_model.provider],
                model_name=input.embedding_model.model_name,
                ollama_url=input.embedding_model.ollama_url
            )

        config = LocalFileEmbeddingConfig(
            file_path=input.file_path,
            collection_name=input.collection_name,
            data_type=data_type_map[input.data_type],
            columns=input.columns,
            text_template=input.text_template,
            image_column=input.image_column,
            vector_column=input.vector_column,
            id_column=input.id_column,
            metadata_columns=input.metadata_columns,
            n_rows=input.n_rows,
            sample_n=input.sample_n,
            sample_seed=input.sample_seed,
            embedding_model=embedding_model
        )

        # Run embedding
        result = do_embed(config)

        # Compute projections if requested and embedding succeeded
        projections_computed = False
        if input.compute_projections and result.error is None and result.total_embedded > 0:
            projections_computed = compute_projections_for_collection(input.collection_name)

        return EmbedDatasetResult(
            collection_name=result.collection_name,
            total_embedded=result.total_embedded,
            embedding_dim=result.embedding_dim,
            device=result.device,
            duration_seconds=result.duration_seconds,
            projections_computed=projections_computed,
            error=result.error,
            embedding_provider=result.embedding_provider,
            embedding_model=result.embedding_model
        )

    @strawberry.mutation
    def delete_collection(self, collection_name: str, info=None) -> bool:
        """Delete a collection from ChromaDB.

        Args:
            collection_name: Name of the collection to delete

        Returns:
            True if deleted successfully, False otherwise
        """
        from .chromadb_client import ChromaDBClient

        try:
            client = ChromaDBClient()
            client.client.delete_collection(name=collection_name)
            return True
        except Exception:
            return False


# Create schema with query and mutation
schema = strawberry.Schema(query=Query, mutation=Mutation)
