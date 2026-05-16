'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils/utils';
import { Badge } from '@/lib/ui-primitives/badge';
import type { LayerActivationsResult, ActiveFeatureResult } from '@/lib/graphql/mutations';

interface PromptTokenActivationsProps {
  layers: LayerActivationsResult[];
  tokenStrings: string[];
  onFeatureSelect?: (featureIndex: number) => void;
}

/**
 * Displays per-token SAE feature activations as an interactive token strip.
 * Each token is colored by its aggregate activation. Clicking a token reveals
 * the top-k features active at that position.
 */
export function PromptTokenActivations({
  layers,
  tokenStrings,
  onFeatureSelect,
}: PromptTokenActivationsProps) {
  const [selectedLayer, setSelectedLayer] = useState<number>(0);
  const [selectedTokenIdx, setSelectedTokenIdx] = useState<number | null>(null);

  const layerData = layers[selectedLayer];
  if (!layerData) return null;

  // Compute max activation per token (for heatmap coloring)
  const tokenMaxActivations = useMemo(() => {
    return layerData.tokens.map((t) => {
      if (t.features.length === 0) return 0;
      return Math.max(...t.features.map((f) => f.activation));
    });
  }, [layerData]);

  const globalMax = useMemo(() => Math.max(...tokenMaxActivations, 0.01), [tokenMaxActivations]);

  // Features for the currently selected token
  const selectedFeatures: ActiveFeatureResult[] = useMemo(() => {
    if (selectedTokenIdx === null) return [];
    const tokenData = layerData.tokens[selectedTokenIdx];
    if (!tokenData) return [];
    return [...tokenData.features].sort((a, b) => b.activation - a.activation);
  }, [layerData, selectedTokenIdx]);

  return (
    <div className="space-y-3">
      {/* Layer selector (if multiple layers) */}
      {layers.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Layer:</span>
          <div className="flex gap-1 flex-wrap">
            {layers.map((l, i) => (
              <button
                key={l.layer}
                onClick={() => { setSelectedLayer(i); setSelectedTokenIdx(null); }}
                className={cn(
                  'px-2 py-0.5 text-xs rounded border transition-colors',
                  i === selectedLayer
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted',
                )}
              >
                {l.layer}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Token strip with heatmap */}
      <div className="border rounded-md p-3 bg-card">
        <p className="text-[10px] text-muted-foreground mb-2">
          Click a token to see its top features (Layer {layerData.layer}, {layerData.width})
        </p>
        <div className="leading-relaxed font-mono text-xs flex flex-wrap">
          {layerData.tokens.map((tokenData, i) => {
            const intensity = globalMax > 0 ? tokenMaxActivations[i] / globalMax : 0;
            const r = 255;
            const g = Math.round(165 - intensity * 100);
            const b = Math.round(50 - intensity * 50);
            const a = Math.min(0.9, intensity * 0.85 + 0.05);
            const bgColor = intensity > 0.01 ? `rgba(${r}, ${g}, ${b}, ${a})` : 'transparent';
            const isSelected = i === selectedTokenIdx;

            return (
              <span
                key={i}
                className={cn(
                  'px-[1px] py-[1px] cursor-pointer transition-all duration-75 whitespace-pre',
                  isSelected && 'ring-2 ring-primary rounded-sm',
                )}
                style={{ backgroundColor: bgColor }}
                onClick={() => setSelectedTokenIdx(i === selectedTokenIdx ? null : i)}
              >
                <span className={intensity > 0.5 ? 'text-white dark:text-white' : 'text-foreground'}>
                  {tokenStrings[tokenData.position] ?? tokenData.token}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Selected token feature list */}
      {selectedTokenIdx !== null && (
        <div className="border rounded-md overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 border-b">
            <span className="text-xs font-medium text-muted-foreground">
              Features at position {selectedTokenIdx}: &ldquo;
              <span className="font-mono">{tokenStrings[selectedTokenIdx]}</span>
              &rdquo;
            </span>
          </div>
          {selectedFeatures.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-3">No features active at this position.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-3 py-1.5 font-medium text-xs text-muted-foreground w-16">#</th>
                  <th className="text-left px-3 py-1.5 font-medium text-xs text-muted-foreground">Label</th>
                  <th className="text-right px-3 py-1.5 font-medium text-xs text-muted-foreground w-24">Activation</th>
                </tr>
              </thead>
              <tbody>
                {selectedFeatures.map((feat) => (
                  <tr
                    key={feat.index}
                    className="border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => onFeatureSelect?.(feat.index)}
                  >
                    <td className="px-3 py-1.5">
                      <Badge variant="outline" className="font-mono text-xs">
                        {feat.index}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-xs truncate max-w-xs" title={feat.label}>
                      {feat.label || <span className="text-muted-foreground italic">no label</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {feat.activation.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
