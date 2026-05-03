'use client';

import type { SaeFeatureSearchResult } from '@/lib/types/types';
import { Badge } from '@/lib/ui-primitives/badge';

export interface SemanticFeatureResult {
  featureIndex: number;
  label: string | null;
  density: number | null;
  similarity: number;
}

interface FeatureSearchResultsProps {
  results: SaeFeatureSearchResult[];
  onSelect: (featureIndex: number) => void;
  selectedIndex: number | null;
  mode?: 'text' | 'semantic';
  semanticResults?: SemanticFeatureResult[];
}

/**
 * Table of feature search results. Click a row to navigate to that feature.
 * Supports text mode (shows density) and semantic mode (shows similarity).
 */
export function FeatureSearchResults({
  results,
  onSelect,
  selectedIndex,
  mode = 'text',
  semanticResults,
}: FeatureSearchResultsProps) {
  const isSemanticMode = mode === 'semantic' && semanticResults;

  // Normalize rows to a common shape
  const rows = isSemanticMode
    ? semanticResults.map((r) => ({
        featureIndex: r.featureIndex,
        label: r.label,
        value: r.similarity,
      }))
    : results.map((r) => ({
        featureIndex: r.feature.featureIndex,
        label: r.feature.label,
        value: r.feature.density,
      }));

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No features found.</p>;
  }

  const valueLabel = isSemanticMode ? 'Similarity' : 'Density';

  return (
    <div className="border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-16">#</th>
            <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Label</th>
            <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground w-24">
              {valueLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = row.featureIndex === selectedIndex;
            return (
              <tr
                key={row.featureIndex}
                className={`border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50 ${
                  isSelected ? 'bg-accent' : ''
                }`}
                onClick={() => onSelect(row.featureIndex)}
              >
                <td className="px-3 py-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {row.featureIndex}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs truncate max-w-xs" title={row.label ?? ''}>
                  {row.label ?? <span className="text-muted-foreground italic">no label</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
                  {row.value != null
                    ? isSemanticMode
                      ? row.value.toFixed(4)
                      : (row.value < 0.001 ? row.value.toExponential(2) : row.value.toFixed(4))
                    : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
