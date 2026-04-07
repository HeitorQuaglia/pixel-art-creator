import { deflate, inflate } from 'pako';
import type { ProjectData } from './types.js';
import { Document } from './document.js';
import { PixelArtError } from './errors.js';

export function serializeProject(doc: Document): string {
  const now = new Date().toISOString();
  const project: ProjectData = {
    version: 1,
    width: doc.width,
    height: doc.height,
    layers: doc.layers.map((layer) => ({
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      data: compressLayerData(layer.data),
    })),
    palette: { ...doc.palette },
    metadata: { createdAt: now, modifiedAt: now },
  };
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(json: string): Document {
  let data: ProjectData;
  try {
    data = JSON.parse(json);
  } catch {
    throw new PixelArtError('INVALID_ARGS', 'Invalid .pxart file: not valid JSON');
  }
  if (data.version !== 1) {
    throw new PixelArtError('INVALID_ARGS', `Unsupported .pxart version: ${data.version}`);
  }
  const doc = new Document(data.width, data.height);
  doc.layers.length = 0;
  for (const layerData of data.layers) {
    const pixels = decompressLayerData(layerData.data, data.width, data.height);
    doc.layers.push({
      name: layerData.name,
      visible: layerData.visible,
      opacity: layerData.opacity,
      data: pixels,
    });
  }
  doc.palette = data.palette;
  return doc;
}

function compressLayerData(data: Uint8ClampedArray): string {
  const compressed = deflate(data);
  let binary = '';
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  return btoa(binary);
}

function decompressLayerData(base64: string, width: number, height: number): Uint8ClampedArray {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const raw = inflate(bytes);
  const expected = width * height * 4;
  if (raw.length !== expected) {
    throw new PixelArtError(
      'INVALID_ARGS',
      `Layer data size mismatch: got ${raw.length}, expected ${expected}`,
    );
  }
  return new Uint8ClampedArray(raw);
}
