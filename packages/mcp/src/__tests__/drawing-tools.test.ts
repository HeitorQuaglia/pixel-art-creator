import { describe, it, expect, beforeEach } from 'vitest';
import { Session } from '../session.js';
import { handleCreateCanvas } from '../tools/canvas-tools.js';
import { handleCreateLayer } from '../tools/layer-tools.js';
import {
  handleDrawPixels, handleDrawLine, handleDrawRect, handleFill, handleErase,
} from '../tools/drawing-tools.js';
import { getPixel } from '@pixel-art/core';

describe('Drawing tools', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
    handleCreateCanvas(session, { width: 16, height: 16 });
  });

  describe('draw_pixels', () => {
    it('draws pixels at specified coordinates', () => {
      handleDrawPixels(session, { pixels: [{ x: 3, y: 4, color: '#ff0000' }] });
      const doc = session.document!;
      expect(getPixel(doc.activeLayer.data, doc.width, 3, 4)).toBe('#ff0000ff');
    });

    it('draws multiple pixels', () => {
      handleDrawPixels(session, {
        pixels: [
          { x: 0, y: 0, color: '#ff0000' },
          { x: 1, y: 1, color: '#00ff00' },
        ],
      });
      const doc = session.document!;
      expect(getPixel(doc.activeLayer.data, doc.width, 0, 0)).toBe('#ff0000ff');
      expect(getPixel(doc.activeLayer.data, doc.width, 1, 1)).toBe('#00ff00ff');
    });

    it('draws on a specific layer when layer index provided', () => {
      handleCreateLayer(session, { name: 'L2' });
      handleDrawPixels(session, { pixels: [{ x: 5, y: 5, color: '#0000ff' }], layer: 1 });
      const doc = session.document!;
      // Active layer (0) should be untouched
      expect(getPixel(doc.layers[0].data, doc.width, 5, 5)).toBe('#00000000');
      // Layer 1 should have the pixel
      expect(getPixel(doc.layers[1].data, doc.width, 5, 5)).toBe('#0000ffff');
    });

    it('throws for invalid layer index', () => {
      expect(() => handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#fff' }], layer: 99 })).toThrow();
    });
  });

  describe('draw_line', () => {
    it('draws a horizontal line', () => {
      handleDrawLine(session, { x1: 0, y1: 0, x2: 5, y2: 0, color: '#ff0000' });
      const doc = session.document!;
      expect(getPixel(doc.activeLayer.data, doc.width, 0, 0)).toBe('#ff0000ff');
      expect(getPixel(doc.activeLayer.data, doc.width, 5, 0)).toBe('#ff0000ff');
    });

    it('draws on a specific layer', () => {
      handleCreateLayer(session, { name: 'L2' });
      handleDrawLine(session, { x1: 0, y1: 0, x2: 3, y2: 0, color: '#00ff00', layer: 1 });
      const doc = session.document!;
      expect(getPixel(doc.layers[0].data, doc.width, 0, 0)).toBe('#00000000');
      expect(getPixel(doc.layers[1].data, doc.width, 0, 0)).toBe('#00ff00ff');
    });

    it('returns count of pixels affected', () => {
      const result = handleDrawLine(session, { x1: 0, y1: 0, x2: 4, y2: 0, color: '#ffffff' });
      expect(result.content[0].text).toContain('pixels affected');
    });
  });

  describe('draw_rect', () => {
    it('draws a rect outline', () => {
      handleDrawRect(session, { x: 0, y: 0, width: 4, height: 4, color: '#ff0000' });
      const doc = session.document!;
      // Corners should be drawn
      expect(getPixel(doc.activeLayer.data, doc.width, 0, 0)).toBe('#ff0000ff');
      // Bottom-right corner (w-1, h-1) = (3, 3)
      expect(getPixel(doc.activeLayer.data, doc.width, 3, 3)).toBe('#ff0000ff');
      // Center should be transparent for outline (1,1 inside 4x4)
      expect(getPixel(doc.activeLayer.data, doc.width, 1, 1)).toBe('#00000000');
    });

    it('draws a filled rect', () => {
      handleDrawRect(session, { x: 0, y: 0, width: 4, height: 4, color: '#ff0000', filled: true });
      const doc = session.document!;
      expect(getPixel(doc.activeLayer.data, doc.width, 1, 1)).toBe('#ff0000ff');
    });

    it('draws on a specific layer', () => {
      handleCreateLayer(session, { name: 'L2' });
      handleDrawRect(session, { x: 0, y: 0, width: 3, height: 3, color: '#00ff00', layer: 1 });
      const doc = session.document!;
      expect(getPixel(doc.layers[0].data, doc.width, 0, 0)).toBe('#00000000');
      expect(getPixel(doc.layers[1].data, doc.width, 0, 0)).toBe('#00ff00ff');
    });
  });

  describe('fill', () => {
    it('flood fills from a point', () => {
      handleFill(session, { x: 0, y: 0, color: '#0000ff' });
      const doc = session.document!;
      expect(getPixel(doc.activeLayer.data, doc.width, 0, 0)).toBe('#0000ffff');
      expect(getPixel(doc.activeLayer.data, doc.width, 15, 15)).toBe('#0000ffff');
    });

    it('fills on a specific layer', () => {
      handleCreateLayer(session, { name: 'L2' });
      handleFill(session, { x: 0, y: 0, color: '#ff00ff', layer: 1 });
      const doc = session.document!;
      expect(getPixel(doc.layers[0].data, doc.width, 0, 0)).toBe('#00000000');
      expect(getPixel(doc.layers[1].data, doc.width, 0, 0)).toBe('#ff00ffff');
    });
  });

  describe('erase', () => {
    it('erases a pixel (sets to transparent)', () => {
      handleDrawPixels(session, { pixels: [{ x: 2, y: 2, color: '#ff0000' }] });
      handleErase(session, { x: 2, y: 2 });
      const doc = session.document!;
      expect(getPixel(doc.activeLayer.data, doc.width, 2, 2)).toBe('#00000000');
    });

    it('erases on a specific layer', () => {
      handleCreateLayer(session, { name: 'L2' });
      handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }], layer: 1 });
      handleErase(session, { x: 0, y: 0, layer: 1 });
      const doc = session.document!;
      expect(getPixel(doc.layers[1].data, doc.width, 0, 0)).toBe('#00000000');
    });
  });
});
