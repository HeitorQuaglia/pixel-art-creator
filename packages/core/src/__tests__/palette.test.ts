import { describe, it, expect } from 'vitest';
import { listPresets, getPresetPalette, isValidPalette } from '../palette.js';
import { PixelArtError } from '../errors.js';

describe('listPresets', () => {
  it('returns all 6 preset names', () => {
    const presets = listPresets();
    expect(presets).toHaveLength(6);
    expect(presets).toContain('PICO-8');
    expect(presets).toContain('GameBoy');
    expect(presets).toContain('NES');
    expect(presets).toContain('Endesga 32');
    expect(presets).toContain('Endesga 64');
    expect(presets).toContain('Free');
  });
});

describe('getPresetPalette', () => {
  it('returns PICO-8 palette with 16 colors', () => {
    const p = getPresetPalette('PICO-8');
    expect(p.name).toBe('PICO-8');
    expect(p.colors).toHaveLength(16);
  });

  it('returns GameBoy palette with 4 colors', () => {
    const p = getPresetPalette('GameBoy');
    expect(p.name).toBe('GameBoy');
    expect(p.colors).toHaveLength(4);
  });

  it('returns NES palette with more than 4 colors', () => {
    const p = getPresetPalette('NES');
    expect(p.name).toBe('NES');
    expect(p.colors.length).toBeGreaterThan(4);
  });

  it('returns Endesga 32 palette with 32 colors', () => {
    const p = getPresetPalette('Endesga 32');
    expect(p.colors).toHaveLength(32);
  });

  it('returns Endesga 64 palette with 64 colors', () => {
    const p = getPresetPalette('Endesga 64');
    expect(p.colors).toHaveLength(64);
  });

  it('returns Free palette with 0 colors', () => {
    const p = getPresetPalette('Free');
    expect(p.name).toBe('Free');
    expect(p.colors).toHaveLength(0);
  });

  it('throws PixelArtError for unknown preset', () => {
    expect(() => getPresetPalette('Unknown')).toThrow(PixelArtError);
  });

  it('returns a copy so mutations do not affect the original', () => {
    const p1 = getPresetPalette('PICO-8');
    p1.colors.push('#000000');
    const p2 = getPresetPalette('PICO-8');
    expect(p2.colors).toHaveLength(16);
  });
});

describe('isValidPalette', () => {
  it('accepts a palette with valid hex colors', () => {
    expect(isValidPalette({ name: 'Test', colors: ['#ff0000', '#00ff00', '#0000ff'] })).toBe(true);
  });

  it('accepts a palette with 8-digit hex colors', () => {
    expect(isValidPalette({ name: 'Test', colors: ['#ff0000ff', '#00ff00aa'] })).toBe(true);
  });

  it('accepts a palette with zero colors', () => {
    expect(isValidPalette({ name: 'Empty', colors: [] })).toBe(true);
  });

  it('rejects a palette with invalid hex color', () => {
    expect(isValidPalette({ name: 'Test', colors: ['red'] })).toBe(false);
    expect(isValidPalette({ name: 'Test', colors: ['#gg0000'] })).toBe(false);
    expect(isValidPalette({ name: 'Test', colors: ['#fff'] })).toBe(false);
  });

  it('rejects a palette with missing name', () => {
    expect(isValidPalette({ name: '', colors: [] })).toBe(false);
  });

  it('rejects when colors is not an array', () => {
    expect(isValidPalette({ name: 'Test', colors: 'not-array' as never })).toBe(false);
  });
});
