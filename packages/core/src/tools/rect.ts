import type { Color, PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds, parseColor } from '../canvas.js';

export function rect(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, w: number, h: number, color: Color, filled?: boolean): PixelDelta[] {
  const { r, g, b, a } = parseColor(color);
  const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  const deltas: PixelDelta[] = [];
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (!isInBounds(width, height, px, py)) continue;
      const isEdge = px === x || px === x + w - 1 || py === y || py === y + h - 1;
      if (!filled && !isEdge) continue;
      const oldColor = getPixel(data, width, px, py);
      setPixel(data, width, px, py, color);
      deltas.push({ x: px, y: py, oldColor, newColor });
    }
  }
  return deltas;
}
