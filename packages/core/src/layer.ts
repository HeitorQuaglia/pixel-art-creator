import type { LayerData } from './types.js';
import { createCanvas } from './canvas.js';

export function createLayer(name: string, width: number, height: number): LayerData {
  return {
    name,
    visible: true,
    opacity: 1.0,
    data: createCanvas(width, height),
  };
}

export function flattenLayers(layers: LayerData[], width: number, height: number): Uint8ClampedArray {
  const result = createCanvas(width, height);
  const totalPixels = width * height;

  for (const layer of layers) {
    if (!layer.visible || layer.opacity === 0) continue;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const srcR = layer.data[idx];
      const srcG = layer.data[idx + 1];
      const srcB = layer.data[idx + 2];
      const srcA = (layer.data[idx + 3] / 255) * layer.opacity;

      if (srcA === 0) continue;

      const dstR = result[idx];
      const dstG = result[idx + 1];
      const dstB = result[idx + 2];
      const dstA = result[idx + 3] / 255;

      const outA = srcA + dstA * (1 - srcA);
      if (outA === 0) continue;

      result[idx] = Math.round((srcR * srcA + dstR * dstA * (1 - srcA)) / outA);
      result[idx + 1] = Math.round((srcG * srcA + dstG * dstA * (1 - srcA)) / outA);
      result[idx + 2] = Math.round((srcB * srcA + dstB * dstA * (1 - srcA)) / outA);
      result[idx + 3] = Math.round(outA * 255);
    }
  }

  return result;
}
