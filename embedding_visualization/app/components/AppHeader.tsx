'use client';

import { Moon, Sun, Search, Upload } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, KeyboardEvent } from 'react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/lib/ui-primitives/select';
import { Spinner } from '@/lib/ui-primitives/spinner';
import { Badge } from '@/lib/ui-primitives/badge';
import { Separator } from '@/lib/ui-primitives/separator';
import { SidebarTrigger } from '@/lib/ui-primitives/sidebar';
import { Button } from '@/lib/ui-primitives/button';
import { Input } from '@/lib/ui-primitives/input';
import type { CollectionsManifest } from '../../lib/types/types';

function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = (resolvedTheme ?? 'light') === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      suppressHydrationWarning
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  );
}

interface AppHeaderProps {
  collections: CollectionsManifest | null;
  collectionsLoading: boolean;
  collectionsError: Error | null;
  selectedCollection: string | null;
  onCollectionChange: (collection: string) => void;
  totalWords?: number;
  embeddingDim?: number;
  onSemanticSearch?: (query: string) => void;
  searchLoading?: boolean;
}

export function AppHeader({
  collections,
  collectionsLoading,
  collectionsError,
  selectedCollection,
  onCollectionChange,
  totalWords,
  embeddingDim,
  onSemanticSearch,
  searchLoading = false,
}: AppHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim() && onSemanticSearch) {
      onSemanticSearch(searchQuery.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-16">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />

        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold">Embedding Visualization</h1>
            {totalWords && embeddingDim && (
              <>
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  {totalWords.toLocaleString()} words
                </Badge>
                <Badge variant="outline" className="hidden md:inline-flex">
                  {embeddingDim}D
                </Badge>
              </>
            )}
          </div>

          {/* Semantic Search */}
          {onSemanticSearch && (
            <div className="flex items-center gap-2 max-w-md flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Semantic search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-8"
                  disabled={searchLoading}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || searchLoading}
                size="sm"
              >
                {searchLoading ? <Spinner className="h-4 w-4" /> : 'Search'}
              </Button>
            </div>
          )}
        </div>

        {/* Collection Selector */}
        <div className="ml-auto flex items-center gap-2">
          {collectionsLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted min-w-[200px]">
              <Spinner className="h-4 w-4" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : collectionsError ? (
            <div className="px-3 py-2 border border-destructive/50 rounded-md bg-destructive/10 min-w-[200px]">
              <span className="text-sm text-destructive">Error</span>
            </div>
          ) : collections && Object.keys(collections).length > 0 ? (
            <Select
              value={selectedCollection || undefined}
              onValueChange={onCollectionChange}
            >
              <SelectTrigger className="w-[200px] lg:w-[280px]">
                <SelectValue placeholder="Select collection" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(collections).map(([key, collection]) => (
                  <SelectItem key={key} value={key}>
                    <span className="font-medium">{collection.display_name}</span>
                    <span className="text-xs text-muted-foreground ml-2 hidden lg:inline">
                      ({collection.count.toLocaleString()})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Link href="/test-embed">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Embed</span>
            </Button>
          </Link>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
