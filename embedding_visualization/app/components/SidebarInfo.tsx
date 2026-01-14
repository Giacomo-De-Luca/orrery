import type { ReactNode } from 'react';
import { Card, CardContent } from '@/lib/ui-primitives/card';
import { Badge } from '@/lib/ui-primitives/badge';
import { VisualizationControls } from './VisualizationControls';
import { SelectedPointCard } from './SelectedPointCard';
import type { VisualizationState, Point2D, Point3D } from '../../lib/types/types';

interface SidebarInfoProps {
  state: VisualizationState;
  onStateChange: (newState: Partial<VisualizationState>) => void;
  embeddingDim: number;
  metadata: {
    pca_2d_variance: number[];
    pca_3d_variance: number[];
  };
  selectedPoint: Point2D | Point3D | null;
  searchQuery?: string;
  highlightedCount?: number;
  extraContent?: ReactNode;
}

export function SidebarInfo({
  state,
  onStateChange,
  embeddingDim,
  metadata,
  selectedPoint,
  searchQuery,
  highlightedCount,
  extraContent,
}: SidebarInfoProps) {
  const hasSearch = Boolean(searchQuery && searchQuery.trim().length > 0);
  const showSearchSummary = hasSearch && highlightedCount !== undefined;

  return (
    <div className="space-y-6">
      <VisualizationControls
        state={state}
        onStateChange={onStateChange}
        embeddingDim={embeddingDim}
        metadata={metadata}
      />

      {selectedPoint && (
        <SelectedPointCard point={selectedPoint} />
      )}

      {showSearchSummary && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800">
              Found <Badge variant="outline" className="mx-1">{highlightedCount}</Badge>
              matching {highlightedCount === 1 ? 'word' : 'words'}
            </p>
          </CardContent>
        </Card>
      )}

      {extraContent}
    </div>
  );
}
