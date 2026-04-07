import { listPresets, getPresetPalette } from '@pixel-art/core';

export interface PalettePresetsResource {
  presets: string[];
}

export interface PaletteResource {
  name: string;
  colors: string[];
}

export function readPalettePresetsResource(): PalettePresetsResource {
  return { presets: listPresets() };
}

export function readPaletteResource(name: string): PaletteResource {
  const palette = getPresetPalette(name);
  return { name: palette.name, colors: palette.colors };
}
