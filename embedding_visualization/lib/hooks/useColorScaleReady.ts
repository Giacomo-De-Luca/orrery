'use client';

import { useEffect, useState } from 'react';
import type { ColorScale } from '../types/types';
import { isCrameriScale, isCrameriLoaded, loadCrameriColormap } from '../colorMaps/crameriScales';

/**
 * Ensures the Crameri / custom-strip colormap backing `colorScale` is loaded into
 * the cache, kicking off the async load when needed. Returns a tick that
 * increments once the load completes.
 *
 * Crameri/strip colormaps (e.g. `hilbertColor`) are lazy-loaded JSON chunks. The
 * scatter plots read them synchronously from the cache via `getCrameriPlotlyScale`
 * and fall back to viridis when a strip isn't loaded yet. Without this hook a
 * programmatically-set scale (URL param or a collection's saved default) would
 * never trigger the load — and even after a load triggered elsewhere, a colorscale
 * memo keyed only on `colorScale` would never recompute. Callers include the
 * returned tick in their colorscale memo deps so it recomputes when the strip
 * becomes available.
 */
export function useColorScaleReady(colorScale: ColorScale): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const name = colorScale.type === 'sequential' || colorScale.type === 'diverging'
      ? colorScale.scaleName
      : undefined;
    if (!name || !isCrameriScale(name) || isCrameriLoaded(name)) return;

    let cancelled = false;
    loadCrameriColormap(name)
      .then(() => { if (!cancelled) setTick(t => t + 1); })
      .catch(() => { /* leave the viridis fallback in place on failure */ });
    return () => { cancelled = true; };
  }, [colorScale]);

  return tick;
}
