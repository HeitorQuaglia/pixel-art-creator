import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Session } from '../session.js';
import { handleCreateCanvas, handleOpenProject, handleSaveProject } from '../tools/canvas-tools.js';
import {
  handleCreateLayer, handleDeleteLayer, handleSetActiveLayer,
  handleSetLayerVisibility, handleSetLayerOpacity, handleReorderLayer, handleMergeLayers,
} from '../tools/layer-tools.js';
import { PixelArtError, serializeProject } from '@pixel-art/core';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('Canvas tools', () => {
  let session: Session;
  const tmpFiles: string[] = [];

  beforeEach(() => { session = new Session(); });
  afterEach(() => {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
      try { fs.unlinkSync(f + '.lock'); } catch { /* ignore */ }
    }
    tmpFiles.length = 0;
  });

  describe('create_canvas', () => {
    it('creates a canvas with the given dimensions', () => {
      const result = handleCreateCanvas(session, { width: 16, height: 16 });
      expect(result.content[0].text).toContain('16x16');
      expect(session.document).not.toBeNull();
    });

    it('creates a canvas with a palette', () => {
      const result = handleCreateCanvas(session, { width: 8, height: 8, palette: 'GameBoy' });
      expect(result.content[0].text).toContain('GameBoy');
      expect(session.document!.palette.name).toBe('GameBoy');
    });

    it('throws for unknown palette', () => {
      expect(() => handleCreateCanvas(session, { width: 8, height: 8, palette: 'BOGUS' })).toThrow(PixelArtError);
    });
  });

  describe('open_project', () => {
    it('opens a valid .pxart file', () => {
      const tmpPath = path.join(os.tmpdir(), `open-test-${Date.now()}.pxart`);
      tmpFiles.push(tmpPath);

      const s1 = new Session();
      s1.createCanvas(12, 12);
      fs.writeFileSync(tmpPath, serializeProject(s1.document!));

      const result = handleOpenProject(session, { path: tmpPath });
      expect(result.content[0].text).toContain('12x12');
      expect(session.document!.width).toBe(12);
    });

    it('throws for missing file', () => {
      expect(() => handleOpenProject(session, { path: '/no/such/file.pxart' })).toThrow(PixelArtError);
    });
  });

  describe('save_project + open_project round-trip', () => {
    it('saves and reloads a project', () => {
      const tmpPath = path.join(os.tmpdir(), `save-test-${Date.now()}.pxart`);
      tmpFiles.push(tmpPath);

      handleCreateCanvas(session, { width: 6, height: 6 });
      handleSaveProject(session, { path: tmpPath });
      expect(fs.existsSync(tmpPath)).toBe(true);

      const session2 = new Session();
      handleOpenProject(session2, { path: tmpPath });
      expect(session2.document!.width).toBe(6);
      expect(session2.document!.height).toBe(6);
    });

    it('save uses current projectPath when no path given', () => {
      const tmpPath = path.join(os.tmpdir(), `save-test2-${Date.now()}.pxart`);
      tmpFiles.push(tmpPath);

      handleCreateCanvas(session, { width: 4, height: 4 });
      handleSaveProject(session, { path: tmpPath }); // set path first
      session.document!; // still open
      handleSaveProject(session, {}); // save again without path
      expect(fs.existsSync(tmpPath)).toBe(true);
    });

    it('throws when no path and no project open', () => {
      handleCreateCanvas(session, { width: 4, height: 4 });
      expect(() => handleSaveProject(session, {})).toThrow(PixelArtError);
    });
  });
});

describe('Layer tools', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
    handleCreateCanvas(session, { width: 8, height: 8 });
  });

  it('create_layer adds a new layer', () => {
    const result = handleCreateLayer(session, { name: 'Background' });
    expect(result.content[0].text).toContain('Background');
    expect(session.document!.layers).toHaveLength(2);
  });

  it('create_layer at position', () => {
    handleCreateLayer(session, { name: 'Top' });
    handleCreateLayer(session, { name: 'Middle', position: 1 });
    expect(session.document!.layers[1].name).toBe('Middle');
  });

  it('delete_layer removes a layer', () => {
    handleCreateLayer(session, { name: 'Extra' });
    handleDeleteLayer(session, { index: 1 });
    expect(session.document!.layers).toHaveLength(1);
  });

  it('delete_layer throws when only one layer', () => {
    expect(() => handleDeleteLayer(session, { index: 0 })).toThrow(PixelArtError);
  });

  it('set_active_layer changes active layer', () => {
    handleCreateLayer(session, { name: 'L2' });
    handleSetActiveLayer(session, { index: 1 });
    expect(session.document!.activeLayerIndex).toBe(1);
  });

  it('set_active_layer throws for out-of-range index', () => {
    expect(() => handleSetActiveLayer(session, { index: 5 })).toThrow();
  });

  it('set_layer_visibility changes visibility', () => {
    handleSetLayerVisibility(session, { index: 0, visible: false });
    expect(session.document!.layers[0].visible).toBe(false);
  });

  it('set_layer_opacity changes opacity', () => {
    handleSetLayerOpacity(session, { index: 0, opacity: 0.5 });
    expect(session.document!.layers[0].opacity).toBe(0.5);
  });

  it('set_layer_opacity throws for out-of-range value', () => {
    expect(() => handleSetLayerOpacity(session, { index: 0, opacity: 1.5 })).toThrow();
  });

  it('reorder_layer moves a layer', () => {
    handleCreateLayer(session, { name: 'L2' });
    handleCreateLayer(session, { name: 'L3' });
    handleReorderLayer(session, { from: 0, to: 2 });
    expect(session.document!.layers[2].name).toBe('Layer 1');
  });

  it('merge_layers merges a layer down', () => {
    handleCreateLayer(session, { name: 'L2' });
    handleMergeLayers(session, { index: 1 });
    expect(session.document!.layers).toHaveLength(1);
  });

  it('merge_layers throws for index 0', () => {
    expect(() => handleMergeLayers(session, { index: 0 })).toThrow(PixelArtError);
  });
});
