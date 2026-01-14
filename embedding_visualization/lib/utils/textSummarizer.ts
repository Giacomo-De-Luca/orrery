import { stemmer } from 'stemmer';
import type { Point2D } from '../types/types';

interface ClusterRegion {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface ClusterLabel {
  x: number;
  y: number;
  keywords: string[];
  pointCount: number;
  clusterId: number;
  dominantPos: string;  // Most common POS in this cluster
  posDistribution: Record<string, number>;  // Count of each POS
}

/**
 * Generate automatic cluster labels using c-TF-IDF
 * (class-based Term Frequency-Inverse Document Frequency)
 */
export class ClusterLabeler {
  private segmenter: Intl.Segmenter;
  private stopWords: Set<string>;

  constructor(additionalStopWords: string[] = []) {
    this.segmenter = new Intl.Segmenter('en', { granularity: 'word' });

    // Common English stop words
    this.stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'having',
      'do',
      'does',
      'did',
      'doing',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'that',
      'this',
      'these',
      'those',
      'it',
      'its',
      'they',
      'them',
      'their',
      'what',
      'which',
      'who',
      'when',
      'where',
      'why',
      'how',
      'all',
      'each',
      'every',
      'both',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      ...additionalStopWords,
    ]);
  }

  /**
   * Tokenize text into words, filtering out stop words and short words
   */
  private tokenize(text: string): string[] {
    const words: string[] = [];

    for (const segment of this.segmenter.segment(text)) {
      if (segment.isWordLike) {
        const word = segment.segment.toLowerCase().trim();

        // Filter: length > 2, not a stop word, not just numbers
        if (
          word.length > 2 &&
          !this.stopWords.has(word) &&
          !/^\d+$/.test(word)
        ) {
          words.push(word);
        }
      }
    }

    return words;
  }

  /**
   * Assign points to cluster regions
   */
  private assignPointsToClusters(
    points: Point2D[],
    regions: ClusterRegion[]
  ): Map<number, Point2D[]> {
    const clusterPoints = new Map<number, Point2D[]>();

    // Initialize clusters
    regions.forEach((_, idx) => clusterPoints.set(idx, []));

    console.log('Assigning points to clusters:', {
      totalPoints: points.length,
      numRegions: regions.length,
      sampleRegion: regions[0],
      samplePoint: points[0],
    });

    // Assign each point to the first matching cluster region
    let assignedCount = 0;
    for (const point of points) {
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        if (
          point.x >= region.xMin &&
          point.x <= region.xMax &&
          point.y >= region.yMin &&
          point.y <= region.yMax
        ) {
          clusterPoints.get(i)!.push(point);
          assignedCount++;
          break; // Only assign to first matching cluster
        }
      }
    }

    console.log(`Assigned ${assignedCount} points to clusters`);
    clusterPoints.forEach((pts, idx) => {
      console.log(`Cluster ${idx}: ${pts.length} points`);
    });

    return clusterPoints;
  }

  /**
   * Generate labels for clusters using c-TF-IDF
   */
  generateLabels(
    points: Point2D[],
    clusterRegions: ClusterRegion[],
    clusterCenters: { x: number; y: number; clusterId: number }[],
    topK: number = 4
  ): ClusterLabel[] {
    // Assign points to clusters
    const clusterPoints = this.assignPointsToClusters(points, clusterRegions);

    // Build word frequency maps per cluster
    const clusterWordFreqs = new Map<number, Map<string, number>>();
    const globalWordFreq = new Map<string, number>();

    clusterPoints.forEach((pts, clusterId) => {
      const wordFreq = new Map<string, number>();

      for (const point of pts) {
        // Use documents to extract key concepts
        const text = point.document || point.label;
        const words = this.tokenize(text);
        const uniqueWords = new Set(words); // Count each word once per document

        for (const word of uniqueWords) {
          const stem = stemmer(word);
          wordFreq.set(stem, (wordFreq.get(stem) || 0) + 1);
          globalWordFreq.set(stem, (globalWordFreq.get(stem) || 0) + 1);
        }
      }

      clusterWordFreqs.set(clusterId, wordFreq);
    });

    // Compute TF-IDF scores and generate labels
    const labels: ClusterLabel[] = [];
    const numClusters = clusterRegions.length;

    for (let i = 0; i < clusterCenters.length; i++) {
      const center = clusterCenters[i];
      const clusterId = center.clusterId;
      // Use index i to look up points, not clusterId (which is the WASM identifier)
      const pts = clusterPoints.get(i);
      const wordFreq = clusterWordFreqs.get(i);

      if (!pts || pts.length === 0 || !wordFreq) {
        console.log(`Skipping cluster ${i} (id=${clusterId}): ${pts?.length || 0} points`);
        continue;
      }

      console.log(`Processing cluster ${i} (id=${clusterId}): ${pts.length} points`);

      // Compute TF-IDF for each stemmed word
      const tfIdfScores: Array<{ stem: string; score: number }> = [];

      for (const [stem, freq] of wordFreq.entries()) {
        const tf = freq / pts.length; // Term frequency in this cluster
        const df = globalWordFreq.get(stem) || 1; // Document frequency across all clusters
        const idf = Math.log((numClusters + 1) / (df + 1)); // Inverse document frequency
        const tfIdf = tf * idf;

        tfIdfScores.push({ stem, score: tfIdf });
      }

      // Sort by TF-IDF score
      tfIdfScores.sort((a, b) => b.score - a.score);

      // Get top K stems and find their most common surface forms
      const topStems = tfIdfScores.slice(0, topK * 2); // Get extra in case we need to filter

      // Find the most common surface form for each stem
      const keywords: string[] = [];
      for (const { stem } of topStems) {
        if (keywords.length >= topK) break;

        const wordCounts = new Map<string, number>();

        for (const point of pts) {
          const text = point.document
            ? `${point.label} ${point.document}`
            : point.label;
          const words = this.tokenize(text);

          for (const word of words) {
            if (stemmer(word) === stem) {
              wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
          }
        }

        // Get the most frequent surface form
        let bestWord = stem;
        let maxCount = 0;
        for (const [word, count] of wordCounts.entries()) {
          if (count > maxCount) {
            maxCount = count;
            bestWord = word;
          }
        }

        keywords.push(bestWord);
      }

      // Compute category distribution for this cluster
      const categoryDistribution: Record<string, number> = {};
      for (const point of pts) {
        const category = point.category || 'unknown';
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      }

      // Find dominant category (most common)
      let dominantCategory = 'unknown';
      let maxCategoryCount = 0;
      for (const [category, count] of Object.entries(categoryDistribution)) {
        if ((count as number) > maxCategoryCount) {
          maxCategoryCount = count as number;
          dominantCategory = category;
        }
      }

      labels.push({
        x: center.x,
        y: center.y,
        keywords,
        pointCount: pts.length,
        clusterId,
        dominantPos: dominantCategory,
        posDistribution: categoryDistribution,
      });
    }

    return labels;
  }

  /**
   * Helper: Create cluster regions from boundaries
   */
  static createRegionsFromBoundaries(
    boundaries: [number, number][][][]
  ): ClusterRegion[] {
    return boundaries.map((polygons) => {
      let xMin = Infinity,
        xMax = -Infinity;
      let yMin = Infinity,
        yMax = -Infinity;

      for (const polygon of polygons) {
        for (const [x, y] of polygon) {
          if (x < xMin) xMin = x;
          if (x > xMax) xMax = x;
          if (y < yMin) yMin = y;
          if (y > yMax) yMax = y;
        }
      }

      return { xMin, xMax, yMin, yMax };
    });
  }
}
