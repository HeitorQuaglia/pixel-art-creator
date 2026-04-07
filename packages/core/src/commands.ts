import type { PixelDelta } from './types.js';
import { setPixel } from './canvas.js';

export interface Command {
  execute(): void;
  undo(): void;
}

export class DrawCommand implements Command {
  constructor(private data: Uint8ClampedArray, private width: number, private deltas: PixelDelta[]) {}
  execute(): void {
    for (const delta of this.deltas) setPixel(this.data, this.width, delta.x, delta.y, delta.newColor);
  }
  undo(): void {
    for (const delta of this.deltas) setPixel(this.data, this.width, delta.x, delta.y, delta.oldColor);
  }
}

export class CommandStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  constructor(private maxSize: number = 100) {}
  push(command: Command): void {
    this.undoStack.push(command);
    this.redoStack = [];
    if (this.undoStack.length > this.maxSize) this.undoStack.shift();
  }
  undo(): void {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
  }
  redo(): void {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.execute();
    this.undoStack.push(cmd);
  }
  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
}
