import { describe, it, expect } from 'vitest';
import { createCanvas, getPixel, setPixel } from '../../canvas.js';
import { fill } from '../../tools/fill.js';

describe('fill', () => {
  it('fills all connected pixels of the same color (entire 4x4 canvas = 16 pixels)', () => {
    const data = createCanvas(4, 4);
    const deltas = fill(data, 4, 4, 0, 0, '#ff0000');
    expect(deltas).toHaveLength(16);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(getPixel(data, 4, x, y)).toBe('#ff0000ff');
      }
    }
  });

  it('stops at a wall of different colored pixels', () => {
    const data = createCanvas(4, 4);
    // Paint a vertical wall at x=2
    for (let y = 0; y < 4; y++) {
      setPixel(data, 4, 2, y, '#ffffff');
    }
    const deltas = fill(data, 4, 4, 0, 0, '#ff0000');
    // Only pixels x=0 and x=1 (8 pixels) should be filled
    expect(deltas).toHaveLength(8);
    expect(getPixel(data, 4, 0, 0)).toBe('#ff0000ff');
    expect(getPixel(data, 4, 1, 0)).toBe('#ff0000ff');
    expect(getPixel(data, 4, 2, 0)).toBe('#ffffffff'); // wall unchanged
    expect(getPixel(data, 4, 3, 0)).toBe('#00000000'); // untouched
  });

  it('is a no-op when the target color equals the fill color', () => {
    const data = createCanvas(4, 4);
    // Fill the canvas red first
    fill(data, 4, 4, 0, 0, '#ff0000');
    // Try to fill with same color
    const deltas = fill(data, 4, 4, 0, 0, '#ff0000');
    expect(deltas).toEqual([]);
  });

  it('returns empty array for out-of-bounds start position', () => {
    const data = createCanvas(4, 4);
    expect(fill(data, 4, 4, 4, 0, '#ff0000')).toEqual([]);
    expect(fill(data, 4, 4, -1, 0, '#ff0000')).toEqual([]);
    expect(fill(data, 4, 4, 0, 4, '#ff0000')).toEqual([]);
  });

  it('each delta has correct oldColor and newColor', () => {
    const data = createCanvas(4, 4);
    const deltas = fill(data, 4, 4, 0, 0, '#00ff00');
    for (const delta of deltas) {
      expect(delta.oldColor).toBe('#00000000');
      expect(delta.newColor).toBe('#00ff00ff');
    }
  });
});
