'use client';

import type { SaeFeature } from '@/lib/types/types';
import { Badge } from '@/lib/ui-primitives/badge';
import { LogitBarChart } from './LogitBarChart';

interface FeatureDetailCardProps {
  feature: SaeFeature;
}

/**
 * Card showing feature metadata: label, density, and top/bottom logit charts.
 */
export function FeatureDetailCard({ feature }: FeatureDetailCardProps) {
  return (
    <div className="space-y-4">
      {/* Header: index + density */}
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="font-mono text-sm shrink-0">
          #{feature.featureIndex}
        </Badge>
        {feature.density != null && (
          <Badge variant="secondary" className="font-mono text-xs shrink-0">
            density: {feature.density < 0.001
              ? feature.density.toExponential(2)
              : feature.density.toFixed(4)}
          </Badge>
        )}
      </div>

      {/* Label / explanation */}
      {feature.label && (
        <p className="text-sm leading-relaxed">{feature.label}</p>
      )}

      {/* Logit charts side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Top Logits
          </h4>
          <LogitBarChart
            entries={feature.topLogits ?? []}
            variant="positive"
          />
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Bottom Logits
          </h4>
          <LogitBarChart
            entries={feature.bottomLogits ?? []}
            variant="negative"
          />
        </div>
      </div>
    </div>
  );
}
