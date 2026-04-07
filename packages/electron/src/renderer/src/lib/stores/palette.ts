import { writable } from 'svelte/store';
import { getPresetPalette, listPresets, type Palette } from '@pixel-art/core';

export const activePalette = writable<Palette>(getPresetPalette('PICO-8'));
export const presetNames = listPresets();
