import { describe, it, expect, beforeEach } from 'vitest';
import { createCanvas, setPixel, getPixel } from '../canvas.js';
import { DrawCommand, CommandStack } from '../commands.js';

describe('DrawCommand', () => {
  it('execute applies new colors', () => {
    const data = createCanvas(4, 4);
    const deltas = [
      { x: 0, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' },
      { x: 1, y: 1, oldColor: '#00000000', newColor: '#0000ffff' },
    ];
    const cmd = new DrawCommand(data, 4, deltas);
    cmd.execute();
    expect(getPixel(data, 4, 0, 0)).toBe('#ff0000ff');
    expect(getPixel(data, 4, 1, 1)).toBe('#0000ffff');
  });

  it('undo restores old colors', () => {
    const data = createCanvas(4, 4);
    setPixel(data, 4, 0, 0, '#ff0000');
    setPixel(data, 4, 1, 1, '#0000ff');
    const deltas = [
      { x: 0, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' },
      { x: 1, y: 1, oldColor: '#00000000', newColor: '#0000ffff' },
    ];
    const cmd = new DrawCommand(data, 4, deltas);
    cmd.undo();
    expect(getPixel(data, 4, 0, 0)).toBe('#00000000');
    expect(getPixel(data, 4, 1, 1)).toBe('#00000000');
  });

  it('redo restores new colors after undo', () => {
    const data = createCanvas(4, 4);
    const deltas = [{ x: 2, y: 3, oldColor: '#00000000', newColor: '#abcdefff' }];
    const cmd = new DrawCommand(data, 4, deltas);
    cmd.execute();
    cmd.undo();
    expect(getPixel(data, 4, 2, 3)).toBe('#00000000');
    cmd.execute();
    expect(getPixel(data, 4, 2, 3)).toBe('#abcdefff');
  });
});

describe('CommandStack', () => {
  let stack: CommandStack;
  let data: Uint8ClampedArray;

  beforeEach(() => {
    stack = new CommandStack(100);
    data = createCanvas(4, 4);
  });

  it('canUndo is false initially', () => {
    expect(stack.canUndo).toBe(false);
  });

  it('canRedo is false initially', () => {
    expect(stack.canRedo).toBe(false);
  });

  it('canUndo is true after push', () => {
    const cmd = new DrawCommand(data, 4, [{ x: 0, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' }]);
    stack.push(cmd);
    expect(stack.canUndo).toBe(true);
  });

  it('supports undo and redo', () => {
    const deltas = [{ x: 0, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' }];
    const cmd = new DrawCommand(data, 4, deltas);
    cmd.execute();
    stack.push(cmd);

    stack.undo();
    expect(getPixel(data, 4, 0, 0)).toBe('#00000000');
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);

    stack.redo();
    expect(getPixel(data, 4, 0, 0)).toBe('#ff0000ff');
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });

  it('clears redo stack on new push', () => {
    const d1 = [{ x: 0, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' }];
    const cmd1 = new DrawCommand(data, 4, d1);
    cmd1.execute();
    stack.push(cmd1);

    stack.undo();
    expect(stack.canRedo).toBe(true);

    const d2 = [{ x: 1, y: 0, oldColor: '#00000000', newColor: '#00ff00ff' }];
    const cmd2 = new DrawCommand(data, 4, d2);
    cmd2.execute();
    stack.push(cmd2);

    expect(stack.canRedo).toBe(false);
  });

  it('respects max size limit', () => {
    const smallStack = new CommandStack(3);
    for (let i = 0; i < 5; i++) {
      const d = [{ x: i % 4, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' }];
      const cmd = new DrawCommand(data, 4, d);
      smallStack.push(cmd);
    }
    // After 5 pushes with max 3, only 3 remain undoable
    let count = 0;
    while (smallStack.canUndo) {
      smallStack.undo();
      count++;
    }
    expect(count).toBe(3);
  });

  it('undo does nothing when stack is empty', () => {
    expect(() => stack.undo()).not.toThrow();
  });

  it('redo does nothing when redo stack is empty', () => {
    expect(() => stack.redo()).not.toThrow();
  });
});
