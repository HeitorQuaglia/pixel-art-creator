import { deserializeProject, PixelArtError } from '@pixel-art/core';
import * as fs from 'node:fs';

export interface ProjectMetadata {
  width: number;
  height: number;
  layerCount: number;
  layers: { name: string; visible: boolean; opacity: number }[];
  palette: { name: string; colorCount: number };
  version: number;
}

export function readProjectResource(filePath: string): ProjectMetadata {
  if (!fs.existsSync(filePath)) {
    throw new PixelArtError('FILE_NOT_FOUND', `File not found: ${filePath}`);
  }
  const json = fs.readFileSync(filePath, 'utf-8');
  const doc = deserializeProject(json);
  return {
    width: doc.width,
    height: doc.height,
    layerCount: doc.layers.length,
    layers: doc.layers.map((l) => ({ name: l.name, visible: l.visible, opacity: l.opacity })),
    palette: { name: doc.palette.name, colorCount: doc.palette.colors.length },
    version: 1,
  };
}
