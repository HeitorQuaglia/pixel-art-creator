import { Document, getPresetPalette, deserializeProject, PixelArtError } from '@pixel-art/core';
import * as fs from 'node:fs';

export class Session {
  document: Document | null = null;
  projectPath: string | null = null;

  createCanvas(width: number, height: number, paletteName?: string): void {
    this.document = new Document(width, height);
    if (paletteName) this.document.palette = getPresetPalette(paletteName);
    this.projectPath = null;
  }

  openProject(path: string): void {
    if (!fs.existsSync(path)) throw new PixelArtError('FILE_NOT_FOUND', `File not found: ${path}`);
    const json = fs.readFileSync(path, 'utf-8');
    this.document = deserializeProject(json);
    this.projectPath = path;
  }

  requireDocument(): Document {
    if (!this.document) throw new PixelArtError('INVALID_ARGS', 'No canvas created. Use create_canvas or open_project first.');
    return this.document;
  }
}
