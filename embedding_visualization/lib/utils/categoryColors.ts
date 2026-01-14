
import { scaleSequential, scaleDiverging } from 'd3-scale';
import { interpolateViridis, interpolateRdBu } from 'd3-scale-chromatic';


/**
 * Category color system for embedding visualization.
 *
 * Provides:
 * - Preset palettes for known category types (e.g., WordNet POS)
 * - Dynamic color generation for arbitrary categories
 * - Color utility functions
 */

export interface CategoryColorPreset {
  name: string;
  colors: Record<string, string>;
  labels?: Record<string, string>;
}

// ============ Sequential & Diverging Generators ============

/**
 * Creates a sequential scale (e.g., for probability, density).
 * Maps [0, 1] -> Color
 */
export function getSequentialScale(domain: [number, number] = [0, 1]) {
  return scaleSequential(interpolateViridis).domain(domain);
}

/**
 * Creates a diverging scale (e.g., for sentiment, correlation).
 * Maps [-1, 0, 1] -> [Red, White, Blue]
 */
export function getDivergingScale(domain: [number, number, number] = [-1, 0, 1]) {
  return scaleDiverging(interpolateRdBu).domain(domain);
}


// ============ D3-style category palettes ============

const category10 = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
];

const category20 = [
  '#1f77b4',
  '#aec7e8',
  '#ff7f0e',
  '#ffbb78',
  '#2ca02c',
  '#98df8a',
  '#d62728',
  '#ff9896',
  '#9467bd',
  '#c5b0d5',
  '#8c564b',
  '#c49c94',
  '#e377c2',
  '#f7b6d2',
  '#7f7f7f',
  '#c7c7c7',
  '#bcbd22',
  '#dbdb8d',
  '#17becf',
  '#9edae5',
];

// ============ Preset palettes for known category types ============

/**
 * WordNet Part-of-Speech colors.
 * Original palette from the project.
 */
export const POS_PRESET: CategoryColorPreset = {
  name: 'Part of Speech',
  colors: {
    n: '#1f77b4', // noun - blue
    v: '#ff7f0e', // verb - orange
    a: '#2ca02c', // adjective - green
    r: '#d62728', // adverb - red
    s: '#9467bd', // adjective satellite - purple
    unknown: '#7f7f7f', // unknown - gray
  },
  labels: {
    n: 'Noun',
    v: 'Verb',
    a: 'Adjective',
    r: 'Adverb',
    s: 'Adj. Satellite',
    unknown: 'Unknown',
  },
};

/**
 * All known presets, keyed by category field name.
 */
export const CATEGORY_PRESETS: Record<string, CategoryColorPreset> = {
  pos: POS_PRESET,
  part_of_speech: POS_PRESET,
};

// ============ Dynamic color generation ============

/**
 * Generate colors for a given number of categories.
 * Uses D3-style category palettes.
 */
export function generateCategoryColors(count: number): string[] {
  if (count < 1) {
    count = 1;
  }
  if (count <= category10.length) {
    return category10.slice(0, count);
  } else if (count <= category20.length) {
    return category20.slice(0, count);
  } else {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors[i] = category20[i % category20.length];
    }
    return colors;
  }
}

/**
 * Build a color map for a set of category values.
 *
 * If a preset exists for the category field, use it.
 * Otherwise, generate colors dynamically.
 *
 * @param categoryField - The name of the category field (e.g., "pos", "topic")
 * @param values - Array of unique category values
 * @returns Object mapping category values to colors
 */
export function buildCategoryColorMap(
  categoryField: string | null,
  values: string[]
): Record<string, string> {
  const colorMap: Record<string, string> = {};

  // Check for preset
  const preset = categoryField ? CATEGORY_PRESETS[categoryField.toLowerCase()] : null;

  if (preset) {
    // Use preset colors, fall back to gray for unknown values
    for (const value of values) {
      colorMap[value] = preset.colors[value] ?? preset.colors['unknown'] ?? '#7f7f7f';
    }
  } else {
    // Generate colors dynamically
    const colors = generateCategoryColors(values.length);
    for (let i = 0; i < values.length; i++) {
      colorMap[values[i]] = colors[i];
    }
  }

  return colorMap;
}

/**
 * Get human-readable label for a category value.
 *
 * @param categoryField - The name of the category field
 * @param value - The category value
 * @returns Human-readable label or the original value
 */
export function getCategoryLabel(categoryField: string | null, value: string): string {
  const preset = categoryField ? CATEGORY_PRESETS[categoryField.toLowerCase()] : null;
  return preset?.labels?.[value] ?? value;
}

/**
 * Get the display name for a category field.
 *
 * @param categoryField - The name of the category field
 * @returns Human-readable name for the category
 */
export function getCategoryDisplayName(categoryField: string | null): string {
  if (!categoryField) return 'Category';
  const preset = CATEGORY_PRESETS[categoryField.toLowerCase()];
  if (preset) return preset.name;
  // Convert snake_case/camelCase to Title Case
  return categoryField
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============ Legacy exports for backwards compatibility ============

/** @deprecated Use buildCategoryColorMap with 'pos' field instead */
export const POS_COLORS = POS_PRESET.colors;

/** @deprecated Use getCategoryLabel with 'pos' field instead */
export const POS_LABELS = POS_PRESET.labels;
