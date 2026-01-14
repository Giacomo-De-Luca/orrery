
import { Point2D } from "../../lib/types/types";

export interface DensityMapResult {
  density: Float32Array;
  width: number;
  height: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Generates a density map from 2D points using CPU-based binning and Gaussian blur.
 */
export function computeDensityMap(
  points: Point2D[],
  gridWidth: number,
  gridHeight: number,
  bandwidth: number // Sigma for Gaussian blur in grid pixels
): DensityMapResult {
  // 1. Find bounds with padding
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const p of points) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }

  // Add 10% padding to ensure clusters at edges are captured
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const paddingX = xRange * 0.1;
  const paddingY = yRange * 0.1;
  
  xMin -= paddingX;
  xMax += paddingX;
  yMin -= paddingY;
  yMax += paddingY;

  const width = gridWidth;
  const height = gridHeight;
  const grid = new Float32Array(width * height);
  
  // Scale factors to map data coordinates to grid coordinates
  const xScale = (width - 1) / (xMax - xMin);
  const yScale = (height - 1) / (yMax - yMin);

  // 2. Bin points (Histogram)
  for (const p of points) {
    const gx = Math.round((p.x - xMin) * xScale);
    const gy = Math.round((p.y - yMin) * yScale);
    
    if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
      grid[gy * width + gx] += 1.0;
    }
  }

  // 3. Apply Gaussian Blur (Separable filter for performance)
  const blurred = gaussianBlur(grid, width, height, bandwidth);

  return {
    density: blurred,
    width,
    height,
    xMin,
    xMax,
    yMin,
    yMax
  };
}

function gaussianBlur(
  data: Float32Array,
  width: number,
  height: number,
  sigma: number
): Float32Array {
  const radius = Math.ceil(sigma * 3);
  const kernelSize = radius * 2 + 1;
  const kernel = new Float32Array(kernelSize);
  const sigma2 = sigma * sigma;
  const scale2sigma2 = 1.0 / (2.0 * sigma2);
  const sqrt2piSigma = 1.0 / (Math.sqrt(2.0 * Math.PI) * sigma);

  // Generate 1D Gaussian kernel
  let sum = 0.0;
  for (let i = 0; i < kernelSize; i++) {
    const x = i - radius;
    const val = Math.exp(-(x * x) * scale2sigma2) * sqrt2piSigma;
    kernel[i] = val;
    sum += val;
  }
  // Normalize kernel
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }

  const temp = new Float32Array(data.length);
  const result = new Float32Array(data.length);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let val = 0.0;
      for (let k = 0; k < kernelSize; k++) {
        const kx = x + (k - radius);
        // Clamp to edge
        const px = Math.min(Math.max(kx, 0), width - 1);
        val += data[rowOffset + px] * kernel[k];
      }
      temp[rowOffset + x] = val;
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let val = 0.0;
      for (let k = 0; k < kernelSize; k++) {
        const ky = y + (k - radius);
        // Clamp to edge
        const py = Math.min(Math.max(ky, 0), height - 1);
        val += temp[py * width + x] * kernel[k];
      }
      result[y * width + x] = val;
    }
  }

  return result;
}
