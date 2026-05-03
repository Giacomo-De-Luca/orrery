'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import type { SaeModelInfo } from '@/lib/types/types';
import { Input } from '@/lib/ui-primitives/input';
import { Button } from '@/lib/ui-primitives/button';
import { Badge } from '@/lib/ui-primitives/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/lib/ui-primitives/select';
import { Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/lib/ui-primitives/toggle-group';

interface FeatureHeaderProps {
  models: SaeModelInfo[];
  selectedModelSae: string | null;
  onModelSaeChange: (value: string) => void;
  featureIndex: number | null;
  onFeatureIndexChange: (index: number) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  maxFeatureIndex?: number;
  collectionLink?: string | null;
  searchMode?: 'text' | 'semantic';
  onSearchModeChange?: (mode: 'text' | 'semantic') => void;
  hasSemanticSearch?: boolean;
}

/**
 * Header bar with model/SAE selector, feature index input, and search.
 */
export function FeatureHeader({
  models,
  selectedModelSae,
  onModelSaeChange,
  featureIndex,
  onFeatureIndexChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  maxFeatureIndex,
  collectionLink,
  searchMode = 'text',
  onSearchModeChange,
  hasSemanticSearch = false,
}: FeatureHeaderProps) {
  const [indexInput, setIndexInput] = useState(featureIndex?.toString() ?? '');

  const handleGoToFeature = useCallback(() => {
    const idx = parseInt(indexInput, 10);
    if (!isNaN(idx) && idx >= 0) {
      onFeatureIndexChange(idx);
    }
  }, [indexInput, onFeatureIndexChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleGoToFeature();
  }, [handleGoToFeature]);

  const handleSearchKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  }, [onSearch]);

  const handlePrev = useCallback(() => {
    if (featureIndex != null && featureIndex > 0) {
      const newIdx = featureIndex - 1;
      onFeatureIndexChange(newIdx);
      setIndexInput(newIdx.toString());
    }
  }, [featureIndex, onFeatureIndexChange]);

  const handleNext = useCallback(() => {
    if (featureIndex != null && (maxFeatureIndex == null || featureIndex < maxFeatureIndex - 1)) {
      const newIdx = featureIndex + 1;
      onFeatureIndexChange(newIdx);
      setIndexInput(newIdx.toString());
    }
  }, [featureIndex, maxFeatureIndex, onFeatureIndexChange]);

  // Sync local input when parent changes feature index
  const displayedIndex = featureIndex?.toString() ?? '';
  if (indexInput !== displayedIndex && featureIndex != null) {
    setIndexInput(displayedIndex);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Model/SAE selector */}
      <Select value={selectedModelSae ?? ''} onValueChange={onModelSaeChange}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder="Select model / SAE" />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => {
            const key = `${m.modelId}::${m.saeId}`;
            return (
              <SelectItem key={key} value={key}>
                <span className="font-mono text-xs">{m.modelId} / {m.saeId}</span>
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {m.featureCount.toLocaleString()} features
                </Badge>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Feature index navigation */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev} disabled={featureIndex == null || featureIndex <= 0}>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <Input
          type="number"
          min={0}
          max={maxFeatureIndex ? maxFeatureIndex - 1 : undefined}
          value={indexInput}
          onChange={(e) => setIndexInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleGoToFeature}
          className="w-24 h-8 text-center font-mono text-sm"
          placeholder="Index"
        />
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext} disabled={featureIndex == null || (maxFeatureIndex != null && featureIndex >= maxFeatureIndex - 1)}>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Search mode toggle + search input */}
      {hasSemanticSearch && onSearchModeChange && (
        <ToggleGroup
          type="single"
          value={searchMode}
          onValueChange={(v) => v && onSearchModeChange(v as 'text' | 'semantic')}
          variant="outline"
          className="shrink-0"
        >
          <ToggleGroupItem value="text" className="text-xs h-8 px-2">Text</ToggleGroupItem>
          <ToggleGroupItem value="semantic" className="text-xs h-8 px-2">Semantic</ToggleGroupItem>
        </ToggleGroup>
      )}
      <div className="flex items-center gap-1 flex-1 min-w-48">
        <Input
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={searchMode === 'semantic' ? 'Search by meaning...' : 'Search features by label...'}
          className="h-8 text-sm"
        />
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onSearch}>
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Link back to visualization */}
      {collectionLink && (
        <a
          href={`/?collection=${encodeURIComponent(collectionLink)}`}
          className="text-xs text-blue-500 hover:underline shrink-0"
        >
          View in scatter plot
        </a>
      )}
    </div>
  );
}
