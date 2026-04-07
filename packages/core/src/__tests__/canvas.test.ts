import { describe, it, expect } from 'vitest';
import { createCanvas, getPixel, setPixel, isInBounds } from '../canvas.js';
import { MAX_CANVAS_SIZE } from '../types.js';
import { PixelArtError } from '../errors.js';

describe('createCanvas', () => {
  it('creates canvas with correct dimensions', () => {
    const canvas = createCanvas(8, 8);
    expect(canvas.byteLength).toBe(8 * 8 * 4);
  });
  it('initializes all pixels to transparent', () => {
    const canvas = createCanvas(2, 2);
    for (let i = 0; i < canvas.length; i++) {
      expect(canvas[i]).toBe(0);
    }
  });
  it('throws CANVAS_TOO_LARGE for dimensions exceeding limit', () => {
    expect(() => createCanvas(MAX_CANVAS_SIZE + 1, 10)).toThrow(PixelArtError);
    expect(() => createCanvas(10, MAX_CANVAS_SIZE + 1)).toThrow(PixelArtError);
  });
  it('throws INVALID_ARGS for zero or negative dimensions', () => {
    expect(() => createCanvas(0, 10)).toThrow(PixelArtError);
    expect(() => createCanvas(10, -1)).toThrow(PixelArtError);
  });
});

describe('getPixel', () => {
  it('returns hex color at coordinates', () => {
    const canvas = createCanvas(4, 4);
    expect(getPixel(canvas, 4, 0, 0)).toBe('#00000000');
  });
  it('returns color after setPixel', () => {
    const canvas = createCanvas(4, 4);
    setPixel(canvas, 4, 1, 2, '#ff0000');
    expect(getPixel(canvas, 4, 1, 2)).toBe('#ff0000ff');
  });
});

describe('setPixel', () => {
  it('sets RGBA values from #RRGGBB color', () => {
    const canvas = createCanvas(4, 4);
    setPixel(canvas, 4, 0, 0, '#ff8040');
    const idx = 0;
    expect(canvas[idx]).toBe(255);
    expect(canvas[idx + 1]).toBe(128);
    expect(canvas[idx + 2]).toBe(64);
    expect(canvas[idx + 3]).toBe(255);
  });
  it('sets RGBA values from #RRGGBBAA color', () => {
    const canvas = createCanvas(4, 4);
    setPixel(canvas, 4, 0, 0, '#ff804080');
    const idx = 0;
    expect(canvas[idx]).toBe(255);
    expect(canvas[idx + 1]).toBe(128);
    expect(canvas[idx + 2]).toBe(64);
    expect(canvas[idx + 3]).toBe(128);
  });
});

describe('isInBounds', () => {
  it('returns true for valid coordinates', () => {
    expect(isInBounds(4, 4, 0, 0)).toBe(true);
    expect(isInBounds(4, 4, 3, 3)).toBe(true);
  });
  it('returns false for out of bounds', () => {
    expect(isInBounds(4, 4, 4, 0)).toBe(false);
    expect(isInBounds(4, 4, -1, 0)).toBe(false);
  });
});
