/**
 * GraphQL queries for embedding visualization
 */

import { gql } from '@apollo/client';

/**
 * Query to get all available collections
 */
export const GET_COLLECTIONS = gql`
  query GetCollections {
    collections {
      name
      count
      metadata
    }
  }
`;

/**
 * Query to get complete collection data with projections
 */
export const GET_COLLECTION = gql`
  query GetCollection($name: String!) {
    collection(name: $name) {
      words
      definitions
      pos
      pca2d
      pca3d
      umap2d
      umap3d
      metadata {
        totalWords
        embeddingDim
        embeddingProvider
        embeddingModel
        timestamp
        pca2dVariance
        pca3dVariance
      }
    }
  }
`;

/**
 * Query to find semantically similar items using a text query (embeds the query)
 */
export const SEMANTIC_SEARCH = gql`
  query SemanticSearch(
    $collectionName: String!
    $query: String!
    $nResults: Int = 10
    $similarityMeasure: SimilarityMeasure = COSINE
  ) {
    semanticSearch(
      collectionName: $collectionName
      query: $query
      nResults: $nResults
      similarityMeasure: $similarityMeasure
    ) {
      id
      document
      metadata
      similarity
      distance
    }
  }
`;

/**
 * Query to find semantically similar items using an existing item's embedding (faster)
 */
export const SEMANTIC_SEARCH_BY_ID = gql`
  query SemanticSearchById(
    $collectionName: String!
    $itemId: String!
    $nResults: Int = 10
    $similarityMeasure: SimilarityMeasure = COSINE
  ) {
    semanticSearchById(
      collectionName: $collectionName
      itemId: $itemId
      nResults: $nResults
      similarityMeasure: $similarityMeasure
    ) {
      id
      document
      metadata
      similarity
      distance
    }
  }
`;

/**
 * Query to get a preview of collection items (first N items)
 */
export const GET_COLLECTION_PREVIEW = gql`
  query GetCollectionPreview(
    $collectionName: String!
    $limit: Int = 5
  ) {
    embeddings(
      collectionName: $collectionName
      limit: $limit
      offset: 0
      includeEmbeddings: false
      includeDocuments: true
      includeMetadata: true
    ) {
      id
      document
      metadata
    }
  }
`;
