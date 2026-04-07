import type { Color, PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds, parseColor } from '../canvas.js';

export function line(data: Uint8ClampedArray, width: number, height: number, x0: number, y0: number, x1: number, y1: number, color: Color): PixelDelta[] {
  const { r, g, b, a } = parseColor(color);
  const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  const deltas: PixelDelta[] = [];
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, cx = x0, cy = y0;
  while (true) {
    if (isInBounds(width, height, cx, cy)) {
      const oldColor = getPixel(data, width, cx, cy);
      setPixel(data, width, cx, cy, color);
      deltas.push({ x: cx, y: cy, oldColor, newColor });
    }
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; cx += sx; }
    if (e2 <= dx) { err += dx; cy += sy; }
  }
  return deltas;
}
