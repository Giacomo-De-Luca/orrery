'use client';

import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/lib/ui-primitives/radio-group';
import { Label } from '@/lib/ui-primitives/label';
import { Input } from '@/lib/ui-primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/lib/ui-primitives/select';
import { Separator } from '@/lib/ui-primitives/separator';
import { Checkbox } from '@/lib/ui-primitives/checkbox';
import { DebouncedSearchInput } from './DebouncedSearchInput';
import type { ProjectionMethod, DimensionMode, DistanceMetric, VisualizationState, CategoryFieldOption } from '../../lib/types/types';

interface VisualizationControlsProps {
  state: VisualizationState;
  onStateChange: (newState: Partial<VisualizationState>) => void;
  embeddingDim: number;
  metadata?: {
    pca_2d_variance?: number[];
    pca_3d_variance?: number[];
  };
  categoryFieldOptions?: CategoryFieldOption[];
  hasHighlights?: boolean;
}

export function VisualizationControls({
  state,
  onStateChange,
  embeddingDim,
  metadata,
  categoryFieldOptions,
  hasHighlights = false,
}: VisualizationControlsProps) {
  return (
    <div className="space-y-6">
        {/* Projection Method */}
        <div className="space-y-3">
          <Label className="text-base">Projection Method</Label>
          <RadioGroup
            value={state.method}
            onValueChange={(value) => onStateChange({ method: value as ProjectionMethod })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pca" id="method-pca" />
              <Label htmlFor="method-pca" className="font-normal cursor-pointer">
                PCA (Principal Component Analysis)
              </Label>
            </div>
            {metadata?.pca_2d_variance && state.mode === '2d' && state.method === 'pca' && (
              <p className="text-xs text-muted-foreground ml-6">
                Explained variance: {(metadata.pca_2d_variance.reduce((a, b) => a + b, 0) * 100).toFixed(2)}%
              </p>
            )}
            {metadata?.pca_3d_variance && state.mode === '3d' && state.method === 'pca' && (
              <p className="text-xs text-muted-foreground ml-6">
                Explained variance: {(metadata.pca_3d_variance.reduce((a, b) => a + b, 0) * 100).toFixed(2)}%
              </p>
            )}

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="umap" id="method-umap" />
              <Label htmlFor="method-umap" className="font-normal cursor-pointer">
                UMAP (Uniform Manifold Approximation)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="method-manual" />
              <Label htmlFor="method-manual" className="font-normal cursor-pointer">
                Manual Dimension Selection
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Dimension Mode */}
        <div className="space-y-3">
          <Label className="text-base">Dimensions</Label>
          <RadioGroup
            value={state.mode}
            onValueChange={(value) => onStateChange({ mode: value as DimensionMode })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2d" id="mode-2d" />
              <Label htmlFor="mode-2d" className="font-normal cursor-pointer">
                2D
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3d" id="mode-3d" />
              <Label htmlFor="mode-3d" className="font-normal cursor-pointer">
                3D
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Manual Dimension Selection */}
        {state.method === 'manual' && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-base">Select Dimensions (0-{embeddingDim - 1})</Label>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dim-x" className="text-xs">Dimension 1 (X-axis)</Label>
                  <Input
                    id="dim-x"
                    type="number"
                    min={0}
                    max={embeddingDim - 1}
                    value={state.selectedDimensions?.[0] ?? 0}
                    onChange={(e) => {
                      const dims = state.selectedDimensions ?? [0, 1, 2];
                      dims[0] = parseInt(e.target.value);
                      onStateChange({ selectedDimensions: [...dims] });
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dim-y" className="text-xs">Dimension 2 (Y-axis)</Label>
                  <Input
                    id="dim-y"
                    type="number"
                    min={0}
                    max={embeddingDim - 1}
                    value={state.selectedDimensions?.[1] ?? 1}
                    onChange={(e) => {
                      const dims = state.selectedDimensions ?? [0, 1, 2];
                      dims[1] = parseInt(e.target.value);
                      onStateChange({ selectedDimensions: [...dims] });
                    }}
                  />
                </div>

                {state.mode === '3d' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dim-z" className="text-xs">Dimension 3 (Z-axis)</Label>
                    <Input
                      id="dim-z"
                      type="number"
                      min={0}
                      max={embeddingDim - 1}
                      value={state.selectedDimensions?.[2] ?? 2}
                      onChange={(e) => {
                        const dims = state.selectedDimensions ?? [0, 1, 2];
                        dims[2] = parseInt(e.target.value);
                        onStateChange({ selectedDimensions: [...dims] });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Color By */}
        <div className="space-y-3">
          <Label htmlFor="color-by" className="text-base">Color By</Label>
          <Select
            value={state.colorByField ?? 'none'}
            onValueChange={(value) => onStateChange({ colorByField: value === 'none' ? null : value })}
          >
            <SelectTrigger id="color-by">
              <SelectValue placeholder="Select coloring" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Single Color)</SelectItem>
              {categoryFieldOptions?.map((option) => (
                <SelectItem key={option.field} value={option.field}>
                  {option.displayName} ({option.uniqueCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Distance Metric */}
        <div className="space-y-3">
          <Label htmlFor="distance-metric" className="text-base">Distance Metric</Label>
          <Select
            value={state.distanceMetric ?? 'COSINE'}
            onValueChange={(value) => onStateChange({ distanceMetric: value as DistanceMetric })}
          >
            <SelectTrigger id="distance-metric">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COSINE">Cosine Similarity</SelectItem>
              <SelectItem value="L2">Euclidean (L2)</SelectItem>
              <SelectItem value="IP">Inner Product</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Used for semantic search similarity calculations
          </p>
        </div>

        <Separator />

        {/* Search */}
        <div className="space-y-3">
          <Label htmlFor="search" className="text-base">Search</Label>
          <DebouncedSearchInput
            id="search"
            placeholder="Type to search..."
            value={state.searchQuery ?? ''}
            onChange={(value) => onStateChange({ searchQuery: value })}
            delay={300}
          />
          <p className="text-xs text-muted-foreground">
            Search will highlight matching words in the visualization
          </p>
        </div>

        {/* Show Only Highlighted */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-only-highlighted"
            checked={state.showOnlyHighlighted ?? false}
            onCheckedChange={(checked) => onStateChange({ showOnlyHighlighted: checked === true })}
            disabled={!hasHighlights}
          />
          <Label
            htmlFor="show-only-highlighted"
            className={`font-normal cursor-pointer ${!hasHighlights ? 'text-muted-foreground' : ''}`}
          >
            Show only highlighted
          </Label>
        </div>

        {/* Show Labels */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-labels"
            checked={state.showLabels ?? false}
            onCheckedChange={(checked) => onStateChange({ showLabels: checked === true })}
            disabled={!hasHighlights}
          />
          <Label
            htmlFor="show-labels"
            className={`font-normal cursor-pointer ${!hasHighlights ? 'text-muted-foreground' : ''}`}
          >
            Show labels
          </Label>
        </div>

        {/* Show Contours 
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-contours"
            checked={state.showContours ?? false}
            onCheckedChange={(checked) => onStateChange({ showContours: checked === true })}
          />
          <Label
            htmlFor="show-contours"
            className="font-normal cursor-pointer"
          >
            Show contours
          </Label>
        </div>
        commented out at the moment until I manage to make the rust code work */}
    </div>
  );
}
