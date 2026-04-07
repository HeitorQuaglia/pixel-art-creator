import { describe, it, expect } from 'vitest';
import { createCanvas, getPixel } from '../../canvas.js';
import { line } from '../../tools/line.js';

describe('line', () => {
  it('draws a horizontal line of 5 pixels', () => {
    const data = createCanvas(10, 10);
    const deltas = line(data, 10, 10, 0, 0, 4, 0, '#ff0000');
    expect(deltas).toHaveLength(5);
    for (let x = 0; x <= 4; x++) {
      expect(getPixel(data, 10, x, 0)).toBe('#ff0000ff');
    }
  });

  it('draws a vertical line of 5 pixels', () => {
    const data = createCanvas(10, 10);
    const deltas = line(data, 10, 10, 2, 0, 2, 4, '#00ff00');
    expect(deltas).toHaveLength(5);
    for (let y = 0; y <= 4; y++) {
      expect(getPixel(data, 10, 2, y)).toBe('#00ff00ff');
    }
  });

  it('draws a diagonal line of 4 pixels', () => {
    const data = createCanvas(10, 10);
    const deltas = line(data, 10, 10, 0, 0, 3, 3, '#0000ff');
    expect(deltas).toHaveLength(4);
    for (let i = 0; i <= 3; i++) {
      expect(getPixel(data, 10, i, i)).toBe('#0000ffff');
    }
  });

  it('draws a single point when start equals end', () => {
    const data = createCanvas(10, 10);
    const deltas = line(data, 10, 10, 5, 5, 5, 5, '#ffffff');
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toMatchObject({ x: 5, y: 5, newColor: '#ffffffff' });
  });

  it('clips pixels that fall outside canvas bounds', () => {
    const data = createCanvas(4, 4);
    // Line from (2,2) to (6,2) - only x=2,3 are in bounds
    const deltas = line(data, 4, 4, 2, 2, 6, 2, '#ff0000');
    expect(deltas).toHaveLength(2);
    expect(getPixel(data, 4, 2, 2)).toBe('#ff0000ff');
    expect(getPixel(data, 4, 3, 2)).toBe('#ff0000ff');
  });

  it('each delta has correct oldColor and newColor', () => {
    const data = createCanvas(5, 5);
    const deltas = line(data, 5, 5, 0, 0, 2, 0, '#aabbcc');
    for (const delta of deltas) {
      expect(delta.oldColor).toBe('#00000000');
      expect(delta.newColor).toBe('#aabbccff');
    }
  });
});
