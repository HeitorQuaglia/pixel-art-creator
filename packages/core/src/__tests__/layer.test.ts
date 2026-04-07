import { describe, it, expect } from 'vitest';
import { createLayer, flattenLayers } from '../layer.js';
import { setPixel, getPixel } from '../canvas.js';
import type { LayerData } from '../types.js';

describe('createLayer', () => {
  it('creates a layer with transparent canvas', () => {
    const layer = createLayer('Background', 4, 4);
    expect(layer.name).toBe('Background');
    expect(layer.visible).toBe(true);
    expect(layer.opacity).toBe(1.0);
    expect(layer.data.byteLength).toBe(4 * 4 * 4);
  });
});

describe('flattenLayers', () => {
  it('returns transparent canvas for no visible layers', () => {
    const layer: LayerData = createLayer('Hidden', 2, 2);
    layer.visible = false;
    setPixel(layer.data, 2, 0, 0, '#ff0000');
    const result = flattenLayers([layer], 2, 2);
    expect(getPixel(result, 2, 0, 0)).toBe('#00000000');
  });
  it('flattens single visible layer at full opacity', () => {
    const layer = createLayer('Base', 2, 2);
    setPixel(layer.data, 2, 0, 0, '#ff0000');
    const result = flattenLayers([layer], 2, 2);
    expect(getPixel(result, 2, 0, 0)).toBe('#ff0000ff');
  });
  it('composites layers bottom to top', () => {
    const bottom = createLayer('Bottom', 2, 2);
    setPixel(bottom.data, 2, 0, 0, '#ff0000');
    const top = createLayer('Top', 2, 2);
    setPixel(top.data, 2, 0, 0, '#00ff00');
    const result = flattenLayers([bottom, top], 2, 2);
    expect(getPixel(result, 2, 0, 0)).toBe('#00ff00ff');
    expect(getPixel(result, 2, 1, 0)).toBe('#00000000');
  });
  it('respects layer opacity', () => {
    const bottom = createLayer('Bottom', 1, 1);
    setPixel(bottom.data, 1, 0, 0, '#ff0000');
    const top = createLayer('Top', 1, 1);
    top.opacity = 0.0;
    setPixel(top.data, 1, 0, 0, '#00ff00');
    const result = flattenLayers([bottom, top], 1, 1);
    expect(getPixel(result, 1, 0, 0)).toBe('#ff0000ff');
  });
});
