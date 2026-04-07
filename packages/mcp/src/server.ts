import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PixelArtError } from '@pixel-art/core';
import { Session } from './session.js';
import { handleCreateCanvas, handleOpenProject, handleSaveProject } from './tools/canvas-tools.js';
import {
  handleCreateLayer, handleDeleteLayer, handleSetActiveLayer,
  handleSetLayerVisibility, handleSetLayerOpacity, handleReorderLayer, handleMergeLayers,
} from './tools/layer-tools.js';
import {
  handleDrawPixels, handleDrawLine, handleDrawRect, handleFill, handleErase,
} from './tools/drawing-tools.js';
import {
  handleTransform, handleMirrorMode, handleSelectAndMove,
} from './tools/transform-tools.js';
import { handleSetPalette } from './tools/palette-tools.js';
import { handleExportPng, handleExportSpritesheet } from './tools/export-tools.js';
import { handleBatchGenerate } from './tools/batch-tools.js';
import { readPalettePresetsResource } from './resources/palette-resource.js';

type ToolResult = { content: [{ type: 'text'; text: string }] };

function wrapHandler<T>(fn: () => ToolResult): ToolResult {
  try {
    return fn();
  } catch (err) {
    if (err instanceof PixelArtError) {
      return { content: [{ type: 'text', text: `Error [${err.code}]: ${err.message}` }] };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${message}` }] };
  }
}

export function createServer(): McpServer {
  const session = new Session();

  const server = new McpServer({
    name: 'pixel-art-mcp',
    version: '0.1.0',
  });

  // Canvas tools
  server.tool('create_canvas', 'Create a new blank canvas', {
    width: z.number().int().positive().describe('Canvas width in pixels'),
    height: z.number().int().positive().describe('Canvas height in pixels'),
    palette: z.string().optional().describe('Preset palette name'),
  }, (args) => wrapHandler(() => handleCreateCanvas(session, args)));

  server.tool('open_project', 'Open an existing .pxart project file', {
    path: z.string().describe('Path to .pxart file'),
  }, (args) => wrapHandler(() => handleOpenProject(session, args)));

  server.tool('save_project', 'Save the current project to a .pxart file', {
    path: z.string().optional().describe('Path to save to (defaults to current project path)'),
  }, (args) => wrapHandler(() => handleSaveProject(session, args)));

  // Layer tools
  server.tool('create_layer', 'Add a new layer to the canvas', {
    name: z.string().describe('Layer name'),
    position: z.number().int().optional().describe('Insert position (defaults to end)'),
  }, (args) => wrapHandler(() => handleCreateLayer(session, args)));

  server.tool('delete_layer', 'Delete a layer by index', {
    index: z.number().int().describe('Layer index to delete'),
  }, (args) => wrapHandler(() => handleDeleteLayer(session, args)));

  server.tool('set_active_layer', 'Set the active layer by index', {
    index: z.number().int().describe('Layer index to make active'),
  }, (args) => wrapHandler(() => handleSetActiveLayer(session, args)));

  server.tool('set_layer_visibility', 'Set a layer visible or hidden', {
    index: z.number().int().describe('Layer index'),
    visible: z.boolean().describe('Visibility state'),
  }, (args) => wrapHandler(() => handleSetLayerVisibility(session, args)));

  server.tool('set_layer_opacity', 'Set a layer opacity (0-1)', {
    index: z.number().int().describe('Layer index'),
    opacity: z.number().min(0).max(1).describe('Opacity value (0-1)'),
  }, (args) => wrapHandler(() => handleSetLayerOpacity(session, args)));

  server.tool('reorder_layer', 'Move a layer from one position to another', {
    from: z.number().int().describe('Source layer index'),
    to: z.number().int().describe('Target layer index'),
  }, (args) => wrapHandler(() => handleReorderLayer(session, args)));

  server.tool('merge_layers', 'Merge a layer down into the layer below it', {
    index: z.number().int().describe('Index of layer to merge down'),
  }, (args) => wrapHandler(() => handleMergeLayers(session, args)));

  // Drawing tools
  server.tool('draw_pixels', 'Draw individual pixels on the canvas', {
    pixels: z.array(z.object({
      x: z.number().int(),
      y: z.number().int(),
      color: z.string().describe('Hex color #RRGGBB or #RRGGBBAA'),
    })).describe('Array of pixels to draw'),
    layer: z.number().int().optional().describe('Target layer index (defaults to active layer)'),
  }, (args) => wrapHandler(() => handleDrawPixels(session, args)));

  server.tool('draw_line', 'Draw a line between two points', {
    x1: z.number().int().describe('Start x'),
    y1: z.number().int().describe('Start y'),
    x2: z.number().int().describe('End x'),
    y2: z.number().int().describe('End y'),
    color: z.string().describe('Hex color'),
    layer: z.number().int().optional().describe('Target layer index'),
  }, (args) => wrapHandler(() => handleDrawLine(session, args)));

  server.tool('draw_rect', 'Draw a rectangle', {
    x: z.number().int().describe('Top-left x'),
    y: z.number().int().describe('Top-left y'),
    width: z.number().int().describe('Rectangle width'),
    height: z.number().int().describe('Rectangle height'),
    color: z.string().describe('Hex color'),
    filled: z.boolean().optional().describe('Fill the rectangle (default: false, outline only)'),
    layer: z.number().int().optional().describe('Target layer index'),
  }, (args) => wrapHandler(() => handleDrawRect(session, args)));

  server.tool('fill', 'Flood fill from a point', {
    x: z.number().int().describe('Seed x'),
    y: z.number().int().describe('Seed y'),
    color: z.string().describe('Hex color'),
    layer: z.number().int().optional().describe('Target layer index'),
  }, (args) => wrapHandler(() => handleFill(session, args)));

  server.tool('erase', 'Erase a pixel (set to transparent)', {
    x: z.number().int().describe('Pixel x'),
    y: z.number().int().describe('Pixel y'),
    layer: z.number().int().optional().describe('Target layer index'),
  }, (args) => wrapHandler(() => handleErase(session, args)));

  // Transform tools
  server.tool('transform', 'Apply a transform to all layers', {
    operation: z.enum(['flip_h', 'flip_v', 'rotate', 'resize']).describe('Transform operation'),
    degrees: z.number().optional().describe('Rotation degrees (90, 180, or 270)'),
    width: z.number().int().optional().describe('New width for resize'),
    height: z.number().int().optional().describe('New height for resize'),
  }, (args) => wrapHandler(() => handleTransform(session, args)));

  server.tool('mirror_mode', 'Enable or disable mirror drawing mode', {
    horizontal: z.boolean().optional().describe('Enable horizontal mirror'),
    vertical: z.boolean().optional().describe('Enable vertical mirror'),
  }, (args) => wrapHandler(() => handleMirrorMode(session, args)));

  server.tool('select_and_move', 'Select a region and move it', {
    x: z.number().int().describe('Selection top-left x'),
    y: z.number().int().describe('Selection top-left y'),
    width: z.number().int().describe('Selection width'),
    height: z.number().int().describe('Selection height'),
    dx: z.number().int().describe('Move delta x'),
    dy: z.number().int().describe('Move delta y'),
    layer: z.number().int().optional().describe('Target layer index'),
  }, (args) => wrapHandler(() => handleSelectAndMove(session, args)));

  // Palette tools
  server.tool('set_palette', 'Set the active palette by name or custom colors', {
    name: z.string().optional().describe('Preset palette name (e.g., PICO-8, GameBoy)'),
    colors: z.array(z.string()).optional().describe('Custom array of hex colors'),
  }, (args) => wrapHandler(() => handleSetPalette(session, args)));

  // Export tools
  server.tool('export_png', 'Export the canvas to a PNG file', {
    path: z.string().describe('Output PNG file path'),
    layers: z.array(z.number().int()).optional().describe('Layer indices to include (defaults to all)'),
  }, (args) => wrapHandler(() => handleExportPng(session, args)));

  server.tool('export_spritesheet', 'Export multiple .pxart files as a spritesheet atlas', {
    sprites: z.array(z.object({
      name: z.string().describe('Sprite name in atlas'),
      path: z.string().describe('Path to .pxart file'),
    })).describe('List of sprites to include'),
    output: z.string().describe('Output PNG file path'),
    descriptor: z.string().optional().describe('Output JSON descriptor path (defaults to output.json)'),
  }, (args) => wrapHandler(() => handleExportSpritesheet(session, args)));

  // Batch tool
  server.tool('batch_generate', 'Generate multiple variations from a template', {
    template: z.array(z.object({
      tool: z.string().describe('Tool name'),
      args: z.record(z.string(), z.unknown()).describe('Tool arguments (use $varName for substitution)'),
    })).describe('Template steps to run for each variation'),
    variations: z.array(z.record(z.string(), z.unknown())).describe('Array of variable maps for each variation'),
    export: z.object({
      tool: z.string().describe('Export tool name'),
      args: z.record(z.string(), z.unknown()).describe('Export tool arguments'),
    }).describe('Export step to run after template steps'),
  }, (args) => wrapHandler(() => handleBatchGenerate(session, args as Parameters<typeof handleBatchGenerate>[1])));

  // Resources
  server.resource('palette-presets', 'palette://presets', (uri) => {
    const data = readPalettePresetsResource();
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  });

  return server;
}
