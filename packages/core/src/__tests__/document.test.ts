import { describe, it, expect, beforeEach } from 'vitest';
import { Document } from '../document.js';
import { getPixel } from '../canvas.js';
import { PixelArtError } from '../errors.js';

describe('Document', () => {
  let doc: Document;

  beforeEach(() => {
    doc = new Document(8, 8);
  });

  it('creates with one default layer', () => {
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0].name).toBe('Layer 1');
    expect(doc.activeLayerIndex).toBe(0);
  });

  it('has correct dimensions', () => {
    expect(doc.width).toBe(8);
    expect(doc.height).toBe(8);
  });

  it('activeLayer returns the active layer', () => {
    expect(doc.activeLayer).toBe(doc.layers[0]);
  });

  describe('addLayer', () => {
    it('appends a layer by default', () => {
      doc.addLayer('Layer 2');
      expect(doc.layers).toHaveLength(2);
      expect(doc.layers[1].name).toBe('Layer 2');
    });

    it('inserts a layer at specified position', () => {
      doc.addLayer('Layer 2');
      doc.addLayer('Layer 1.5', 1);
      expect(doc.layers[1].name).toBe('Layer 1.5');
      expect(doc.layers[2].name).toBe('Layer 2');
    });
  });

  describe('removeLayer', () => {
    it('removes a layer by index', () => {
      doc.addLayer('Layer 2');
      doc.removeLayer(1);
      expect(doc.layers).toHaveLength(1);
    });

    it('throws when trying to remove the last layer', () => {
      expect(() => doc.removeLayer(0)).toThrow(PixelArtError);
    });

    it('throws for invalid index', () => {
      expect(() => doc.removeLayer(5)).toThrow(PixelArtError);
    });

    it('adjusts activeLayerIndex when removing current last', () => {
      doc.addLayer('Layer 2');
      doc.activeLayerIndex = 1;
      doc.removeLayer(1);
      expect(doc.activeLayerIndex).toBe(0);
    });
  });

  describe('reorderLayer', () => {
    it('moves a layer from one position to another', () => {
      doc.addLayer('Layer 2');
      doc.addLayer('Layer 3');
      doc.reorderLayer(0, 2);
      expect(doc.layers[0].name).toBe('Layer 2');
      expect(doc.layers[2].name).toBe('Layer 1');
    });

    it('throws for invalid from index', () => {
      expect(() => doc.reorderLayer(5, 0)).toThrow(PixelArtError);
    });

    it('throws for invalid to index', () => {
      doc.addLayer('Layer 2');
      expect(() => doc.reorderLayer(0, 5)).toThrow(PixelArtError);
    });
  });

  describe('mergeLayerDown', () => {
    it('merges a layer into the one below it', () => {
      doc.addLayer('Layer 2');
      expect(doc.layers).toHaveLength(2);
      doc.mergeLayerDown(1);
      expect(doc.layers).toHaveLength(1);
    });

    it('throws when merging index 0', () => {
      expect(() => doc.mergeLayerDown(0)).toThrow(PixelArtError);
    });

    it('throws for out of range index', () => {
      expect(() => doc.mergeLayerDown(5)).toThrow(PixelArtError);
    });
  });

  describe('draw', () => {
    it('draws with pencil tool', () => {
      doc.draw('pencil', 2, 3, '#ff0000');
      expect(getPixel(doc.activeLayer.data, doc.width, 2, 3)).toBe('#ff0000ff');
    });

    it('canUndo is true after drawing', () => {
      doc.draw('pencil', 0, 0, '#ff0000');
      expect(doc.canUndo).toBe(true);
    });

    it('supports undo', () => {
      doc.draw('pencil', 0, 0, '#ff0000');
      doc.undo();
      expect(getPixel(doc.activeLayer.data, doc.width, 0, 0)).toBe('#00000000');
      expect(doc.canUndo).toBe(false);
    });

    it('supports redo after undo', () => {
      doc.draw('pencil', 0, 0, '#ff0000');
      doc.undo();
      doc.redo();
      expect(getPixel(doc.activeLayer.data, doc.width, 0, 0)).toBe('#ff0000ff');
      expect(doc.canRedo).toBe(false);
    });

    it('draws with eraser tool', () => {
      doc.draw('pencil', 1, 1, '#ff0000');
      doc.draw('eraser', 1, 1);
      expect(getPixel(doc.activeLayer.data, doc.width, 1, 1)).toBe('#00000000');
    });

    it('draws with fill tool', () => {
      doc.draw('fill', 0, 0, '#00ff00');
      // entire canvas should be filled
      expect(getPixel(doc.activeLayer.data, doc.width, 0, 0)).toBe('#00ff00ff');
      expect(getPixel(doc.activeLayer.data, doc.width, 7, 7)).toBe('#00ff00ff');
    });

    it('draws with line tool', () => {
      doc.draw('line', 0, 0, '#0000ff', 3, 0);
      expect(getPixel(doc.activeLayer.data, doc.width, 0, 0)).toBe('#0000ffff');
      expect(getPixel(doc.activeLayer.data, doc.width, 3, 0)).toBe('#0000ffff');
    });

    it('draws with rect tool', () => {
      doc.draw('rect', 0, 0, '#ff00ff', 3, 3, false);
      expect(getPixel(doc.activeLayer.data, doc.width, 0, 0)).toBe('#ff00ffff');
    });

    it('throws for unknown tool', () => {
      expect(() => doc.draw('unknown' as never, 0, 0, '#ff0000')).toThrow(PixelArtError);
    });
  });

  describe('mirror mode', () => {
    it('mirrors horizontally', () => {
      doc.mirrorMode = { horizontal: true, vertical: false };
      doc.draw('pencil', 2, 3, '#ff0000');
      // mirrored x = width - 1 - 2 = 5
      expect(getPixel(doc.activeLayer.data, doc.width, 2, 3)).toBe('#ff0000ff');
      expect(getPixel(doc.activeLayer.data, doc.width, 5, 3)).toBe('#ff0000ff');
    });

    it('mirrors vertically', () => {
      doc.mirrorMode = { horizontal: false, vertical: true };
      doc.draw('pencil', 2, 1, '#00ff00');
      // mirrored y = height - 1 - 1 = 6
      expect(getPixel(doc.activeLayer.data, doc.width, 2, 1)).toBe('#00ff00ff');
      expect(getPixel(doc.activeLayer.data, doc.width, 2, 6)).toBe('#00ff00ff');
    });

    it('mirrors both horizontally and vertically', () => {
      doc.mirrorMode = { horizontal: true, vertical: true };
      doc.draw('pencil', 1, 1, '#0000ff');
      expect(getPixel(doc.activeLayer.data, doc.width, 1, 1)).toBe('#0000ffff');
      expect(getPixel(doc.activeLayer.data, doc.width, 6, 1)).toBe('#0000ffff');
      expect(getPixel(doc.activeLayer.data, doc.width, 1, 6)).toBe('#0000ffff');
      expect(getPixel(doc.activeLayer.data, doc.width, 6, 6)).toBe('#0000ffff');
    });
  });

  describe('flatten', () => {
    it('returns flattened canvas data', () => {
      doc.draw('pencil', 0, 0, '#ff0000');
      const flat = doc.flatten();
      expect(flat).toBeInstanceOf(Uint8ClampedArray);
      expect(getPixel(flat, doc.width, 0, 0)).toBe('#ff0000ff');
    });
  });

  describe('palette', () => {
    it('has default Free palette', () => {
      expect(doc.palette.name).toBe('Free');
      expect(doc.palette.colors).toHaveLength(0);
    });
  });
});
