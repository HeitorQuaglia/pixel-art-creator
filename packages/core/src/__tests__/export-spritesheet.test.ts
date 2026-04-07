import { describe, it, expect } from 'vitest';
import { createSpritesheet } from '../export-spritesheet.js';
import { parsePng } from '../export-png.js';
import { Document } from '../document.js';
import { setPixel, getPixel } from '../canvas.js';

describe('createSpritesheet', () => {
  it('two 8x8 docs produce a 16x8 atlas', () => {
    const doc1 = new Document(8, 8);
    const doc2 = new Document(8, 8);

    const { atlas, descriptor } = createSpritesheet([
      { name: 'sprite1', doc: doc1 },
      { name: 'sprite2', doc: doc2 },
    ]);

    const img = parsePng(atlas);
    expect(img.width).toBe(16);
    expect(img.height).toBe(8);
    expect(descriptor.meta.size).toEqual({ w: 16, h: 8 });
  });

  it('produces correct frame descriptors', () => {
    const doc1 = new Document(8, 8);
    const doc2 = new Document(4, 8);

    const { descriptor } = createSpritesheet([
      { name: 'hero', doc: doc1 },
      { name: 'coin', doc: doc2 },
    ]);

    expect(descriptor.frames['hero']).toEqual({
      frame: { x: 0, y: 0, w: 8, h: 8 },
      sourceSize: { w: 8, h: 8 },
    });
    expect(descriptor.frames['coin']).toEqual({
      frame: { x: 8, y: 0, w: 4, h: 8 },
      sourceSize: { w: 4, h: 8 },
    });
  });

  it('places sprite pixels at correct atlas offsets', () => {
    const doc1 = new Document(4, 4);
    const doc2 = new Document(4, 4);
    // Paint top-left pixel of each sprite
    setPixel(doc1.activeLayer.data, 4, 0, 0, '#ff0000ff');
    setPixel(doc2.activeLayer.data, 4, 0, 0, '#0000ffff');

    const { atlas } = createSpritesheet([
      { name: 's1', doc: doc1 },
      { name: 's2', doc: doc2 },
    ]);

    const img = parsePng(atlas);
    expect(img.width).toBe(8);
    expect(img.height).toBe(4);
    // sprite1 starts at x=0
    expect(getPixel(img.data, 8, 0, 0)).toBe('#ff0000ff');
    // sprite2 starts at x=4
    expect(getPixel(img.data, 8, 4, 0)).toBe('#0000ffff');
  });

  it('handles sprites of different heights (atlas height = max)', () => {
    const doc1 = new Document(4, 8);
    const doc2 = new Document(4, 4);

    const { atlas, descriptor } = createSpritesheet([
      { name: 'tall', doc: doc1 },
      { name: 'short', doc: doc2 },
    ]);

    const img = parsePng(atlas);
    expect(img.width).toBe(8);
    expect(img.height).toBe(8);
    expect(descriptor.meta.size).toEqual({ w: 8, h: 8 });
  });

  it('sets meta format to RGBA8888', () => {
    const doc = new Document(2, 2);
    const { descriptor } = createSpritesheet([{ name: 'a', doc }]);
    expect(descriptor.meta.format).toBe('RGBA8888');
  });

  it('atlas is a valid PNG buffer', () => {
    const doc = new Document(4, 4);
    const { atlas } = createSpritesheet([{ name: 'sprite', doc }]);
    // Check PNG magic bytes
    expect(atlas[0]).toBe(0x89);
    expect(atlas[1]).toBe(0x50);
    expect(atlas[2]).toBe(0x4e);
    expect(atlas[3]).toBe(0x47);
  });
});
