import type { Color, PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds, parseColor } from '../canvas.js';

export function fill(data: Uint8ClampedArray, width: number, height: number, startX: number, startY: number, color: Color): PixelDelta[] {
  if (!isInBounds(width, height, startX, startY)) return [];
  const targetColor = getPixel(data, width, startX, startY);
  const { r, g, b, a } = parseColor(color);
  const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  if (targetColor === newColor) return [];
  const deltas: PixelDelta[] = [];
  const visited = new Set<number>();
  const queue: [number, number][] = [[startX, startY]];
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = y * width + x;
    if (visited.has(key)) continue;
    if (!isInBounds(width, height, x, y)) continue;
    if (getPixel(data, width, x, y) !== targetColor) continue;
    visited.add(key);
    const oldColor = getPixel(data, width, x, y);
    setPixel(data, width, x, y, color);
    deltas.push({ x, y, oldColor, newColor });
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return deltas;
}
