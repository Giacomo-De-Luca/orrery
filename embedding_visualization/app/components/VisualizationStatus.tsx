'use client';

import { Card, CardContent } from '@/lib/ui-primitives/card';
import { Badge } from '@/lib/ui-primitives/badge';
import type { VisualizationState, EmbeddingMetadata } from '../../lib/types/types';

interface VisualizationStatusProps {
  state: VisualizationState;
  metadata: Pick<EmbeddingMetadata, 'pca_2d_variance' | 'pca_3d_variance'>;
}

export function VisualizationStatus({ state, metadata }: VisualizationStatusProps) {
  const is2D = state.mode === '2d';
  const showVariance = state.method === 'pca';
  const variance = is2D ? metadata.pca_2d_variance : metadata.pca_3d_variance;
  const variancePct = variance ? variance.reduce((a, b) => a + b, 0) * 100 : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">
            {state.method.toUpperCase()}
          </Badge>
          <Badge variant="outline">
            {is2D ? '2D' : '3D'}
          </Badge>
          {showVariance && (
            <Badge variant="outline">
              {variancePct.toFixed(2)}% variance
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
