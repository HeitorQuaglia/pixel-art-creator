import { describe, it, expect, afterEach } from 'vitest';
import { readProjectResource } from '../resources/project-resource.js';
import { readCanvasResource } from '../resources/canvas-resource.js';
import { readPalettePresetsResource, readPaletteResource } from '../resources/palette-resource.js';
import { Session } from '../session.js';
import { handleCreateCanvas } from '../tools/canvas-tools.js';
import { handleDrawPixels } from '../tools/drawing-tools.js';
import { handleCreateLayer } from '../tools/layer-tools.js';
import { serializeProject, PixelArtError } from '@pixel-art/core';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('project resource', () => {
  const tmpFiles: string[] = [];

  afterEach(() => {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
    tmpFiles.length = 0;
  });

  function createTmpProject(width = 8, height = 8, layerCount = 1): string {
    const tmpPath = path.join(os.tmpdir(), `resource-test-${Date.now()}-${Math.random()}.pxart`);
    tmpFiles.push(tmpPath);
    const session = new Session();
    handleCreateCanvas(session, { width, height });
    for (let i = 1; i < layerCount; i++) {
      handleCreateLayer(session, { name: `Layer ${i + 1}` });
    }
    fs.writeFileSync(tmpPath, serializeProject(session.document!));
    return tmpPath;
  }

  it('returns metadata without pixel data', () => {
    const tmpPath = createTmpProject(16, 12);
    const meta = readProjectResource(tmpPath);
    expect(meta.width).toBe(16);
    expect(meta.height).toBe(12);
    expect(meta.layerCount).toBe(1);
    expect(meta.layers[0].name).toBe('Layer 1');
    // Should not contain raw pixel data
    expect(meta).not.toHaveProperty('pixels');
    expect(meta).not.toHaveProperty('data');
  });

  it('returns correct layer metadata', () => {
    const tmpPath = createTmpProject(8, 8, 2);
    const meta = readProjectResource(tmpPath);
    expect(meta.layerCount).toBe(2);
    expect(meta.layers).toHaveLength(2);
    expect(meta.layers[0]).toMatchObject({ name: 'Layer 1', visible: true, opacity: 1 });
  });

  it('returns palette info', () => {
    const tmpPath = createTmpProject(4, 4);
    const meta = readProjectResource(tmpPath);
    expect(meta.palette).toMatchObject({ name: 'Free', colorCount: 0 });
  });

  it('throws FILE_NOT_FOUND for missing file', () => {
    const err = (() => { try { return readProjectResource('/no/such/file.pxart'); } catch (e) { return e; } })();
    expect(err).toBeInstanceOf(PixelArtError);
    expect((err as PixelArtError).code).toBe('FILE_NOT_FOUND');
  });
});

describe('canvas resource', () => {
  const tmpFiles: string[] = [];

  afterEach(() => {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
    tmpFiles.length = 0;
  });

  function createTmpProjectWithPixels(width: number, height: number): string {
    const tmpPath = path.join(os.tmpdir(), `canvas-resource-${Date.now()}-${Math.random()}.pxart`);
    tmpFiles.push(tmpPath);
    const session = new Session();
    handleCreateCanvas(session, { width, height });
    handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
    fs.writeFileSync(tmpPath, serializeProject(session.document!));
    return tmpPath;
  }

  it('returns pixel data as 2D hex arrays (flattened by default)', () => {
    const tmpPath = createTmpProjectWithPixels(4, 4);
    const data = readCanvasResource(tmpPath);
    expect(data.width).toBe(4);
    expect(data.height).toBe(4);
    expect(data.layerIndex).toBe('flattened');
    expect(data.pixels).toHaveLength(4);
    expect(data.pixels[0]).toHaveLength(4);
    // (0,0) should be red
    expect(data.pixels[0][0]).toBe('#ff0000ff');
    // (1,0) should be transparent
    expect(data.pixels[0][1]).toBe('#00000000');
  });

  it('returns pixel data for a specific layer', () => {
    const tmpPath = createTmpProjectWithPixels(4, 4);
    const data = readCanvasResource(tmpPath, 0);
    expect(data.layerIndex).toBe(0);
    expect(data.pixels[0][0]).toBe('#ff0000ff');
  });

  it('throws INVALID_LAYER_INDEX for out-of-range layer', () => {
    const tmpPath = createTmpProjectWithPixels(4, 4);
    const err = (() => { try { return readCanvasResource(tmpPath, 99); } catch (e) { return e; } })();
    expect(err).toBeInstanceOf(PixelArtError);
    expect((err as PixelArtError).code).toBe('INVALID_LAYER_INDEX');
  });

  it('throws FILE_NOT_FOUND for missing file', () => {
    const err = (() => { try { return readCanvasResource('/no/such/file.pxart'); } catch (e) { return e; } })();
    expect(err).toBeInstanceOf(PixelArtError);
    expect((err as PixelArtError).code).toBe('FILE_NOT_FOUND');
  });
});

describe('palette resources', () => {
  it('readPalettePresetsResource returns list of preset names', () => {
    const data = readPalettePresetsResource();
    expect(data.presets).toBeInstanceOf(Array);
    expect(data.presets).toContain('PICO-8');
    expect(data.presets).toContain('GameBoy');
    expect(data.presets).toContain('NES');
    expect(data.presets).toContain('Free');
  });

  it('readPaletteResource returns colors for a preset', () => {
    const data = readPaletteResource('PICO-8');
    expect(data.name).toBe('PICO-8');
    expect(data.colors).toHaveLength(16);
    expect(data.colors[0]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('readPaletteResource returns GameBoy palette', () => {
    const data = readPaletteResource('GameBoy');
    expect(data.name).toBe('GameBoy');
    expect(data.colors).toHaveLength(4);
  });

  it('readPaletteResource throws for unknown preset', () => {
    expect(() => readPaletteResource('BogusName')).toThrow(PixelArtError);
  });
});
