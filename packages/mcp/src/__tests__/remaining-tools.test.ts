import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Session } from '../session.js';
import { handleCreateCanvas } from '../tools/canvas-tools.js';
import { handleDrawPixels } from '../tools/drawing-tools.js';
import { handleTransform, handleMirrorMode, handleSelectAndMove } from '../tools/transform-tools.js';
import { handleSetPalette } from '../tools/palette-tools.js';
import { handleExportPng } from '../tools/export-tools.js';
import { getPixel, PixelArtError } from '@pixel-art/core';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('Transform tools', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
    handleCreateCanvas(session, { width: 4, height: 4 });
  });

  describe('flip_h', () => {
    it('flips horizontally', () => {
      handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
      handleTransform(session, { operation: 'flip_h' });
      const doc = session.document!;
      // x=0 should now be empty, x=3 should be red
      expect(getPixel(doc.layers[0].data, doc.width, 3, 0)).toBe('#ff0000ff');
      expect(getPixel(doc.layers[0].data, doc.width, 0, 0)).toBe('#00000000');
    });

    it('returns success message', () => {
      const result = handleTransform(session, { operation: 'flip_h' });
      expect(result.content[0].text).toContain('Flipped horizontally');
    });
  });

  describe('rotate', () => {
    it('rotates 90 degrees', () => {
      handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
      handleTransform(session, { operation: 'rotate', degrees: 90 });
      const doc = session.document!;
      // After 90 deg rotation, (0,0) maps to (height-1, 0) = (3,0)
      expect(getPixel(doc.layers[0].data, doc.width, 3, 0)).toBe('#ff0000ff');
    });

    it('throws for invalid degrees', () => {
      expect(() => handleTransform(session, { operation: 'rotate', degrees: 45 })).toThrow(PixelArtError);
    });

    it('rotates 180 degrees', () => {
      handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
      handleTransform(session, { operation: 'rotate', degrees: 180 });
      const doc = session.document!;
      expect(getPixel(doc.layers[0].data, doc.width, 3, 3)).toBe('#ff0000ff');
    });
  });

  describe('resize', () => {
    it('resizes the canvas', () => {
      handleTransform(session, { operation: 'resize', width: 8, height: 8 });
      const doc = session.document!;
      expect(doc.width).toBe(8);
      expect(doc.height).toBe(8);
    });

    it('throws when width/height missing', () => {
      expect(() => handleTransform(session, { operation: 'resize' })).toThrow(PixelArtError);
    });
  });
});

describe('mirror_mode', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
    handleCreateCanvas(session, { width: 8, height: 8 });
  });

  it('enables horizontal mirror', () => {
    handleMirrorMode(session, { horizontal: true });
    expect(session.document!.mirrorMode.horizontal).toBe(true);
    expect(session.document!.mirrorMode.vertical).toBe(false);
  });

  it('enables vertical mirror', () => {
    handleMirrorMode(session, { vertical: true });
    expect(session.document!.mirrorMode.vertical).toBe(true);
  });

  it('disables mirror', () => {
    handleMirrorMode(session, { horizontal: true, vertical: true });
    handleMirrorMode(session, { horizontal: false, vertical: false });
    expect(session.document!.mirrorMode.horizontal).toBe(false);
    expect(session.document!.mirrorMode.vertical).toBe(false);
  });

  it('returns current mirror state in result', () => {
    const result = handleMirrorMode(session, { horizontal: true });
    expect(result.content[0].text).toContain('horizontal=true');
  });
});

describe('select_and_move', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
    handleCreateCanvas(session, { width: 8, height: 8 });
    handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
  });

  it('moves a pixel region', () => {
    handleSelectAndMove(session, { x: 0, y: 0, width: 1, height: 1, dx: 2, dy: 2 });
    const doc = session.document!;
    expect(getPixel(doc.activeLayer.data, doc.width, 2, 2)).toBe('#ff0000ff');
  });
});

describe('set_palette', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
    handleCreateCanvas(session, { width: 4, height: 4 });
  });

  it('sets a preset palette by name', () => {
    handleSetPalette(session, { name: 'PICO-8' });
    expect(session.document!.palette.name).toBe('PICO-8');
    expect(session.document!.palette.colors).toHaveLength(16);
  });

  it('sets a custom palette by colors', () => {
    handleSetPalette(session, { colors: ['#ff0000', '#00ff00', '#0000ff'] });
    expect(session.document!.palette.name).toBe('Custom');
    expect(session.document!.palette.colors).toHaveLength(3);
  });

  it('throws for unknown preset name', () => {
    expect(() => handleSetPalette(session, { name: 'BogusName' })).toThrow(PixelArtError);
  });

  it('throws for invalid color format', () => {
    expect(() => handleSetPalette(session, { colors: ['not-a-color'] })).toThrow(PixelArtError);
  });

  it('throws when neither name nor colors provided', () => {
    expect(() => handleSetPalette(session, {})).toThrow(PixelArtError);
  });
});

describe('export_png', () => {
  let session: Session;
  const tmpFiles: string[] = [];

  beforeEach(() => {
    session = new Session();
    handleCreateCanvas(session, { width: 4, height: 4 });
    handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
  });

  afterEach(() => {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
    tmpFiles.length = 0;
  });

  it('exports a PNG file', () => {
    const tmpPath = path.join(os.tmpdir(), `export-test-${Date.now()}.png`);
    tmpFiles.push(tmpPath);
    const result = handleExportPng(session, { path: tmpPath });
    expect(fs.existsSync(tmpPath)).toBe(true);
    expect(result.content[0].text).toContain('Exported PNG');
  });

  it('exports with specific layers', () => {
    const tmpPath = path.join(os.tmpdir(), `export-layers-test-${Date.now()}.png`);
    tmpFiles.push(tmpPath);
    handleExportPng(session, { path: tmpPath, layers: [0] });
    expect(fs.existsSync(tmpPath)).toBe(true);
  });
});
