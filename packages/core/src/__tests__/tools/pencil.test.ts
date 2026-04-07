import { describe, it, expect } from 'vitest';
import { createCanvas, getPixel } from '../../canvas.js';
import { pencil } from '../../tools/pencil.js';

describe('pencil', () => {
  it('returns a PixelDelta with old and new color', () => {
    const data = createCanvas(4, 4);
    const deltas = pencil(data, 4, 4, 1, 1, '#ff0000');
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toMatchObject({ x: 1, y: 1, oldColor: '#00000000', newColor: '#ff0000ff' });
  });

  it('applies the pixel to the canvas data', () => {
    const data = createCanvas(4, 4);
    pencil(data, 4, 4, 2, 3, '#00ff00');
    expect(getPixel(data, 4, 2, 3)).toBe('#00ff00ff');
  });

  it('returns empty array for out-of-bounds coordinates', () => {
    const data = createCanvas(4, 4);
    expect(pencil(data, 4, 4, 4, 0, '#ff0000')).toEqual([]);
    expect(pencil(data, 4, 4, -1, 0, '#ff0000')).toEqual([]);
    expect(pencil(data, 4, 4, 0, 4, '#ff0000')).toEqual([]);
  });

  it('records correct oldColor when pixel already has color', () => {
    const data = createCanvas(4, 4);
    pencil(data, 4, 4, 0, 0, '#ff0000');
    const deltas = pencil(data, 4, 4, 0, 0, '#0000ff');
    expect(deltas[0].oldColor).toBe('#ff0000ff');
    expect(deltas[0].newColor).toBe('#0000ffff');
  });

  it('handles 8-digit hex colors with alpha', () => {
    const data = createCanvas(4, 4);
    const deltas = pencil(data, 4, 4, 1, 1, '#ff000080');
    expect(deltas[0].newColor).toBe('#ff000080');
  });
});
