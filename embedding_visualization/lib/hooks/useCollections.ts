'use client';

import { useQuery } from '@apollo/client/react';
import { GET_COLLECTIONS } from '../graphql/queries';
import type { CollectionsManifest } from '../types/types';

interface GraphQLCollection {
  name: string;
  count: number;
  metadata: any;
}

interface CollectionsData {
  collections: GraphQLCollection[];
}

export function useCollections() {
  const { data, loading, error } = useQuery<CollectionsData>(GET_COLLECTIONS);

  // Transform GraphQL response to CollectionsManifest format
  const collections: CollectionsManifest | null = data?.collections
    ? data.collections.reduce((acc, col) => {
        acc[col.name] = {
          name: col.name,
          display_name: col.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          count: col.count,
          embedding_dim: col.metadata?.embedding_dim || 384,
          timestamp: col.metadata?.timestamp || '',
          source_dataset: col.metadata?.source_dataset,
          has_projections: col.metadata?.has_projections,
        };
        return acc;
      }, {} as CollectionsManifest)
    : null;

  return { collections, loading, error: error || null };
}
