'use client';

import { useMemo } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/lib/ui-primitives/resizable';
import { ScatterPlot2D } from './ScatterPlot2D';
import { ScatterPlot3D } from './ScatterPlot3D';
import { Legend } from './Legend';
import { SimilarItemsTable } from './SimilarItemsTable';
import type {
  VisualizationState,
  Point2D,
  Point3D,
  SemanticSearchResult,
  HighlightMap,
} from '../../lib/types/types';

interface DashboardPanelProps {
  state: VisualizationState;
  points2d: Point2D[];
  points3d: Point3D[];
  highlightedIndices?: HighlightMap;
  onPointClick: (point: Point2D | Point3D) => void;
  selectedPoint?: Point2D | Point3D | null;
  // Search results panel props
  semanticSearchResults: SemanticSearchResult[] | null;
  searchQueryLabel: string | null;
}

export function DashboardPanel({
  state,
  points2d,
  points3d,
  highlightedIndices,
  onPointClick,
  selectedPoint,
  semanticSearchResults,
  searchQueryLabel,
}: DashboardPanelProps) {
  const is2D = state.mode === '2d';
  const colorByField = state.colorByField;

  // Compute category values from the points when colorByField is set
  const categoryValues = useMemo(() => {
    if (!colorByField) return [];

    const uniqueValues = new Set<string>();
    const points = is2D ? points2d : points3d;

    for (const point of points) {
      const value = point.metadata?.[colorByField];
      if (value !== null && value !== undefined && value !== '') {
        uniqueValues.add(String(value));
      }
    }

    return Array.from(uniqueValues).sort();
  }, [colorByField, is2D, points2d, points3d]);

  const showLegend = colorByField && categoryValues.length > 0;
  const showResultsTable = semanticSearchResults && semanticSearchResults.length > 0;

  // Convert colorByField to the 'category' | 'none' format expected by scatter plots
  const colorBy = colorByField ? 'category' : 'none';

  const plot = is2D ? (
    <ScatterPlot2D
      points={points2d}
      colorBy={colorBy}
      categoryField={colorByField}
      categoryValues={categoryValues}
      highlightedIndices={highlightedIndices}
      selectedPoint={selectedPoint as Point2D | null}
      onPointClick={onPointClick}
      showOnlyHighlighted={state.showOnlyHighlighted}
      showLabels={state.showLabels}
    />
  ) : (
    <ScatterPlot3D
      points={points3d}
      colorBy={colorBy}
      categoryField={colorByField}
      categoryValues={categoryValues}
      highlightedIndices={highlightedIndices}
      selectedPoint={selectedPoint as Point3D | null}
      onPointClick={onPointClick}
      showOnlyHighlighted={state.showOnlyHighlighted}
      showLabels={state.showLabels}
    />
  );

  return (
    <div className="h-full w-full">
      <ResizablePanelGroup
        direction="vertical"
        className="h-full w-full rounded-lg border"
      >
        {/* Top section: Plot + Legend Overlay */}
        <ResizablePanel defaultSize={showResultsTable ? 70 : 100} minSize={30} className="relative">
          {/* Plot Background */}
          <div className="absolute inset-0 z-0">
            <div className="h-full w-full rounded-lg text-card-foreground shadow-sm">
              {plot}
            </div>
          </div>

          {/* Legend Overlay */}
          {showLegend && colorByField && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                {/* Spacer - transparent */}
                <ResizablePanel defaultSize={80} minSize={50} className="bg-transparent" />
                
                <ResizableHandle className="bg-transparent hover:bg-border/30 w-2 pointer-events-auto" />
                
                {/* Legend Panel */}
                <ResizablePanel defaultSize={20} minSize={15} maxSize={50} className="pointer-events-none">
                  <div className="flex flex-col h-full pt-12 pb-2 pr-2 pl-2 pointer-events-none">
                    <div className="flex flex-col overflow-hidden rounded-lg border bg-background/90 backdrop-blur shadow-sm max-h-full pointer-events-auto">
                      <div className="overflow-y-auto p-2">
                        <Legend
                          categoryField={colorByField}
                          categoryValues={categoryValues}
                        />
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          )}
        </ResizablePanel>

        {/* Bottom section: Results table (only show when there are results) */}
        {showResultsTable && (
          <>
            <ResizableHandle className="bg-transparent hover:bg-border/30 h-2" />
            <ResizablePanel defaultSize={30} minSize={15} maxSize={60}>
              <div className="h-full overflow-y-auto p-2">
                <SimilarItemsTable
                  results={semanticSearchResults}
                  queryLabel={searchQueryLabel}
                  categoryField={colorByField}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
