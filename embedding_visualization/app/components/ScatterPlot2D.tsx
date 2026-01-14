'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import type { PlotParams } from 'react-plotly.js';
import type {
  PlotData,
  Layout,
  Config,
  PlotMouseEvent,
  PlotHoverEvent,
} from 'plotly.js';
import type { Point2D, HighlightMap } from '../../lib/types/types';
import { buildCategoryColorMap, getCategoryLabel } from '../../lib/utils/categoryColors';
import { calculateMarkerStyle, calculateLuminosity, calculateHighlightScale, calculateSimilarityColors } from '../../lib/utils/plotUtils';
import { useContainerDimensions } from '../../lib/hooks/useContainerDimensions';
import { FrostedTooltip, type TooltipData } from './FrostedTooltip';

type PlotlyData = Partial<PlotData>;

// Dynamically import Plot to avoid SSR issues
const Plot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false });

interface ScatterPlot2DProps {
  points: Point2D[];
  colorBy?: 'category' | 'none';
  categoryField?: string | null;
  categoryValues?: string[];
  highlightedIndices?: HighlightMap;
  selectedPoint?: Point2D | null;
  onPointClick?: (point: Point2D) => void;
  /** Optional className for the container */
  className?: string;
  /** When true, only show highlighted points (hide non-highlighted) */
  showOnlyHighlighted?: boolean;
  /** When true, show text labels on highlighted points */
  showLabels?: boolean;
}

/**
 * Format hover text for a point.
 */
function formatHoverText(point: Point2D): string {
  const label = point.label || point.id;
  const doc = point.document || '';
  const truncatedDoc = doc.length > 100 ? doc.substring(0, 100) + '...' : doc;
  return `${label}<br>${truncatedDoc}`;
}

