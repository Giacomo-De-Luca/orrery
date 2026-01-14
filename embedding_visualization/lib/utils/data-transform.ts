import { SemanticSearchResult } from "../types/types";

/**
 * Helper to extract label from metadata.
 * Tries common label fields in priority order.
 */
export function extractLabel(metadata: Record<string, unknown>, id: string): string {
  const labelFields = ['word', 'title', 'name', 'label', 'text'];
  for (const field of labelFields) {
    const value = metadata[field];
    if (value && typeof value === 'string') {
      return value;
    }
  }
  return id;
}

/**
 * Transforms raw search results into SemanticSearchResult objects.
 */
export function transformSearchResults(
  results: any[] | null, 
  colorByField: string | null
): SemanticSearchResult[] {
  return (results || []).map((r) => {
    const metadata = r.metadata || {};
    return {
      id: r.id,
      label: extractLabel(metadata, r.id),
      document: r.document || '',
      category: colorByField ? String(metadata[colorByField] || '') : '',
      similarity: r.similarity,
      distance: r.distance,
      metadata,
    };
  });
}
