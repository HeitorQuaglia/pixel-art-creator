import { flipH, flipV, rotate90, resize, select, move, PixelArtError } from '@pixel-art/core';
import type { Session } from '../session.js';

type ToolResult = { content: [{ type: 'text'; text: string }] };

export function handleTransform(
  session: Session,
  args: { operation: 'flip_h' | 'flip_v' | 'rotate' | 'resize'; degrees?: number; width?: number; height?: number },
): ToolResult {
  const doc = session.requireDocument();

  switch (args.operation) {
    case 'flip_h':
      for (const layer of doc.layers) {
        flipH(layer.data, doc.width, doc.height);
      }
      return { content: [{ type: 'text', text: 'Flipped horizontally' }] };

    case 'flip_v':
      for (const layer of doc.layers) {
        flipV(layer.data, doc.width, doc.height);
      }
      return { content: [{ type: 'text', text: 'Flipped vertically' }] };

    case 'rotate': {
      const degrees = args.degrees ?? 90;
      if (![90, 180, 270].includes(degrees)) {
        throw new PixelArtError('INVALID_ARGS', `Rotate only supports 90, 180, or 270 degrees, got ${degrees}`);
      }
      const times = degrees / 90;
      for (const layer of doc.layers) {
        let current = { data: layer.data, width: doc.width, height: doc.height };
        for (let i = 0; i < times; i++) {
          current = rotate90(current.data, current.width, current.height);
        }
        layer.data = current.data;
      }
      // Update document dimensions
      if (degrees === 90 || degrees === 270) {
        // Width and height swap — we need to cast to bypass readonly
        (doc as unknown as { width: number }).width = doc.height;
        (doc as unknown as { height: number }).height = doc.width;
      }
      return { content: [{ type: 'text', text: `Rotated ${degrees} degrees` }] };
    }

    case 'resize': {
      if (!args.width || !args.height) {
        throw new PixelArtError('INVALID_ARGS', 'Resize requires width and height');
      }
      const newW = args.width;
      const newH = args.height;
      for (const layer of doc.layers) {
        layer.data = resize(layer.data, doc.width, doc.height, newW, newH);
      }
      (doc as unknown as { width: number }).width = newW;
      (doc as unknown as { height: number }).height = newH;
      return { content: [{ type: 'text', text: `Resized to ${newW}x${newH}` }] };
    }

    default:
      throw new PixelArtError('INVALID_ARGS', `Unknown transform operation: ${args.operation}`);
  }
}

export function handleMirrorMode(
  session: Session,
  args: { horizontal?: boolean; vertical?: boolean },
): ToolResult {
  const doc = session.requireDocument();
  if (args.horizontal !== undefined) doc.mirrorMode.horizontal = args.horizontal;
  if (args.vertical !== undefined) doc.mirrorMode.vertical = args.vertical;
  return {
    content: [{
      type: 'text',
      text: `Mirror mode: horizontal=${doc.mirrorMode.horizontal}, vertical=${doc.mirrorMode.vertical}`,
    }],
  };
}

export function handleSelectAndMove(
  session: Session,
  args: { x: number; y: number; width: number; height: number; dx: number; dy: number; layer?: number },
): ToolResult {
  const doc = session.requireDocument();
  const layer = args.layer !== undefined ? doc.layers[args.layer] : doc.activeLayer;
  if (!layer) throw new PixelArtError('INVALID_LAYER_INDEX', `Layer index out of range`);

  const selection = select(layer.data, doc.width, doc.height, args.x, args.y, args.width, args.height);
  const deltas = move(layer.data, doc.width, doc.height, selection, args.dx, args.dy);
  return {
    content: [{
      type: 'text',
      text: `Selection moved by (${args.dx},${args.dy}), ${deltas.length} pixels affected`,
    }],
  };
}
