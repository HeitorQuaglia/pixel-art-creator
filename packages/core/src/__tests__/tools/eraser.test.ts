import { describe, it, expect } from 'vitest';
import { createCanvas, getPixel } from '../../canvas.js';
import { eraser } from '../../tools/eraser.js';

describe('eraser', () => {
  it('sets a previously colored pixel to transparent and returns a delta', () => {
    const data = createCanvas(4, 4);
    data[0] = 255; data[1] = 0; data[2] = 0; data[3] = 255; // pixel (0,0) = red
    const deltas = eraser(data, 4, 4, 0, 0);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toMatchObject({ x: 0, y: 0, oldColor: '#ff0000ff', newColor: '#00000000' });
  });

  it('clears the pixel in canvas data', () => {
    const data = createCanvas(4, 4);
    data[0] = 255; data[1] = 0; data[2] = 0; data[3] = 255;
    eraser(data, 4, 4, 0, 0);
    expect(getPixel(data, 4, 0, 0)).toBe('#00000000');
  });

  it('returns empty array for out-of-bounds coordinates', () => {
    const data = createCanvas(4, 4);
    expect(eraser(data, 4, 4, 4, 0)).toEqual([]);
    expect(eraser(data, 4, 4, -1, 0)).toEqual([]);
    expect(eraser(data, 4, 4, 0, 4)).toEqual([]);
  });

  it('erasing an already transparent pixel returns delta with same old and new color', () => {
    const data = createCanvas(4, 4);
    const deltas = eraser(data, 4, 4, 1, 1);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toMatchObject({ x: 1, y: 1, oldColor: '#00000000', newColor: '#00000000' });
  });
});
