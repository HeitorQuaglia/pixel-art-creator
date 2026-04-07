import type { Palette } from './types.js';
import { PixelArtError } from './errors.js';

const PRESETS: Record<string, Palette> = {
  'PICO-8': {
    name: 'PICO-8',
    colors: [
      '#000000', '#1d2b53', '#7e2553', '#008751',
      '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
      '#ff004d', '#ffa300', '#ffec27', '#00e436',
      '#29adff', '#83769c', '#ff77a8', '#ffccaa',
    ],
  },
  'GameBoy': {
    name: 'GameBoy',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  },
  'NES': {
    name: 'NES',
    colors: [
      '#7c7c7c', '#0000fc', '#0000bc', '#4428bc', '#940084', '#a80020', '#a81000', '#881400',
      '#503000', '#007800', '#006800', '#005800', '#004058', '#000000', '#000000', '#000000',
      '#bcbcbc', '#0078f8', '#0058f8', '#6844fc', '#d800cc', '#e40058', '#f83800', '#e45c10',
      '#ac7c00', '#00b800', '#00a800', '#00a844', '#008888', '#000000', '#000000', '#000000',
      '#f8f8f8', '#3cbcfc', '#6888fc', '#9878f8', '#f878f8', '#f85898', '#f87858', '#fca044',
      '#f8b800', '#b8f818', '#58d854', '#58f898', '#00e8d8', '#787878', '#000000', '#000000',
      '#fcfcfc', '#a4e4fc', '#b8b8f8', '#d8b8f8', '#f8b8f8', '#f8a4c0', '#f0d0b0', '#fce0a8',
    ],
  },
  'Endesga 32': {
    name: 'Endesga 32',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f50', '#733e39', '#3e2731', '#a22633',
      '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e',
      '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
      '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796', '#c28569',
    ],
  },
  'Endesga 64': {
    name: 'Endesga 64',
    colors: [
      '#ff0040', '#131313', '#1b1b1b', '#272727', '#3d3d3d', '#5d5d5d', '#858585', '#b4b4b4',
      '#ffffff', '#c7cfdd', '#92a1b9', '#657392', '#424c6e', '#2a2f4e', '#1a1932', '#0e071b',
      '#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f', '#f9e6cf',
      '#edab50', '#e07438', '#c64524', '#8e251d', '#ff5000', '#ed7614', '#ffa214', '#ffc825',
      '#ffeb57', '#d3fc7e', '#99e65f', '#5ac54f', '#33984b', '#1e6f50', '#134c4c', '#0c2e44',
      '#00396d', '#0069aa', '#0098dc', '#00cdf9', '#0cf1ff', '#94fdff', '#fdd2ed', '#f389f5',
      '#db3ffd', '#7a09fa', '#3003d9', '#0c0293', '#03193f', '#3b1443', '#622461', '#93388f',
      '#ca52c9', '#c85086', '#f68187', '#f5555d', '#ea323c', '#c42430', '#891e2b', '#571c27',
    ],
  },
  'Free': {
    name: 'Free',
    colors: [],
  },
};

export function listPresets(): string[] {
  return Object.keys(PRESETS);
}

export function getPresetPalette(name: string): Palette {
  const palette = PRESETS[name];
  if (!palette) {
    throw new PixelArtError(
      'INVALID_ARGS',
      `Unknown preset palette: ${name}. Available: ${listPresets().join(', ')}`,
    );
  }
  return { ...palette, colors: [...palette.colors] };
}

export function isValidPalette(palette: { name: string; colors: string[] }): boolean {
  if (!palette.name || !Array.isArray(palette.colors)) return false;
  return palette.colors.every((c) => /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c));
}
