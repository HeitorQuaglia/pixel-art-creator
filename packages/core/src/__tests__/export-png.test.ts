import { describe, it, expect } from 'vitest';
import { exportPng, parsePng } from '../export-png.js';
import { Document } from '../document.js';
import { setPixel, getPixel } from '../canvas.js';

describe('exportPng', () => {
  it('produces a buffer starting with PNG magic bytes', () => {
    const doc = new Document(4, 4);
    const buf = exportPng(doc);
    // PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // 'P'
    expect(buf[2]).toBe(0x4e); // 'N'
    expect(buf[3]).toBe(0x47); // 'G'
  });

  it('returns a Buffer', () => {
    const doc = new Document(2, 2);
    const result = exportPng(doc);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('exports only specified layer indices', () => {
    const doc = new Document(2, 2);
    doc.addLayer('Layer 2');
    // Paint layer 0 red, layer 1 green
    setPixel(doc.layers[0].data, 2, 0, 0, '#ff0000ff');
    setPixel(doc.layers[1].data, 2, 0, 0, '#00ff00ff');

    // Export only layer 0
    const buf0 = exportPng(doc, [0]);
    const img0 = parsePng(buf0);
    expect(getPixel(img0.data, 2, 0, 0)).toBe('#ff0000ff');

    // Export only layer 1
    const buf1 = exportPng(doc, [1]);
    const img1 = parsePng(buf1);
    expect(getPixel(img1.data, 2, 0, 0)).toBe('#00ff00ff');
  });

  it('flattens all layers when no indices specified', () => {
    const doc = new Document(2, 2);
    doc.addLayer('Layer 2');
    setPixel(doc.layers[0].data, 2, 0, 0, '#ff0000ff');
    setPixel(doc.layers[1].data, 2, 1, 1, '#0000ffff');

    const buf = exportPng(doc);
    const img = parsePng(buf);

    // Both pixels should be present
    expect(getPixel(img.data, 2, 0, 0)).toBe('#ff0000ff');
    expect(getPixel(img.data, 2, 1, 1)).toBe('#0000ffff');
  });
});

describe('parsePng', () => {
  it('round-trips: encode → decode → verify pixels', () => {
    const doc = new Document(4, 4);
    setPixel(doc.activeLayer.data, 4, 0, 0, '#abcdef80');
    setPixel(doc.activeLayer.data, 4, 3, 3, '#112233ff');

    const buf = exportPng(doc);
    const img = parsePng(buf);

    expect(img.width).toBe(4);
    expect(img.height).toBe(4);
    expect(getPixel(img.data, 4, 0, 0)).toBe('#abcdef80');
    expect(getPixel(img.data, 4, 3, 3)).toBe('#112233ff');
  });

  it('returns a Uint8ClampedArray for data', () => {
    const doc = new Document(2, 2);
    const buf = exportPng(doc);
    const img = parsePng(buf);
    expect(img.data).toBeInstanceOf(Uint8ClampedArray);
  });
});
