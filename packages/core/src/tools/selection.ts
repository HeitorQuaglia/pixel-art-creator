import type { Selection, PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds, pixelIndex } from '../canvas.js';

export function select(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, w: number, h: number): Selection {
  const clampedW = Math.min(w, width - x);
  const clampedH = Math.min(h, height - y);
  const selData = new Uint8ClampedArray(clampedW * clampedH * 4);
  for (let sy = 0; sy < clampedH; sy++) {
    for (let sx = 0; sx < clampedW; sx++) {
      const srcIdx = pixelIndex(width, x + sx, y + sy);
      const dstIdx = (sy * clampedW + sx) * 4;
      selData[dstIdx] = data[srcIdx]; selData[dstIdx + 1] = data[srcIdx + 1];
      selData[dstIdx + 2] = data[srcIdx + 2]; selData[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return { x, y, width: clampedW, height: clampedH, data: selData };
}

export function move(data: Uint8ClampedArray, width: number, height: number, selection: Selection, dx: number, dy: number): PixelDelta[] {
  const deltas: PixelDelta[] = [];
  for (let sy = 0; sy < selection.height; sy++) {
    for (let sx = 0; sx < selection.width; sx++) {
      const px = selection.x + sx, py = selection.y + sy;
      if (isInBounds(width, height, px, py)) {
        const oldColor = getPixel(data, width, px, py);
        if (oldColor !== '#00000000') {
          setPixel(data, width, px, py, '#00000000');
          deltas.push({ x: px, y: py, oldColor, newColor: '#00000000' });
        }
      }
    }
  }
  for (let sy = 0; sy < selection.height; sy++) {
    for (let sx = 0; sx < selection.width; sx++) {
      const selIdx = (sy * selection.width + sx) * 4;
      const r = selection.data[selIdx], g = selection.data[selIdx + 1], b = selection.data[selIdx + 2], a = selection.data[selIdx + 3];
      if (a === 0) continue;
      const px = selection.x + sx + dx, py = selection.y + sy + dy;
      if (!isInBounds(width, height, px, py)) continue;
      const oldColor = getPixel(data, width, px, py);
      const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
      setPixel(data, width, px, py, newColor);
      deltas.push({ x: px, y: py, oldColor, newColor });
    }
  }
  return deltas;
}
