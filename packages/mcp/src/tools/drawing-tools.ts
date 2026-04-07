import { pencil, eraser, fill, line, rect } from '@pixel-art/core';
import type { Session } from '../session.js';

type ToolResult = { content: [{ type: 'text'; text: string }] };

function getLayerData(session: Session, layerIndex?: number) {
  const doc = session.requireDocument();
  if (layerIndex !== undefined) {
    if (layerIndex < 0 || layerIndex >= doc.layers.length) {
      throw new Error(`Layer index ${layerIndex} out of range [0, ${doc.layers.length - 1}]`);
    }
    return { doc, layer: doc.layers[layerIndex] };
  }
  return { doc, layer: doc.activeLayer };
}

export function handleDrawPixels(
  session: Session,
  args: { pixels: { x: number; y: number; color: string }[]; layer?: number },
): ToolResult {
  const { doc, layer } = getLayerData(session, args.layer);
  let count = 0;
  for (const px of args.pixels) {
    const deltas = pencil(layer.data, doc.width, doc.height, px.x, px.y, px.color);
    if (deltas.length > 0) count++;
  }
  return {
    content: [{ type: 'text', text: `Drew ${count} pixels` }],
  };
}

export function handleDrawLine(
  session: Session,
  args: { x1: number; y1: number; x2: number; y2: number; color: string; layer?: number },
): ToolResult {
  const { doc, layer } = getLayerData(session, args.layer);
  const deltas = line(layer.data, doc.width, doc.height, args.x1, args.y1, args.x2, args.y2, args.color);
  return {
    content: [{ type: 'text', text: `Drew line from (${args.x1},${args.y1}) to (${args.x2},${args.y2}), ${deltas.length} pixels affected` }],
  };
}

export function handleDrawRect(
  session: Session,
  args: { x: number; y: number; width: number; height: number; color: string; filled?: boolean; layer?: number },
): ToolResult {
  const { doc, layer } = getLayerData(session, args.layer);
  const deltas = rect(layer.data, doc.width, doc.height, args.x, args.y, args.width, args.height, args.color, args.filled);
  return {
    content: [{ type: 'text', text: `Drew rect at (${args.x},${args.y}) size ${args.width}x${args.height}, ${deltas.length} pixels affected` }],
  };
}

export function handleFill(
  session: Session,
  args: { x: number; y: number; color: string; layer?: number },
): ToolResult {
  const { doc, layer } = getLayerData(session, args.layer);
  const deltas = fill(layer.data, doc.width, doc.height, args.x, args.y, args.color);
  return {
    content: [{ type: 'text', text: `Flood fill at (${args.x},${args.y}) with ${args.color}, ${deltas.length} pixels filled` }],
  };
}

export function handleErase(
  session: Session,
  args: { x: number; y: number; layer?: number },
): ToolResult {
  const { doc, layer } = getLayerData(session, args.layer);
  const deltas = eraser(layer.data, doc.width, doc.height, args.x, args.y);
  return {
    content: [{ type: 'text', text: `Erased pixel at (${args.x},${args.y}), ${deltas.length} pixels affected` }],
  };
}
