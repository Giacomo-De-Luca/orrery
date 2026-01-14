"""GraphQL API module for embedding visualization backend."""

import strawberry

from .queries import Query
from .mutations import Mutation
from .types import (
    # Scalars
    JSON,
    # HuggingFace types
    HFSplitInfo,
    HFFeatureInfo,
    HFConfigInfo,
    HFDatasetInfo,
    HFDatasetPreview,
    PortionStrategyEnum,
    PortionInput,
    # Embedding model types
    EmbeddingProviderEnum,
    EmbeddingModelInput,
    EmbedDatasetInput,
    EmbedDatasetResult,
    # Local file types
    LocalFileInfo,
    LocalFilePreview,
    DataTypeEnum,
    EmbedLocalFileInput,
    # Search & filter types
    SimilarityMeasure,
    FilterOperator,
    FilterInput,
    # Collection types
    CollectionMetadata,
    Collection,
    EmbeddingItem,
    SemanticSearchResult,
    ProjectionData,
    # Helper functions
    build_where_clause,
)

# Create the schema
schema = strawberry.Schema(query=Query, mutation=Mutation)

__all__ = [
    # Schema
    "schema",
    # Resolvers
    "Query",
    "Mutation",
    # All types
    "JSON",
    "HFSplitInfo",
    "HFFeatureInfo",
    "HFConfigInfo",
    "HFDatasetInfo",
    "HFDatasetPreview",
    "PortionStrategyEnum",
    "PortionInput",
    "EmbeddingProviderEnum",
    "EmbeddingModelInput",
    "EmbedDatasetInput",
    "EmbedDatasetResult",
    "LocalFileInfo",
    "LocalFilePreview",
    "DataTypeEnum",
    "EmbedLocalFileInput",
    "SimilarityMeasure",
    "FilterOperator",
    "FilterInput",
    "CollectionMetadata",
    "Collection",
    "EmbeddingItem",
    "SemanticSearchResult",
    "ProjectionData",
    "build_where_clause",
]
