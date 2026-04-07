import { deserializeProject, getPixel, PixelArtError } from '@pixel-art/core';
import * as fs from 'node:fs';

export interface CanvasResourceData {
  width: number;
  height: number;
  layerIndex: number | 'flattened';
  pixels: string[][];
}

export function readCanvasResource(filePath: string, layerIndex?: number): CanvasResourceData {
  if (!fs.existsSync(filePath)) {
    throw new PixelArtError('FILE_NOT_FOUND', `File not found: ${filePath}`);
  }
  const json = fs.readFileSync(filePath, 'utf-8');
  const doc = deserializeProject(json);

  let pixelData: Uint8ClampedArray;
  let resolvedIndex: number | 'flattened';

  if (layerIndex !== undefined) {
    if (layerIndex < 0 || layerIndex >= doc.layers.length) {
      throw new PixelArtError('INVALID_LAYER_INDEX', `Layer index ${layerIndex} out of range [0, ${doc.layers.length - 1}]`);
    }
    pixelData = doc.layers[layerIndex].data;
    resolvedIndex = layerIndex;
  } else {
    pixelData = doc.flatten();
    resolvedIndex = 'flattened';
  }

  const pixels: string[][] = [];
  for (let y = 0; y < doc.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < doc.width; x++) {
      row.push(getPixel(pixelData, doc.width, x, y));
    }
    pixels.push(row);
  }

  return {
    width: doc.width,
    height: doc.height,
    layerIndex: resolvedIndex,
    pixels,
  };
}
