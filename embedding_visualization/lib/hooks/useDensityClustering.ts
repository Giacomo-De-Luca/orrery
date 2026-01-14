import { useEffect, useState, useCallback } from 'react';
import { Point2D } from '../types/types';
import { computeDensityMap } from '../../app/utils/densityUtils';

// Define types matching the WASM interface
interface ClusteringOptions {
  clustering_options?: {
    use_disjoint_set?: boolean;
    truncate_to_max_density?: boolean;
    perform_neighbor_map_grouping?: boolean;
    union_threshold?: number;
    density_upperbound_scaler?: number;
    density_lowerbound_scaler?: number;
  };
  smooth_boundaries?: boolean;
  return_boundary_rects?: boolean;
}

interface ClusterSummary {
  num_pixels: number;
  sum_x_density: number;
  sum_y_density: number;
  sum_density: number;
  max_density: number;
  max_density_location: [number, number];
}

interface FindClustersResult {
  summaries: Map<number, ClusterSummary>;
  boundaries: Map<number, [number, number][]>; // Polygon: array of [x, y]
  boundary_rects: Map<number, [number, number, number, number][]>;
}

export interface DensityCluster {
  id: number;
  contour: { x: number; y: number }[];
  centroid: { x: number; y: number };
  densitySum: number;
}

export function useDensityClustering() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [wasmModule, setWasmModule] = useState<any>(null);

  useEffect(() => {
    async function loadWasm() {
      try {
        // Dynamically import the WASM module wrapper
        // Note: This requires the WASM project to be built and the pkg folder to exist
        // You may need to adjust the path or configure Next.js to handle the WASM file
        // @ts-ignore
        const wasm = await import('../../app/utils/density_clustering/density_clustering_wasm/pkg/density_clustering_wasm.js');
        
        // Initialize the WASM module
        // If the .wasm file is not found, you might need to copy it to public/ and pass the URL here
        await wasm.default(); 
        
        setWasmModule(wasm);
        setIsLoaded(true);
      } catch (e) {
        console.warn("Density clustering WASM module not loaded. Make sure to build it first.", e);
      }
    }
    loadWasm();
  }, []);

  const generateClusters = useCallback((
    points: Point2D[], 
    bandwidth: number = 15,
    gridSize: number = 500
  ): DensityCluster[] => {
    if (!wasmModule || !isLoaded || points.length === 0) return [];

    const width = gridSize;
    const height = gridSize;

    // 1. Compute Density Map (CPU)
    const { density, xMin, xMax, yMin, yMax } = computeDensityMap(points, width, height, bandwidth);

    // 2. Prepare WASM input
    // The WASM DensityMap constructor takes (width, height, data)
    const densityMap = new wasmModule.DensityMap(width, height, density);

    try {
      // 3. Run Clustering
      const options: ClusteringOptions = {
        clustering_options: {
          union_threshold: 10, // Adjust based on density scale
          density_upperbound_scaler: 0.2,
          density_lowerbound_scaler: 0.2,
        },
        smooth_boundaries: true,
        return_boundary_rects: false,
      };

      const result: FindClustersResult = wasmModule.find_clusters(densityMap, options);

      // 4. Convert results back to data coordinates
      const clusters: DensityCluster[] = [];
      const xScale = (xMax - xMin) / (width - 1);
      const yScale = (yMax - yMin) / (height - 1);

      // Helper to convert grid [x, y] to data {x, y}
      const toDataCoords = (gx: number, gy: number) => ({
        x: xMin + gx * xScale,
        y: yMin + gy * yScale
      });

      result.summaries.forEach((summary, id) => {
        const boundary = result.boundaries.get(id);
        if (!boundary) return;

        // Convert contour
        const contour = boundary.map(([gx, gy]) => toDataCoords(gx, gy));

        // Convert centroid
        const centroid = toDataCoords(
          summary.sum_x_density / summary.sum_density,
          summary.sum_y_density / summary.sum_density
        );

        clusters.push({
          id,
          contour,
          centroid,
          densitySum: summary.sum_density
        });
      });

      return clusters;

    } finally {
      // Clean up WASM memory
      densityMap.free();
    }
  }, [wasmModule, isLoaded]);

  return { generateClusters, isLoaded };
}
