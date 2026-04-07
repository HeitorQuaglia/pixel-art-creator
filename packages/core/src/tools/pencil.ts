import type { Color, PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds, parseColor } from '../canvas.js';

export function pencil(
  data: Uint8ClampedArray, width: number, height: number,
  x: number, y: number, color: Color,
): PixelDelta[] {
  if (!isInBounds(width, height, x, y)) return [];
  const oldColor = getPixel(data, width, x, y);
  const { r, g, b, a } = parseColor(color);
  const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  setPixel(data, width, x, y, color);
  return [{ x, y, oldColor, newColor }];
}
