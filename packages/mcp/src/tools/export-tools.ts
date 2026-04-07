import { exportPng, createSpritesheet, deserializeProject, PixelArtError } from '@pixel-art/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Session } from '../session.js';

type ToolResult = { content: [{ type: 'text'; text: string }] };

export function handleExportPng(
  session: Session,
  args: { path: string; layers?: number[] },
): ToolResult {
  const doc = session.requireDocument();
  const buffer = exportPng(doc, args.layers);
  fs.writeFileSync(args.path, buffer);
  return {
    content: [{ type: 'text', text: `Exported PNG to ${args.path} (${buffer.length} bytes)` }],
  };
}

export function handleExportSpritesheet(
  _session: Session,
  args: { sprites: { name: string; path: string }[]; output: string; descriptor?: string },
): ToolResult {
  if (!args.sprites || args.sprites.length === 0) {
    throw new PixelArtError('INVALID_ARGS', 'sprites array must not be empty');
  }

  const spriteInputs = args.sprites.map((s) => {
    if (!fs.existsSync(s.path)) {
      throw new PixelArtError('FILE_NOT_FOUND', `Sprite file not found: ${s.path}`);
    }
    const json = fs.readFileSync(s.path, 'utf-8');
    const doc = deserializeProject(json);
    return { name: s.name, doc };
  });

  const { atlas, descriptor } = createSpritesheet(spriteInputs);
  fs.writeFileSync(args.output, atlas);

  const descriptorPath = args.descriptor ?? args.output.replace(/\.png$/, '.json');
  fs.writeFileSync(descriptorPath, JSON.stringify(descriptor, null, 2), 'utf-8');

  return {
    content: [{
      type: 'text',
      text: `Spritesheet exported to ${args.output} (${spriteInputs.length} sprites), descriptor at ${descriptorPath}`,
    }],
  };
}
