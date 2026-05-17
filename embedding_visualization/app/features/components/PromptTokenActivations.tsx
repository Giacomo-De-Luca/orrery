'use client';

import { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils/utils';
import type { LayerActivationsResult, ActiveFeatureResult } from '@/lib/graphql/mutations';

export interface SelectedTokenInfo {
  tokenIdx: number;
  token: string;
  features: ActiveFeatureResult[];
}

interface PromptTokenActivationsProps {
  layers: LayerActivationsResult[];
  tokenStrings: string[];
  /** Called when a token is selected (click) or deselected (click again). */
  onTokenSelect?: (info: SelectedTokenInfo | null) => void;
}

/**
 * Interactive token strip with heatmap coloring by activation intensity.
 * Hover shows numeric activation value. Click selects/deselects a token.
 */
export function PromptTokenActivations({
  layers,
  tokenStrings,
  onTokenSelect,
}: PromptTokenActivationsProps) {
  const [selectedLayer, setSelectedLayer] = useState<number>(0);
  const [selectedTokenIdx, setSelectedTokenIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const layerData = layers[selectedLayer];
  if (!layerData) return null;

  // Max activation per token (for heatmap)
  const tokenMaxActivations = useMemo(() => {
    return layerData.tokens.map((t) => {
      if (t.features.length === 0) return 0;
      return Math.max(...t.features.map((f) => f.activation));
    });
  }, [layerData]);

  const globalMax = useMemo(() => Math.max(...tokenMaxActivations, 0.01), [tokenMaxActivations]);

  const handleTokenClick = useCallback((i: number) => {
    const newIdx = i === selectedTokenIdx ? null : i;
    setSelectedTokenIdx(newIdx);
    if (newIdx === null) {
      onTokenSelect?.(null);
    } else {
      const tokenData = layerData.tokens[newIdx];
      if (tokenData) {
        const sorted = [...tokenData.features].sort((a, b) => b.activation - a.activation);
        onTokenSelect?.({
          tokenIdx: newIdx,
          token: tokenStrings[tokenData.position] ?? tokenData.token,
          features: sorted,
        });
      }
    }
  }, [selectedTokenIdx, layerData, tokenStrings, onTokenSelect]);

  return (
    <div className="space-y-2">
      {/* Layer selector (if multiple layers) */}
      {layers.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Layer:</span>
          <div className="flex gap-1 flex-wrap">
            {layers.map((l, i) => (
              <button
                key={l.layer}
                onClick={() => { setSelectedLayer(i); setSelectedTokenIdx(null); onTokenSelect?.(null); }}
                className={cn(
                  'px-2 py-0.5 text-[10px] rounded border transition-colors',
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

      {/* Token strip */}
      <div className="border rounded-md p-2 bg-card">
        <p className="text-[10px] text-muted-foreground mb-1">
          Click a token to see its features (Layer {layerData.layer})
        </p>
        <div className="relative leading-relaxed font-mono text-xs flex flex-wrap">
          {layerData.tokens.map((tokenData, i) => {
            const intensity = globalMax > 0 ? tokenMaxActivations[i] / globalMax : 0;
            const r = 255;
            const g = Math.round(165 - intensity * 100);
            const b = Math.round(50 - intensity * 50);
            const a = Math.min(0.9, intensity * 0.85 + 0.05);
            const bgColor = intensity > 0.01 ? `rgba(${r}, ${g}, ${b}, ${a})` : 'transparent';
            const isSelected = i === selectedTokenIdx;
            const isHovered = i === hoveredIdx;

            return (
              <span
                key={i}
                className={cn(
                  'px-[1px] py-[1px] cursor-pointer transition-all duration-75 whitespace-pre',
                  isSelected && 'ring-2 ring-primary rounded-sm',
                )}
                style={{ backgroundColor: bgColor }}
                onClick={() => handleTokenClick(i)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <span className={intensity > 0.5 ? 'text-white dark:text-white' : 'text-foreground'}>
                  {tokenStrings[tokenData.position] ?? tokenData.token}
                </span>
                {isHovered && (
                  <span className="absolute z-10 -mt-7 px-1.5 py-0.5 text-[10px] bg-popover text-popover-foreground border rounded shadow-md whitespace-nowrap pointer-events-none">
                    {tokenMaxActivations[i].toFixed(2)} ({tokenData.features.length} features)
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
