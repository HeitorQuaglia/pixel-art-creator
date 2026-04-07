import { PixelArtError } from '@pixel-art/core';
import { Session } from '../session.js';
import { handleCreateCanvas, handleOpenProject, handleSaveProject } from './canvas-tools.js';
import { handleCreateLayer, handleDeleteLayer, handleSetActiveLayer, handleSetLayerVisibility, handleSetLayerOpacity, handleReorderLayer, handleMergeLayers } from './layer-tools.js';
import { handleDrawPixels, handleDrawLine, handleDrawRect, handleFill, handleErase } from './drawing-tools.js';
import { handleTransform, handleMirrorMode, handleSelectAndMove } from './transform-tools.js';
import { handleSetPalette } from './palette-tools.js';
import { handleExportPng, handleExportSpritesheet } from './export-tools.js';

type ToolResult = { content: [{ type: 'text'; text: string }] };

type HandlerFn = (session: Session, args: Record<string, unknown>) => ToolResult;

const TOOL_MAP: Record<string, HandlerFn> = {
  create_canvas: handleCreateCanvas as HandlerFn,
  open_project: handleOpenProject as HandlerFn,
  save_project: handleSaveProject as HandlerFn,
  create_layer: handleCreateLayer as HandlerFn,
  delete_layer: handleDeleteLayer as HandlerFn,
  set_active_layer: handleSetActiveLayer as HandlerFn,
  set_layer_visibility: handleSetLayerVisibility as HandlerFn,
  set_layer_opacity: handleSetLayerOpacity as HandlerFn,
  reorder_layer: handleReorderLayer as HandlerFn,
  merge_layers: handleMergeLayers as HandlerFn,
  draw_pixels: handleDrawPixels as HandlerFn,
  draw_line: handleDrawLine as HandlerFn,
  draw_rect: handleDrawRect as HandlerFn,
  fill: handleFill as HandlerFn,
  erase: handleErase as HandlerFn,
  transform: handleTransform as HandlerFn,
  mirror_mode: handleMirrorMode as HandlerFn,
  select_and_move: handleSelectAndMove as HandlerFn,
  set_palette: handleSetPalette as HandlerFn,
  export_png: handleExportPng as HandlerFn,
  export_spritesheet: handleExportSpritesheet as HandlerFn,
};

interface TemplateStep {
  tool: string;
  args: Record<string, unknown>;
}

function substituteVars(value: unknown, vars: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    // Replace $varName patterns
    return value.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      return vars[name] !== undefined ? String(vars[name]) : `$${name}`;
    });
  }
  return value;
}

function applyVariables(args: Record<string, unknown>, vars: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    result[key] = substituteVars(value, vars);
  }
  return result;
}

export function handleBatchGenerate(
  _session: Session,
  args: {
    template: TemplateStep[];
    variations: Record<string, unknown>[];
    export: TemplateStep;
  },
): ToolResult {
  if (!args.template || !Array.isArray(args.template)) {
    throw new PixelArtError('INVALID_ARGS', 'template must be an array of steps');
  }
  if (!args.variations || !Array.isArray(args.variations)) {
    throw new PixelArtError('INVALID_ARGS', 'variations must be an array');
  }
  if (!args.export) {
    throw new PixelArtError('INVALID_ARGS', 'export step is required');
  }

  const results: string[] = [];

  for (let i = 0; i < args.variations.length; i++) {
    const vars: Record<string, unknown> = { ...args.variations[i], index: i };
    const varSession = new Session();

    // Run template steps
    for (const step of args.template) {
      const handler = TOOL_MAP[step.tool];
      if (!handler) {
        throw new PixelArtError('INVALID_ARGS', `Unknown tool in template: ${step.tool}`);
      }
      const resolvedArgs = applyVariables(step.args, vars);
      handler(varSession, resolvedArgs);
    }

    // Run export step
    const exportHandler = TOOL_MAP[args.export.tool];
    if (!exportHandler) {
      throw new PixelArtError('INVALID_ARGS', `Unknown tool in export: ${args.export.tool}`);
    }
    const resolvedExportArgs = applyVariables(args.export.args, vars);
    const result = exportHandler(varSession, resolvedExportArgs);
    results.push(result.content[0].text);
  }

  return {
    content: [{
      type: 'text',
      text: `Batch generated ${args.variations.length} variations:\n${results.join('\n')}`,
    }],
  };
}
