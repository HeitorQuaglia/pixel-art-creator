import { PNG } from 'pngjs';
import { Document } from './document.js';
import { flattenLayers } from './layer.js';
import type { LayerData } from './types.js';

export function exportPng(doc: Document, layerIndices?: number[]): Buffer {
  let layers: LayerData[];
  if (layerIndices) {
    layers = layerIndices.map((i) => doc.layers[i]);
  } else {
    layers = doc.layers;
  }
  const flattened = flattenLayers(layers, doc.width, doc.height);
  const png = new PNG({ width: doc.width, height: doc.height });
  for (let i = 0; i < flattened.length; i++) {
    png.data[i] = flattened[i];
  }
  return PNG.sync.write(png);
}

export function parsePng(buffer: Buffer): { width: number; height: number; data: Uint8ClampedArray } {
  const png = PNG.sync.read(buffer);
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
}
