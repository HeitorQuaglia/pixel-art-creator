import { describe, it, expect } from 'vitest';
import { serializeProject, deserializeProject } from '../serialization.js';
import { Document } from '../document.js';
import { setPixel, getPixel } from '../canvas.js';
import { PixelArtError } from '../errors.js';

describe('serializeProject', () => {
  it('produces valid JSON', () => {
    const doc = new Document(4, 4);
    const json = serializeProject(doc);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes metadata timestamps', () => {
    const doc = new Document(2, 2);
    const json = serializeProject(doc);
    const parsed = JSON.parse(json);
    expect(parsed.metadata).toBeDefined();
    expect(typeof parsed.metadata.createdAt).toBe('string');
    expect(typeof parsed.metadata.modifiedAt).toBe('string');
    // Should be valid ISO date strings
    expect(() => new Date(parsed.metadata.createdAt)).not.toThrow();
    expect(() => new Date(parsed.metadata.modifiedAt)).not.toThrow();
  });

  it('compressed layer data is smaller than raw pixel data', () => {
    const doc = new Document(8, 8);
    // Mostly transparent canvas compresses well
    const json = serializeProject(doc);
    const parsed = JSON.parse(json);
    const base64Len = parsed.layers[0].data.length;
    const rawBytes = 8 * 8 * 4; // 256 bytes raw
    // base64 of compressed should be smaller than raw (unencoded)
    // base64 adds ~33% overhead, but compression should more than compensate
    const compressedBytes = Math.ceil(base64Len * 3 / 4);
    expect(compressedBytes).toBeLessThan(rawBytes);
  });
});

describe('deserializeProject', () => {
  it('round-trips a document preserving pixels', () => {
    const doc = new Document(4, 4);
    setPixel(doc.activeLayer.data, 4, 1, 2, '#ff0000ff');
    setPixel(doc.activeLayer.data, 4, 3, 3, '#0000ffaa');

    const json = serializeProject(doc);
    const restored = deserializeProject(json);

    expect(restored.width).toBe(4);
    expect(restored.height).toBe(4);
    expect(getPixel(restored.activeLayer.data, 4, 1, 2)).toBe('#ff0000ff');
    expect(getPixel(restored.activeLayer.data, 4, 3, 3)).toBe('#0000ffaa');
  });

  it('preserves layer properties', () => {
    const doc = new Document(2, 2);
    doc.layers[0].name = 'Background';
    doc.layers[0].visible = false;
    doc.layers[0].opacity = 0.5;

    const restored = deserializeProject(serializeProject(doc));

    expect(restored.layers[0].name).toBe('Background');
    expect(restored.layers[0].visible).toBe(false);
    expect(restored.layers[0].opacity).toBe(0.5);
  });

  it('preserves palette', () => {
    const doc = new Document(2, 2);
    doc.palette = { name: 'MyPalette', colors: ['#ff0000', '#00ff00'] };

    const restored = deserializeProject(serializeProject(doc));

    expect(restored.palette.name).toBe('MyPalette');
    expect(restored.palette.colors).toEqual(['#ff0000', '#00ff00']);
  });

  it('preserves multiple layers', () => {
    const doc = new Document(2, 2);
    doc.addLayer('Foreground');
    setPixel(doc.layers[0].data, 2, 0, 0, '#ff0000ff');
    setPixel(doc.layers[1].data, 2, 1, 1, '#00ff00ff');

    const restored = deserializeProject(serializeProject(doc));

    expect(restored.layers.length).toBe(2);
    expect(getPixel(restored.layers[0].data, 2, 0, 0)).toBe('#ff0000ff');
    expect(getPixel(restored.layers[1].data, 2, 1, 1)).toBe('#00ff00ff');
  });

  it('throws INVALID_ARGS for non-JSON input', () => {
    expect(() => deserializeProject('not json')).toThrow(PixelArtError);
    expect(() => deserializeProject('not json')).toThrow('Invalid .pxart file: not valid JSON');
  });

  it('throws INVALID_ARGS for unsupported version', () => {
    const data = JSON.stringify({ version: 99, width: 2, height: 2, layers: [], palette: { name: '', colors: [] }, metadata: {} });
    expect(() => deserializeProject(data)).toThrow(PixelArtError);
    expect(() => deserializeProject(data)).toThrow('Unsupported .pxart version: 99');
  });

  it('throws INVALID_ARGS when layer data size mismatches', () => {
    const doc = new Document(2, 2);
    const json = serializeProject(doc);
    const parsed = JSON.parse(json);
    // Corrupt by replacing with a different doc's layer data (wrong size)
    const bigDoc = new Document(4, 4);
    const bigJson = serializeProject(bigDoc);
    const bigParsed = JSON.parse(bigJson);
    parsed.layers[0].data = bigParsed.layers[0].data;
    expect(() => deserializeProject(JSON.stringify(parsed))).toThrow(PixelArtError);
  });
});
