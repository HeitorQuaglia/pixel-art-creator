import { PNG } from 'pngjs';
import { Document } from './document.js';
import { flattenLayers } from './layer.js';
import type { SpritesheetData } from './types.js';
import { pixelIndex } from './canvas.js';

export interface SpriteInput {
  name: string;
  doc: Document;
}

export interface SpritesheetResult {
  atlas: Buffer;
  descriptor: SpritesheetData;
}

export function createSpritesheet(sprites: SpriteInput[]): SpritesheetResult {
  let totalWidth = 0;
  let maxHeight = 0;

  const flattenedSprites: { name: string; data: Uint8ClampedArray; w: number; h: number }[] = [];

  for (const sprite of sprites) {
    const data = flattenLayers(sprite.doc.layers, sprite.doc.width, sprite.doc.height);
    flattenedSprites.push({
      name: sprite.name,
      data,
      w: sprite.doc.width,
      h: sprite.doc.height,
    });
    totalWidth += sprite.doc.width;
    maxHeight = Math.max(maxHeight, sprite.doc.height);
  }

  const atlas = new PNG({ width: totalWidth, height: maxHeight });
  atlas.data.fill(0);

  const frames: SpritesheetData['frames'] = {};
  let xOffset = 0;

  for (const sprite of flattenedSprites) {
    for (let y = 0; y < sprite.h; y++) {
      for (let x = 0; x < sprite.w; x++) {
        const srcIdx = pixelIndex(sprite.w, x, y);
        const dstIdx = pixelIndex(totalWidth, xOffset + x, y);
        atlas.data[dstIdx] = sprite.data[srcIdx];
        atlas.data[dstIdx + 1] = sprite.data[srcIdx + 1];
        atlas.data[dstIdx + 2] = sprite.data[srcIdx + 2];
        atlas.data[dstIdx + 3] = sprite.data[srcIdx + 3];
      }
    }
    frames[sprite.name] = {
      frame: { x: xOffset, y: 0, w: sprite.w, h: sprite.h },
      sourceSize: { w: sprite.w, h: sprite.h },
    };
    xOffset += sprite.w;
  }

  const descriptor: SpritesheetData = {
    frames,
    meta: { size: { w: totalWidth, h: maxHeight }, format: 'RGBA8888' },
  };

  return { atlas: PNG.sync.write(atlas), descriptor };
}
