import { MAX_CANVAS_SIZE, type Color } from './types.js';
import { PixelArtError } from './errors.js';

export function createCanvas(width: number, height: number): Uint8ClampedArray {
  if (width <= 0 || height <= 0) {
    throw new PixelArtError('INVALID_ARGS', `Canvas dimensions must be positive, got ${width}x${height}`);
  }
  if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
    throw new PixelArtError('CANVAS_TOO_LARGE', `Canvas dimensions ${width}x${height} exceed limit ${MAX_CANVAS_SIZE}x${MAX_CANVAS_SIZE}`);
  }
  return new Uint8ClampedArray(width * height * 4);
}

export function isInBounds(width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

export function pixelIndex(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

export function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): Color {
  const idx = pixelIndex(width, x, y);
  const r = data[idx].toString(16).padStart(2, '0');
  const g = data[idx + 1].toString(16).padStart(2, '0');
  const b = data[idx + 2].toString(16).padStart(2, '0');
  const a = data[idx + 3].toString(16).padStart(2, '0');
  return `#${r}${g}${b}${a}`;
}

export function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, color: Color): void {
  const idx = pixelIndex(width, x, y);
  const { r, g, b, a } = parseColor(color);
  data[idx] = r;
  data[idx + 1] = g;
  data[idx + 2] = b;
  data[idx + 3] = a;
}

export function parseColor(color: Color): { r: number; g: number; b: number; a: number } {
  if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
    throw new PixelArtError('INVALID_COLOR_FORMAT', `Invalid color format: ${color}. Expected #RRGGBB or #RRGGBBAA`);
  }
  const hex = color.slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255,
  };
}