export function ScatterPlot2D({
  points,
  colorBy = 'none',
  categoryField = null,
  categoryValues = [],
  highlightedIndices,
  selectedPoint,
  onPointClick,
  className,
  showOnlyHighlighted = false,
  showLabels = false,
}: ScatterPlot2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerDimensions(containerRef, { width: 800, height: 600 });

  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme ?? 'light';
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#e2e8f0' : '#0f172a';
  const gridColor = isDark ? '#334155' : '#e5e7eb';
  const plotBg = isDark ? "rgba(0,0,0,0" : "rgba(0,0,0,0)";
  const paperBg = isDark ? "rgba(0,0,0,0" : "rgba(0,0,0,0";
  const legendBg = isDark ? 'rgba(2,6,23,0.85)' : 'rgba(255,255,255,0.85)';

  // Build color map based on category values
  const colorMap = useMemo(() => {
    return buildCategoryColorMap(categoryField, categoryValues);
  }, [categoryField, categoryValues]);

  // Calculate dynamic marker style based on point count
  const markerStyle = useMemo(() => {
    return calculateMarkerStyle(points.length);
  }, [points.length]);

  // Calculate dynamic highlight scaling based on point count
  const highlightScale = useMemo(() => {
    return calculateHighlightScale(points.length);
  }, [points.length]);

  //const { generateClusters, isLoaded: isClusteringLoaded } = useDensityClustering();
  //const [clusters, setClusters] = useState<DensityCluster[]>([]);

  //useEffect(() => {
   // if (isClusteringLoaded && points.length > 0) {
      // Run in a timeout to avoid blocking render
  //    const timer = setTimeout(() => {
  //      const result = generateClusters(points);
  //      setClusters(result);
  //    }, 100);
  //    return () => clearTimeout(timer);
  //  } else {
  //    setClusters([]);
  //  }
  //}, [isClusteringLoaded, points, generateClusters]);
  const plotData = useMemo((): PlotlyData[] => {
    let traces: PlotlyData[] = [];

    // If there are highlighted points, separate them into two traces
    if (highlightedIndices && highlightedIndices.size > 0) {
      const unhighlightedPoints = points.filter(p => !highlightedIndices.has(p.index));
      const highlightedPoints = points.filter(p => highlightedIndices.has(p.index));

      // A. Background Points (dimmed) - skip if showOnlyHighlighted is true
      if (unhighlightedPoints.length > 0 && !showOnlyHighlighted) {
        if (colorBy === 'category' && categoryValues.length > 0) {
          const pointsByCategory: Record<string, Point2D[]> = {};
          unhighlightedPoints.forEach(point => {
            const cat = point.category || 'unknown';
            if (!pointsByCategory[cat]) {
              pointsByCategory[cat] = [];
            }
            pointsByCategory[cat].push(point);
          });

          Object.entries(pointsByCategory).forEach(([cat, catPoints]) => {
            traces.push({
              x: catPoints.map(p => p.x),
              y: catPoints.map(p => p.y),
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: getCategoryLabel(categoryField, cat),
              marker: {
                size: markerStyle.size,
                color: colorMap[cat] || '#7f7f7f',
                opacity: 0.15, // Very dim
              },
              text: catPoints.map(formatHoverText),
              hovertemplate: '<b>%{text}</b><extra></extra>',
              customdata: catPoints as any,
              showlegend: false,
            } satisfies PlotlyData);
          });
        } else {
          traces.push({
            x: unhighlightedPoints.map(p => p.x),
            y: unhighlightedPoints.map(p => p.y),
            mode: 'markers' as const,
            type: 'scattergl' as const,
            name: 'Other items',
            marker: {
              size: markerStyle.size,
              color: '#e5a819ff',
              opacity: markerStyle.opacity * 0.2, // Dimmed relative to calculated opacity
            },
            text: unhighlightedPoints.map(formatHoverText),
            hovertemplate: '<b>%{text}</b><extra></extra>',
            customdata: unhighlightedPoints as any,
            showlegend: false,
          } satisfies PlotlyData);
        }
      }

      // B. Constellation Lines - from selected point to each result
      if (selectedPoint && highlightedPoints.length > 0) {
        const lineX: number[] = [];
        const lineY: number[] = [];

        highlightedPoints.forEach(p => {
          // Don't draw line to itself
          if (p.index !== selectedPoint.index) {
            lineX.push(selectedPoint.x, p.x, null as any);
            lineY.push(selectedPoint.y, p.y, null as any);
          }
        });

        if (lineX.length > 0) {
          traces.push({
            x: lineX,
            y: lineY,
            mode: 'lines' as const,
            type: 'scattergl' as const,
            name: 'Connections',
            line: {
              color: isDark ? 'rgba(130, 160, 200, 0.12)' : 'rgba(100, 130, 170, 0.15)',
              width: 0.5,
            },
            hoverinfo: 'skip' as any,
            showlegend: false,
          } satisfies PlotlyData);
        }
      }

      // C. Highlighted Points - triple-layer bluish glow
      if (highlightedPoints.length > 0) {
        // Separate selected point from other highlights
        const otherHighlights = selectedPoint
          ? highlightedPoints.filter(p => p.index !== selectedPoint.index)
          : highlightedPoints;

        if (otherHighlights.length > 0) {
          // Render each highlighted point individually with similarity-based opacity and color
          otherHighlights.forEach(point => {
            const similarity = highlightedIndices!.get(point.index) ?? 1.0;
            const luminosity = calculateLuminosity(similarity);
            const colors = calculateSimilarityColors(similarity);

            // Layer 1: Outer glow (largest, most transparent)
            traces.push({
              x: [point.x],
              y: [point.y],
              mode: 'markers' as const,
              type: 'scattergl' as const,
              hoverinfo: 'skip',
              marker: {
                size: markerStyle.size * highlightScale.outerMultiplier,
                color: colors.outerGlow,
                opacity: luminosity.outer,
                line: { width: 0 },
              },
              showlegend: false,
            } satisfies PlotlyData);

            // Layer 2: Inner glow (medium)
            traces.push({
              x: [point.x],
              y: [point.y],
              mode: 'markers' as const,
              type: 'scattergl' as const,
              hoverinfo: 'skip',
              marker: {
                size: markerStyle.size * highlightScale.innerMultiplier,
                color: colors.glowColor,
                opacity: luminosity.inner,
                line: { width: 0 },
              },
              showlegend: false,
            } satisfies PlotlyData);

            // Layer 3: Bright core
            traces.push({
              x: [point.x],
              y: [point.y],
              mode: 'markers' as const,
              type: 'scattergl' as const,
              name: 'Search results',
              marker: {
                size: Math.max(markerStyle.size * highlightScale.coreMultiplier, 3),
                color: colors.coreColor,
                opacity: luminosity.core,
                line: { color: colors.glowColor, width: 1 },
              },
              text: [formatHoverText(point)],
              hovertemplate: '<b>%{text}</b><extra></extra>',
              customdata: [point] as any,
              showlegend: false,
            } satisfies PlotlyData);
          });
        }

        // D. Selected Point - golden tint to distinguish it
        if (selectedPoint) {
          // Outer golden glow
          traces.push({
            x: [selectedPoint.x],
            y: [selectedPoint.y],
            mode: 'markers' as const,
            type: 'scattergl' as const,
            hoverinfo: 'skip',
            marker: {
              size: markerStyle.size * highlightScale.selectedOuterMultiplier,
              color: 'rgba(255, 215, 140, 0.15)',
              opacity: 0.3,
              line: { width: 0 },
            },
            showlegend: false,
          } satisfies PlotlyData);

          // Inner golden glow
          traces.push({
            x: [selectedPoint.x],
            y: [selectedPoint.y],
            mode: 'markers' as const,
            type: 'scattergl' as const,
            hoverinfo: 'skip',
            marker: {
              size: Math.max(markerStyle.size * highlightScale.selectedInnerMultiplier, 8),
              color: 'rgba(255, 223, 160, 0.35)',
              opacity: 0.5,
              line: { width: 0 },
            },
            showlegend: false,
          } satisfies PlotlyData);

          // Golden core
          traces.push({
            x: [selectedPoint.x],
            y: [selectedPoint.y],
            mode: 'markers' as const,
            type: 'scattergl' as const,
            name: 'Selected',
            marker: {
              size: Math.max(markerStyle.size * highlightScale.selectedCoreMultiplier, 4),
              color: '#fff8e8',
              opacity: 1,
              line: { color: 'rgba(255, 200, 100, 0.6)', width: 1.5 },
            },
            text: [formatHoverText(selectedPoint)],
            hovertemplate: '<b>%{text}</b><extra></extra>',
            customdata: [selectedPoint] as any,
            showlegend: false,
          } satisfies PlotlyData);
        }
      }
    }
    // No highlighting - render normally with lower opacity
    else if (colorBy === 'category' && categoryValues.length > 0) {
      const pointsByCategory: Record<string, Point2D[]> = {};
      points.forEach(point => {
        const cat = point.category || 'unknown';
        if (!pointsByCategory[cat]) {
          pointsByCategory[cat] = [];
        }
        pointsByCategory[cat].push(point);
      });

      traces = Object.entries(pointsByCategory).map(([cat, catPoints]) => ({
        x: catPoints.map(p => p.x),
        y: catPoints.map(p => p.y),
        mode: 'markers' as const,
        type: 'scattergl' as const,
        name: getCategoryLabel(categoryField, cat),
        marker: {
          size: markerStyle.size,
          color: colorMap[cat] || '#7f7f7f',
          opacity: markerStyle.opacity,
        },
        text: catPoints.map(formatHoverText),
        hovertemplate: '<b>%{text}</b><extra></extra>',
        customdata: catPoints as any,
      } satisfies PlotlyData));
    } else {
      traces = [{
        x: points.map(p => p.x),
        y: points.map(p => p.y),
        mode: 'markers' as const,
        type: 'scattergl' as const,
        marker: {
          size: markerStyle.size,
          color: '#1f77b4',
          opacity: markerStyle.opacity,
        },
        text: points.map(formatHoverText),
        hovertemplate: '<b>%{text}</b><extra></extra>',
        customdata: points as any,
      } satisfies PlotlyData];
    }

    // Add cluster traces
    //if (clusters.length > 0) {
    //   const x: (number | null)[] = [];
    //   const y: (number | null)[] = [];
       
    //   clusters.forEach(cluster => {
    //     cluster.contour.forEach(p => {
    //       x.push(p.x);
    //       y.push(p.y);
    //     });
         // Close the loop
    /*     if (cluster.contour.length > 0) {
            x.push(cluster.contour[0].x);
            y.push(cluster.contour[0].y);
         }
         // Separator
         x.push(null);
         y.push(null);
       });

       traces.push({
         x,
         y,
         mode: 'lines',
         type: 'scattergl',
         name: 'Clusters',
         line: {
           color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
           width: 1
         },
         hoverinfo: 'skip',
         showlegend: false
       });
    }
        */

    // E. Text Labels for highlighted points (rendered last, on top)
    if (showLabels && highlightedIndices && highlightedIndices.size > 0) {
      const highlightedPoints = points.filter(p => highlightedIndices.has(p.index));
      if (highlightedPoints.length > 0) {
        traces.push({
          x: highlightedPoints.map(p => p.x),
          y: highlightedPoints.map(p => p.y),
          mode: 'text' as const,
          type: 'scattergl' as const,
          text: highlightedPoints.map(p => p.label || p.id),
          textposition: 'top center' as const,
          textfont: {
            size: 11,
            color: isDark ? '#e2e8f0' : '#1e293b',
          },
          hoverinfo: 'skip' as const,
          showlegend: false,
        } satisfies PlotlyData);
      }
    }

    return traces;
  }, [points, colorBy, categoryField, categoryValues, colorMap, highlightedIndices, selectedPoint, isDark, markerStyle.size, markerStyle.opacity, highlightScale, showOnlyHighlighted, showLabels]);

  const layout = useMemo<Partial<Layout>>(
    () => ({
      width,
      height,
      uirevision: 'true', // Preserve zoom/pan state on resize
      hovermode: 'closest' as const,
      showlegend: false, 
      // showlegend: colorBy === 'category' && categoryValues.length > 0,
      plot_bgcolor: plotBg,
      paper_bgcolor: paperBg,
      font: { color: axisColor },
      legend: {
        bgcolor: legendBg,
        bordercolor: gridColor,
        font: { color: axisColor },
      },
      xaxis: {
        title: { text: 'x', font: { color: axisColor } },
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        tickfont: { color: axisColor },
        showgrid: false, 
        zeroline: false,
        showspikes: false,
        showticklabels: false,
        showtitle: false,
      },
      yaxis: {
        title: { text: 'y', font: { color: axisColor } },
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        tickfont: { color: axisColor },
        scaleanchor: 'x',
        scaleratio: 1,
        showgrid: false, 
        zeroline: false,
        showspikes: false,
        showticklabels: false,
        showtitle: false,
      },
      margin: { l: 50, r: 50, t: 50, b: 50 },
    }),
    [axisColor, colorBy, categoryValues.length, gridColor, height, legendBg, paperBg, plotBg, width]
  );

  const config = {
    displayModeBar: true,
    displaylogo: false,
    responsive: true,
  } as Partial<Config>;

  const handleClick = (event: PlotMouseEvent) => {
    if (!onPointClick || !event.points || event.points.length === 0) {
      return;
    }

    const point = event.points[0];
    // Skip glow layers and lines (they don't have valid customdata)
    if (point.customdata && typeof point.customdata === 'object') {
      onPointClick(point.customdata as unknown as Point2D);
    }
  };

  const [plotReady, setPlotReady] = useState(false);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  const handleHover = (event: PlotHoverEvent) => {
    if (event.points && event.points.length > 0) {
      const pt = event.points[0];
      // Only show tooltip for points with valid customdata (skip glow layers)
      if (pt.customdata && typeof pt.customdata === 'object') {
        const point = pt.customdata as unknown as Point2D;
        const mouseEvent = event.event as MouseEvent;
        // Get position relative to container
        const containerRect = containerRef.current?.getBoundingClientRect();
        const x = mouseEvent.clientX - (containerRect?.left ?? 0);
        const y = mouseEvent.clientY - (containerRect?.top ?? 0);
        setTooltipData({
          x,
          y,
          label: point.label || point.id,
          document: point.document,
          visible: true,
        });
      }
    }
  };

  const handleUnhover = () => {
    setTooltipData(null);
  };

return (
  <div ref={containerRef} className={className ?? 'h-full w-full'} style={{ position: 'relative' }}>
    <Plot
      data={plotData}
      layout={layout}
      config={config}
      onClick={plotReady ? handleClick : undefined}
      onHover={handleHover}
      onUnhover={handleUnhover}
      onInitialized={() => setPlotReady(true)}
    />
    <FrostedTooltip data={tooltipData} />
  </div>
);
}