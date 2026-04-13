import { useMemo } from 'react';
import type { EmbeddingData, SemanticSearchResult, HighlightMap } from '../types/types';

/**
 * Combines highlighted indices from semantic search and topic selection.
 *
 * Returns a Map where:
 * - Keys: point indices to highlight
 * - Values: similarity scores (0-1)
 *   - Selected point: 1.0 (it's the center of semantic search)
 *   - Semantic search results: actual similarity score
 *   - Topic-selected points: 1.0 (membership match)
 */
export function useHighlightedIndices(
  semanticSearchResults: SemanticSearchResult[] | null,
  data: EmbeddingData | null,
  selectedPointIndex?: number,
  topicHighlightMap?: HighlightMap
): HighlightMap | undefined {
  // Build id→index lookup once when data loads — O(n) one-time cost
  const idToIndex = useMemo(() => {
    if (!data) return null;
    const map = new Map<string, number>();
    for (let i = 0; i < data.ids.length; i++) {
      map.set(data.ids[i], i);
    }
    return map;
  }, [data]);

  return useMemo(() => {
    const highlightMap = new Map<number, number>();

    // Add selected point with similarity 1.0 (it's the center of semantic search)
    // This ensures the clicked point is always highlighted and can have lines drawn to it
    if (selectedPointIndex !== undefined && semanticSearchResults && semanticSearchResults.length > 0) {
      highlightMap.set(selectedPointIndex, 1.0);
    }

    // O(k) lookup via pre-built idToIndex — only iterates ~20 search results, not all data
    if (semanticSearchResults && semanticSearchResults.length > 0 && idToIndex) {
      for (const r of semanticSearchResults) {
        const index = idToIndex.get(r.id);
        if (index !== undefined) {
          const current = highlightMap.get(index);
          if (current === undefined || r.similarity > current) {
            highlightMap.set(index, r.similarity);
          }
        }
      }
    }

    // Merge topic highlights (max-similarity logic)
    if (topicHighlightMap && topicHighlightMap.size > 0) {
      topicHighlightMap.forEach((score, index) => {
        const current = highlightMap.get(index);
        if (current === undefined || score > current) {
          highlightMap.set(index, score);
        }
      });
    }

    // Return undefined if empty for backward compatibility
    return highlightMap.size > 0 ? highlightMap : undefined;
  }, [semanticSearchResults, idToIndex, selectedPointIndex, topicHighlightMap]);
}
