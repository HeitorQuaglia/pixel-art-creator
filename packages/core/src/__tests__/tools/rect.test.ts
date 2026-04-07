import { describe, it, expect } from 'vitest';
import { createCanvas, getPixel } from '../../canvas.js';
import { rect } from '../../tools/rect.js';

describe('rect', () => {
  it('draws a 3x3 outline with 8 pixels by default', () => {
    const data = createCanvas(10, 10);
    const deltas = rect(data, 10, 10, 1, 1, 3, 3, '#ff0000');
    expect(deltas).toHaveLength(8);
    // corners and edges
    expect(getPixel(data, 10, 1, 1)).toBe('#ff0000ff');
    expect(getPixel(data, 10, 3, 1)).toBe('#ff0000ff');
    expect(getPixel(data, 10, 1, 3)).toBe('#ff0000ff');
    expect(getPixel(data, 10, 3, 3)).toBe('#ff0000ff');
    // interior pixel should be untouched
    expect(getPixel(data, 10, 2, 2)).toBe('#00000000');
  });

  it('draws a 3x3 filled rect with 9 pixels', () => {
    const data = createCanvas(10, 10);
    const deltas = rect(data, 10, 10, 0, 0, 3, 3, '#00ff00', true);
    expect(deltas).toHaveLength(9);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(getPixel(data, 10, x, y)).toBe('#00ff00ff');
      }
    }
  });

  it('defaults to outline (filled=false)', () => {
    const data = createCanvas(10, 10);
    const deltas = rect(data, 10, 10, 0, 0, 3, 3, '#0000ff');
    // 3x3 outline = 8 pixels (perimeter), not 9
    expect(deltas).toHaveLength(8);
    // center should be untouched
    expect(getPixel(data, 10, 1, 1)).toBe('#00000000');
  });

  it('clips pixels that fall outside canvas bounds', () => {
    const data = createCanvas(4, 4);
    // Rect from (2,2) with size 4x4 - only 2x2 portion fits
    const deltas = rect(data, 4, 4, 2, 2, 4, 4, '#ff0000', true);
    // In-bounds pixels: x=2,3 and y=2,3 = 4 pixels
    expect(deltas).toHaveLength(4);
  });

  it('each delta has correct oldColor and newColor', () => {
    const data = createCanvas(5, 5);
    const deltas = rect(data, 5, 5, 0, 0, 2, 2, '#aabbcc');
    for (const delta of deltas) {
      expect(delta.oldColor).toBe('#00000000');
      expect(delta.newColor).toBe('#aabbccff');
    }
  });
});
