import type { PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds } from '../canvas.js';

export function eraser(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): PixelDelta[] {
  if (!isInBounds(width, height, x, y)) return [];
  const oldColor = getPixel(data, width, x, y);
  setPixel(data, width, x, y, '#00000000');
  return [{ x, y, oldColor, newColor: '#00000000' }];
}
