import { describe, it, expect } from 'vitest';
import { createCanvas, getPixel, setPixel } from '../../canvas.js';
import { select, move } from '../../tools/selection.js';

describe('select', () => {
  it('returns correct bounds and copies pixel data', () => {
    const data = createCanvas(8, 8);
    setPixel(data, 8, 1, 1, '#ff0000');
    setPixel(data, 8, 2, 1, '#00ff00');
    setPixel(data, 8, 1, 2, '#0000ff');
    setPixel(data, 8, 2, 2, '#ffffff');

    const sel = select(data, 8, 8, 1, 1, 2, 2);
    expect(sel.x).toBe(1);
    expect(sel.y).toBe(1);
    expect(sel.width).toBe(2);
    expect(sel.height).toBe(2);
    // 4 pixels * 4 channels = 16 bytes
    expect(sel.data).toHaveLength(16);
    // First pixel = red
    expect(sel.data[0]).toBe(255);
    expect(sel.data[1]).toBe(0);
    expect(sel.data[2]).toBe(0);
    expect(sel.data[3]).toBe(255);
  });

  it('clamps selection to canvas bounds', () => {
    const data = createCanvas(4, 4);
    // Request 4x4 starting at (2,2) - should clamp to 2x2
    const sel = select(data, 4, 4, 2, 2, 4, 4);
    expect(sel.width).toBe(2);
    expect(sel.height).toBe(2);
    expect(sel.data).toHaveLength(2 * 2 * 4);
  });
});

describe('move', () => {
  it('clears original pixels and places them at new offset', () => {
    const data = createCanvas(8, 8);
    setPixel(data, 8, 1, 1, '#ff0000');
    setPixel(data, 8, 2, 1, '#00ff00');

    const sel = select(data, 8, 8, 1, 1, 2, 1);
    const deltas = move(data, 8, 8, sel, 2, 2);

    // Original pixels should be cleared
    expect(getPixel(data, 8, 1, 1)).toBe('#00000000');
    expect(getPixel(data, 8, 2, 1)).toBe('#00000000');

    // Pixels at new positions
    expect(getPixel(data, 8, 3, 3)).toBe('#ff0000ff');
    expect(getPixel(data, 8, 4, 3)).toBe('#00ff00ff');
  });

  it('returns deltas for both clearing and placing', () => {
    const data = createCanvas(8, 8);
    setPixel(data, 8, 0, 0, '#ff0000');

    const sel = select(data, 8, 8, 0, 0, 1, 1);
    const deltas = move(data, 8, 8, sel, 3, 3);

    // One delta for clearing (0,0) and one for placing (3,3)
    expect(deltas).toHaveLength(2);
    const clearDelta = deltas.find(d => d.x === 0 && d.y === 0);
    expect(clearDelta).toBeDefined();
    expect(clearDelta!.newColor).toBe('#00000000');

    const placeDelta = deltas.find(d => d.x === 3 && d.y === 3);
    expect(placeDelta).toBeDefined();
    expect(placeDelta!.newColor).toBe('#ff0000ff');
  });

  it('clips moved pixels that fall outside canvas bounds', () => {
    const data = createCanvas(4, 4);
    setPixel(data, 4, 0, 0, '#ff0000');

    const sel = select(data, 4, 4, 0, 0, 1, 1);
    // Move way outside bounds
    const deltas = move(data, 4, 4, sel, 10, 10);

    // Only the clear delta should be in result (place is OOB)
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toMatchObject({ x: 0, y: 0, newColor: '#00000000' });
  });

  it('does not clear fully transparent source pixels', () => {
    const data = createCanvas(4, 4);
    // pixel (0,0) stays transparent, pixel (1,0) is red
    setPixel(data, 4, 1, 0, '#ff0000');

    const sel = select(data, 4, 4, 0, 0, 2, 1);
    const deltas = move(data, 4, 4, sel, 0, 2);

    // Only the red pixel at (1,0) should generate a clear delta
    const clearDeltas = deltas.filter(d => d.newColor === '#00000000');
    expect(clearDeltas).toHaveLength(1);
    expect(clearDeltas[0].x).toBe(1);
  });
});
