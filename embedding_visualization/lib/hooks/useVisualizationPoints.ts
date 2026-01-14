import { useMemo, useRef } from 'react';
import type {
  EmbeddingData,
  VisualizationState,
  Point2D,
  Point3D,
} from '../types/types';

interface VisualizationPointsResult {
  points2d: Point2D[];
  points3d: Point3D[];
  filteredPoints2d: Point2D[];
  filteredPoints3d: Point3D[];
  highlightedIndices?: Set<number>;
}

/**
 * Extract a value from item metadata by field name.
 */
function getMetadataValue(
  metadata: Record<string, unknown>,
  fieldName: string | null,
  fallback: string
): string {
  if (!fieldName) return fallback;
  const value = metadata[fieldName];
  if (value === null || value === undefined) return fallback;
  return String(value);
}

export function useVisualizationPoints(
  data: EmbeddingData | null | undefined,
  visualizationState: VisualizationState,
): VisualizationPointsResult {
  const manualWarningShown = useRef(false);

  const { points2d, points3d } = useMemo(() => {
    if (!data) {
      return { points2d: [] as Point2D[], points3d: [] as Point3D[] };
    }

    const { ids, documents, itemMetadata, projections, displayConfig } = data;
    let coords2d: number[][] = projections.pca_2d;
    let coords3d: number[][] = projections.pca_3d;

    if (visualizationState.method === 'manual') {
      if (!manualWarningShown.current) {
        console.warn(
          'Manual dimension selection requires raw embeddings - using PCA as fallback',
        );
        manualWarningShown.current = true;
      }
    } else if (visualizationState.method === 'umap') {
      coords2d = projections.umap_2d;
      coords3d = projections.umap_3d;
    } else {
      coords2d = projections.pca_2d;
      coords3d = projections.pca_3d;
    }

    const mapped2d: Point2D[] = coords2d.map((coord, idx) => {
      const metadata = itemMetadata[idx] || {};
      return {
        x: coord[0],
        y: coord[1],
        id: ids[idx],
        label: getMetadataValue(metadata, displayConfig.labelField, ids[idx]),
        document: documents[idx] || '',
        category: getMetadataValue(metadata, displayConfig.categoryField, ''),
        index: idx,
        metadata,
      };
    });

    const mapped3d: Point3D[] = coords3d.map((coord, idx) => {
      const metadata = itemMetadata[idx] || {};
      return {
        x: coord[0],
        y: coord[1],
        z: coord[2],
        id: ids[idx],
        label: getMetadataValue(metadata, displayConfig.labelField, ids[idx]),
        document: documents[idx] || '',
        category: getMetadataValue(metadata, displayConfig.categoryField, ''),
        index: idx,
        metadata,
      };
    });

    return { points2d: mapped2d, points3d: mapped3d };
  }, [data, visualizationState.method]);

  const { filteredPoints2d, filteredPoints3d, highlightedIndices } = useMemo(() => {
    const searchQuery = visualizationState.searchQuery?.trim();

    if (!searchQuery) {
      return {
        filteredPoints2d: points2d,
        filteredPoints3d: points3d,
        highlightedIndices: undefined,
      };
    }

    const query = searchQuery.toLowerCase();
    const highlighted = new Set<number>();

    points2d.forEach((point) => {
      // Search in label, document, and all string metadata values
      if (
        point.label.toLowerCase().includes(query) ||
        point.document.toLowerCase().includes(query)
      ) {
        highlighted.add(point.index);
      } else {
        // Also search in other metadata fields
        for (const value of Object.values(point.metadata)) {
          if (typeof value === 'string' && value.toLowerCase().includes(query)) {
            highlighted.add(point.index);
            break;
          }
        }
      }
    });

    return {
      filteredPoints2d: points2d,
      filteredPoints3d: points3d,
      highlightedIndices: highlighted,
    };
  }, [points2d, points3d, visualizationState.searchQuery]);

  return {
    points2d,
    points3d,
    filteredPoints2d,
    filteredPoints3d,
    highlightedIndices,
  };
}
