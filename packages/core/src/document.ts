import type { LayerData, MirrorMode, PixelDelta, Color, Palette } from './types.js';
import { createLayer, flattenLayers } from './layer.js';
import { CommandStack, DrawCommand } from './commands.js';
import { pencil } from './tools/pencil.js';
import { eraser } from './tools/eraser.js';
import { fill } from './tools/fill.js';
import { line } from './tools/line.js';
import { rect } from './tools/rect.js';
import { PixelArtError } from './errors.js';

export type DrawTool = 'pencil' | 'eraser' | 'fill' | 'line' | 'rect';

export class Document {
  layers: LayerData[];
  activeLayerIndex: number = 0;
  mirrorMode: MirrorMode = { horizontal: false, vertical: false };
  palette: Palette = { name: 'Free', colors: [] };
  private commands: CommandStack;

  constructor(public readonly width: number, public readonly height: number, maxUndo: number = 100) {
    this.layers = [createLayer('Layer 1', width, height)];
    this.commands = new CommandStack(maxUndo);
  }

  get activeLayer(): LayerData { return this.layers[this.activeLayerIndex]; }

  addLayer(name: string, position?: number): void {
    const layer = createLayer(name, this.width, this.height);
    if (position !== undefined) this.layers.splice(position, 0, layer);
    else this.layers.push(layer);
  }

  removeLayer(index: number): void {
    if (this.layers.length <= 1) throw new PixelArtError('INVALID_ARGS', 'Cannot remove the last layer');
    this.validateLayerIndex(index);
    this.layers.splice(index, 1);
    if (this.activeLayerIndex >= this.layers.length) this.activeLayerIndex = this.layers.length - 1;
  }

  reorderLayer(from: number, to: number): void {
    this.validateLayerIndex(from);
    this.validateLayerIndex(to);
    const [layer] = this.layers.splice(from, 1);
    this.layers.splice(to, 0, layer);
  }

  mergeLayerDown(index: number): void {
    if (index <= 0 || index >= this.layers.length)
      throw new PixelArtError('INVALID_LAYER_INDEX', `Cannot merge layer at index ${index} down`);
    const merged = flattenLayers([this.layers[index - 1], this.layers[index]], this.width, this.height);
    this.layers[index - 1].data = merged;
    this.layers.splice(index, 1);
    if (this.activeLayerIndex >= this.layers.length) this.activeLayerIndex = this.layers.length - 1;
  }

  draw(tool: DrawTool, x: number, y: number, color?: Color, ...extra: unknown[]): void {
    const data = this.activeLayer.data;
    let deltas = this.executeTool(tool, data, x, y, color, ...extra);
    if (this.mirrorMode.horizontal || this.mirrorMode.vertical) {
      deltas = [...deltas, ...this.applyMirror(tool, data, x, y, color, ...extra)];
    }
    if (deltas.length > 0) this.commands.push(new DrawCommand(data, this.width, deltas));
  }

  private executeTool(tool: DrawTool, data: Uint8ClampedArray, x: number, y: number, color?: Color, ...extra: unknown[]): PixelDelta[] {
    switch (tool) {
      case 'pencil': return pencil(data, this.width, this.height, x, y, color!);
      case 'eraser': return eraser(data, this.width, this.height, x, y);
      case 'fill': return fill(data, this.width, this.height, x, y, color!);
      case 'line': return line(data, this.width, this.height, x, y, extra[0] as number, extra[1] as number, color!);
      case 'rect': return rect(data, this.width, this.height, x, y, extra[0] as number, extra[1] as number, color!, extra[2] as boolean | undefined);
      default: throw new PixelArtError('INVALID_ARGS', `Unknown tool: ${tool}`);
    }
  }

  private applyMirror(tool: DrawTool, data: Uint8ClampedArray, x: number, y: number, color?: Color, ...extra: unknown[]): PixelDelta[] {
    const deltas: PixelDelta[] = [];
    if (this.mirrorMode.horizontal) {
      deltas.push(...this.executeTool(tool, data, this.width - 1 - x, y, color, ...extra));
    }
    if (this.mirrorMode.vertical) {
      deltas.push(...this.executeTool(tool, data, x, this.height - 1 - y, color, ...extra));
    }
    if (this.mirrorMode.horizontal && this.mirrorMode.vertical) {
      deltas.push(...this.executeTool(tool, data, this.width - 1 - x, this.height - 1 - y, color, ...extra));
    }
    return deltas;
  }

  undo(): void { this.commands.undo(); }
  redo(): void { this.commands.redo(); }
  get canUndo(): boolean { return this.commands.canUndo; }
  get canRedo(): boolean { return this.commands.canRedo; }
  flatten(): Uint8ClampedArray { return flattenLayers(this.layers, this.width, this.height); }

  private validateLayerIndex(index: number): void {
    if (index < 0 || index >= this.layers.length)
      throw new PixelArtError('INVALID_LAYER_INDEX', `Layer index ${index} out of range [0, ${this.layers.length - 1}]`);
  }
}
