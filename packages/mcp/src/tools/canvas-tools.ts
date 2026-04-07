import { serializeProject, acquireLock, releaseLock, PixelArtError } from '@pixel-art/core';
import * as fs from 'node:fs';
import type { Session } from '../session.js';

type ToolResult = { content: [{ type: 'text'; text: string }] };

export function handleCreateCanvas(
  session: Session,
  args: { width: number; height: number; palette?: string },
): ToolResult {
  session.createCanvas(args.width, args.height, args.palette);
  return {
    content: [{ type: 'text', text: `Canvas created: ${args.width}x${args.height}${args.palette ? ` with palette ${args.palette}` : ''}` }],
  };
}

export function handleOpenProject(
  session: Session,
  args: { path: string },
): ToolResult {
  session.openProject(args.path);
  const doc = session.requireDocument();
  return {
    content: [{ type: 'text', text: `Project opened: ${args.path} (${doc.width}x${doc.height}, ${doc.layers.length} layers)` }],
  };
}

export function handleSaveProject(
  session: Session,
  args: { path?: string },
): ToolResult {
  const doc = session.requireDocument();
  const savePath = args.path ?? session.projectPath;
  if (!savePath) throw new PixelArtError('INVALID_ARGS', 'No path specified and no project currently open');
  acquireLock(savePath);
  try {
    const json = serializeProject(doc);
    fs.writeFileSync(savePath, json, 'utf-8');
    session.projectPath = savePath;
  } finally {
    releaseLock(savePath);
  }
  return {
    content: [{ type: 'text', text: `Project saved to: ${savePath}` }],
  };
}
