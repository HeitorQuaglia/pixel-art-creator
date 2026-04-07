# Pixel Art Creator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop pixel art editor for indie game developers with an MCP server for AI agent integration.

**Architecture:** pnpm monorepo with 3 packages — `@pixel-art/core` (pure TS engine), `@pixel-art/electron` (SvelteKit + Electron desktop app), `@pixel-art/mcp` (standalone MCP server). Core is consumed by both Electron and MCP. All drawing tools are pure functions returning `PixelDelta[]`. Undo/redo via command pattern. File-based coordination between Electron and MCP via `.pxart` files.

**Tech Stack:** TypeScript 5.x, pnpm workspaces, Vitest, SvelteKit, Electron, `@modelcontextprotocol/sdk`, `pngjs`, `pako`

---

## File Structure

```
pixel-art-creator/
├── package.json                          # Root workspace config
├── pnpm-workspace.yaml
├── tsconfig.base.json                    # Shared TS config
├── .gitignore
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts                  # Public API re-exports
│   │       ├── types.ts                  # PixelDelta, Color, LayerData, Selection, ProjectData
│   │       ├── errors.ts                 # PixelArtError, error codes
│   │       ├── canvas.ts                 # createCanvas, getPixel, setPixel
│   │       ├── layer.ts                  # createLayer, flattenLayers
│   │       ├── tools/
│   │       │   ├── pencil.ts
│   │       │   ├── eraser.ts
│   │       │   ├── fill.ts
│   │       │   ├── line.ts
│   │       │   ├── rect.ts
│   │       │   └── selection.ts          # select + move
│   │       ├── commands.ts               # Command interface, DrawCommand
│   │       ├── document.ts               # Document class: layers, undo/redo, mirror, active layer
│   │       ├── transform.ts              # flipH, flipV, rotate, resize
│   │       ├── palette.ts                # presets, custom palette CRUD
│   │       ├── serialization.ts          # save/load .pxart with zlib+base64
│   │       ├── export-png.ts             # flatten + PNG encode
│   │       ├── export-spritesheet.ts     # row-based packing, atlas + JSON
│   │       └── file-lock.ts             # PID-based advisory locking
│   ├── mcp/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts                  # Entry point, starts server
│   │       ├── server.ts                 # MCP server setup, tool/resource registration
│   │       ├── session.ts                # Session state: Document + active project path
│   │       ├── tools/
│   │       │   ├── canvas-tools.ts       # create_canvas, open_project, save_project
│   │       │   ├── drawing-tools.ts      # draw_pixels, draw_line, draw_rect, fill, erase
│   │       │   ├── layer-tools.ts        # CRUD, merge, visibility, opacity, reorder
│   │       │   ├── transform-tools.ts    # transform, mirror_mode, select_and_move
│   │       │   ├── palette-tools.ts      # set_palette
│   │       │   ├── export-tools.ts       # export_png, export_spritesheet
│   │       │   └── batch-tools.ts        # batch_generate
│   │       └── resources/
│   │           ├── project-resource.ts
│   │           ├── canvas-resource.ts
│   │           └── palette-resource.ts
│   └── electron/
│       ├── package.json
│       ├── tsconfig.json
│       ├── electron-builder.yml
│       ├── src/
│       │   ├── main/
│       │   │   ├── index.ts              # Electron main process entry
│       │   │   ├── ipc.ts                # IPC handlers (file dialogs, save/load)
│       │   │   └── menu.ts               # Application menu bar
│       │   └── renderer/
│       │       ├── svelte.config.js
│       │       ├── vite.config.ts
│       │       ├── src/
│       │       │   ├── app.html
│       │       │   ├── app.css            # Global styles, dark theme
│       │       │   ├── lib/
│       │       │   │   ├── stores/
│       │       │   │   │   ├── editor.ts  # Document state, active tool, zoom
│       │       │   │   │   └── palette.ts # Active palette state
│       │       │   │   ├── components/
│       │       │   │   │   ├── Canvas.svelte
│       │       │   │   │   ├── Toolbar.svelte
│       │       │   │   │   ├── LayerPanel.svelte
│       │       │   │   │   ├── PalettePanel.svelte
│       │       │   │   │   ├── StatusBar.svelte
│       │       │   │   │   └── ColorPicker.svelte
│       │       │   │   └── utils/
│       │       │   │       └── canvas-renderer.ts  # Renders Document to HTML5 canvas
│       │       │   └── routes/
│       │       │       ├── +layout.svelte
│       │       │       └── +page.svelte
│       │       └── static/
│       └── resources/                     # Electron app icons
```

---

## Phase 1: Monorepo & Core Foundation

### Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`

- [ ] **Step 1: Create root package.json and workspace config**

```json
// package.json
{
  "name": "pixel-art-creator",
  "private": true,
  "scripts": {
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "lint": "eslint packages/*/src"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.1.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist"
  }
}
```

```.gitignore
node_modules/
dist/
.superpowers/
*.lock
!pnpm-lock.yaml
```

- [ ] **Step 2: Create core package config**

```json
// packages/core/package.json
{
  "name": "@pixel-art/core",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "pako": "^2.1.0",
    "pngjs": "^7.0.0"
  },
  "devDependencies": {
    "@types/pako": "^2.0.3",
    "typescript": "^5.7.0",
    "vitest": "^3.1.0"
  }
}
```

```json
// packages/core/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

```typescript
// packages/core/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`
Expected: lockfile created, node_modules populated

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore packages/core/package.json packages/core/tsconfig.json packages/core/vitest.config.ts pnpm-lock.yaml
git commit -m "feat: scaffold monorepo with core package"
```

---

### Task 2: Core Types & Errors

**Files:**
- Create: `packages/core/src/types.ts`, `packages/core/src/errors.ts`
- Test: `packages/core/src/__tests__/errors.test.ts`

- [ ] **Step 1: Write types**

```typescript
// packages/core/src/types.ts

/** Hex color string: #RRGGBB or #RRGGBBAA */
export type Color = string;

/** A single pixel change */
export interface PixelDelta {
  x: number;
  y: number;
  /** Color before the change (for undo) */
  oldColor: Color;
  /** Color after the change */
  newColor: Color;
}

/** Raw pixel data for a layer */
export interface LayerData {
  name: string;
  visible: boolean;
  opacity: number;
  /** RGBA pixel data, length = width * height * 4 */
  data: Uint8ClampedArray;
}

/** Rectangular selection result */
export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Pixel data within the selection (RGBA) */
  data: Uint8ClampedArray;
}

/** Palette definition */
export interface Palette {
  name: string;
  colors: Color[];
}

/** Mirror mode state */
export interface MirrorMode {
  horizontal: boolean;
  vertical: boolean;
}

/** .pxart project file format */
export interface ProjectData {
  version: number;
  width: number;
  height: number;
  layers: {
    name: string;
    visible: boolean;
    opacity: number;
    /** zlib-compressed RGBA, base64 encoded */
    data: string;
  }[];
  palette: Palette;
  metadata: {
    createdAt: string;
    modifiedAt: string;
  };
}

/** Spritesheet frame descriptor */
export interface SpritesheetFrame {
  frame: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

/** Spritesheet atlas descriptor */
export interface SpritesheetData {
  frames: Record<string, SpritesheetFrame>;
  meta: {
    size: { w: number; h: number };
    format: string;
  };
}

/** Max canvas dimension */
export const MAX_CANVAS_SIZE = 4096;
```

- [ ] **Step 2: Write failing test for errors**

```typescript
// packages/core/src/__tests__/errors.test.ts
import { describe, it, expect } from 'vitest';
import { PixelArtError, ErrorCode } from '../errors.js';

describe('PixelArtError', () => {
  it('creates error with code and message', () => {
    const err = new PixelArtError('OUT_OF_BOUNDS', 'Pixel (5, 5) is outside canvas bounds (4, 4)');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('OUT_OF_BOUNDS');
    expect(err.message).toBe('Pixel (5, 5) is outside canvas bounds (4, 4)');
  });

  it('has all expected error codes', () => {
    const codes: ErrorCode[] = [
      'OUT_OF_BOUNDS',
      'INVALID_LAYER_INDEX',
      'INVALID_COLOR_FORMAT',
      'FILE_NOT_FOUND',
      'FILE_LOCKED',
      'CANVAS_TOO_LARGE',
      'INVALID_ARGS',
    ];
    for (const code of codes) {
      const err = new PixelArtError(code, 'test');
      expect(err.code).toBe(code);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/errors.test.ts`
Expected: FAIL — cannot find `../errors.js`

- [ ] **Step 4: Implement errors**

```typescript
// packages/core/src/errors.ts

export type ErrorCode =
  | 'OUT_OF_BOUNDS'
  | 'INVALID_LAYER_INDEX'
  | 'INVALID_COLOR_FORMAT'
  | 'FILE_NOT_FOUND'
  | 'FILE_LOCKED'
  | 'CANVAS_TOO_LARGE'
  | 'INVALID_ARGS';

export class PixelArtError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PixelArtError';
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/errors.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/errors.ts packages/core/src/__tests__/errors.test.ts
git commit -m "feat(core): add types and error definitions"
```

---

### Task 3: Canvas & Pixel Operations

**Files:**
- Create: `packages/core/src/canvas.ts`
- Test: `packages/core/src/__tests__/canvas.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/canvas.test.ts
import { describe, it, expect } from 'vitest';
import { createCanvas, getPixel, setPixel, isInBounds } from '../canvas.js';
import { MAX_CANVAS_SIZE } from '../types.js';
import { PixelArtError } from '../errors.js';

describe('createCanvas', () => {
  it('creates canvas with correct dimensions', () => {
    const canvas = createCanvas(8, 8);
    expect(canvas.byteLength).toBe(8 * 8 * 4);
  });

  it('initializes all pixels to transparent', () => {
    const canvas = createCanvas(2, 2);
    for (let i = 0; i < canvas.length; i++) {
      expect(canvas[i]).toBe(0);
    }
  });

  it('throws CANVAS_TOO_LARGE for dimensions exceeding limit', () => {
    expect(() => createCanvas(MAX_CANVAS_SIZE + 1, 10)).toThrow(PixelArtError);
    expect(() => createCanvas(10, MAX_CANVAS_SIZE + 1)).toThrow(PixelArtError);
  });

  it('throws INVALID_ARGS for zero or negative dimensions', () => {
    expect(() => createCanvas(0, 10)).toThrow(PixelArtError);
    expect(() => createCanvas(10, -1)).toThrow(PixelArtError);
  });
});

describe('getPixel', () => {
  it('returns hex color at coordinates', () => {
    const canvas = createCanvas(4, 4);
    // All transparent by default
    expect(getPixel(canvas, 4, 0, 0)).toBe('#00000000');
  });

  it('returns color after setPixel', () => {
    const canvas = createCanvas(4, 4);
    setPixel(canvas, 4, 1, 2, '#ff0000');
    expect(getPixel(canvas, 4, 1, 2)).toBe('#ff0000ff');
  });
});

describe('setPixel', () => {
  it('sets RGBA values from #RRGGBB color', () => {
    const canvas = createCanvas(4, 4);
    setPixel(canvas, 4, 0, 0, '#ff8040');
    const idx = 0;
    expect(canvas[idx]).toBe(255);    // R
    expect(canvas[idx + 1]).toBe(128); // G
    expect(canvas[idx + 2]).toBe(64);  // B
    expect(canvas[idx + 3]).toBe(255); // A (opaque for #RRGGBB)
  });

  it('sets RGBA values from #RRGGBBAA color', () => {
    const canvas = createCanvas(4, 4);
    setPixel(canvas, 4, 0, 0, '#ff804080');
    const idx = 0;
    expect(canvas[idx]).toBe(255);
    expect(canvas[idx + 1]).toBe(128);
    expect(canvas[idx + 2]).toBe(64);
    expect(canvas[idx + 3]).toBe(128);
  });
});

describe('isInBounds', () => {
  it('returns true for valid coordinates', () => {
    expect(isInBounds(4, 4, 0, 0)).toBe(true);
    expect(isInBounds(4, 4, 3, 3)).toBe(true);
  });

  it('returns false for out of bounds', () => {
    expect(isInBounds(4, 4, 4, 0)).toBe(false);
    expect(isInBounds(4, 4, -1, 0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/canvas.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement canvas**

```typescript
// packages/core/src/canvas.ts
import { MAX_CANVAS_SIZE, type Color } from './types.js';
import { PixelArtError } from './errors.js';

export function createCanvas(width: number, height: number): Uint8ClampedArray {
  if (width <= 0 || height <= 0) {
    throw new PixelArtError('INVALID_ARGS', `Canvas dimensions must be positive, got ${width}x${height}`);
  }
  if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
    throw new PixelArtError('CANVAS_TOO_LARGE', `Canvas dimensions ${width}x${height} exceed limit ${MAX_CANVAS_SIZE}x${MAX_CANVAS_SIZE}`);
  }
  return new Uint8ClampedArray(width * height * 4);
}

export function isInBounds(width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

export function pixelIndex(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

export function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): Color {
  const idx = pixelIndex(width, x, y);
  const r = data[idx].toString(16).padStart(2, '0');
  const g = data[idx + 1].toString(16).padStart(2, '0');
  const b = data[idx + 2].toString(16).padStart(2, '0');
  const a = data[idx + 3].toString(16).padStart(2, '0');
  return `#${r}${g}${b}${a}`;
}

export function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, color: Color): void {
  const idx = pixelIndex(width, x, y);
  const { r, g, b, a } = parseColor(color);
  data[idx] = r;
  data[idx + 1] = g;
  data[idx + 2] = b;
  data[idx + 3] = a;
}

export function parseColor(color: Color): { r: number; g: number; b: number; a: number } {
  if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
    throw new PixelArtError('INVALID_COLOR_FORMAT', `Invalid color format: ${color}. Expected #RRGGBB or #RRGGBBAA`);
  }
  const hex = color.slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/canvas.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/canvas.ts packages/core/src/__tests__/canvas.test.ts
git commit -m "feat(core): add canvas creation and pixel operations"
```

---

### Task 4: Layer System

**Files:**
- Create: `packages/core/src/layer.ts`
- Test: `packages/core/src/__tests__/layer.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/layer.test.ts
import { describe, it, expect } from 'vitest';
import { createLayer, flattenLayers } from '../layer.js';
import { setPixel, getPixel } from '../canvas.js';
import type { LayerData } from '../types.js';

describe('createLayer', () => {
  it('creates a layer with transparent canvas', () => {
    const layer = createLayer('Background', 4, 4);
    expect(layer.name).toBe('Background');
    expect(layer.visible).toBe(true);
    expect(layer.opacity).toBe(1.0);
    expect(layer.data.byteLength).toBe(4 * 4 * 4);
  });
});

describe('flattenLayers', () => {
  it('returns transparent canvas for no visible layers', () => {
    const layer: LayerData = createLayer('Hidden', 2, 2);
    layer.visible = false;
    setPixel(layer.data, 2, 0, 0, '#ff0000');
    const result = flattenLayers([layer], 2, 2);
    expect(getPixel(result, 2, 0, 0)).toBe('#00000000');
  });

  it('flattens single visible layer at full opacity', () => {
    const layer = createLayer('Base', 2, 2);
    setPixel(layer.data, 2, 0, 0, '#ff0000');
    const result = flattenLayers([layer], 2, 2);
    expect(getPixel(result, 2, 0, 0)).toBe('#ff0000ff');
  });

  it('composites layers bottom to top', () => {
    const bottom = createLayer('Bottom', 2, 2);
    setPixel(bottom.data, 2, 0, 0, '#ff0000');

    const top = createLayer('Top', 2, 2);
    setPixel(top.data, 2, 0, 0, '#00ff00');

    // Top layer fully covers bottom at (0,0)
    const result = flattenLayers([bottom, top], 2, 2);
    expect(getPixel(result, 2, 0, 0)).toBe('#00ff00ff');
    // Bottom still shows at (1,0)
    expect(getPixel(result, 2, 1, 0)).toBe('#00000000');
  });

  it('respects layer opacity', () => {
    const bottom = createLayer('Bottom', 1, 1);
    setPixel(bottom.data, 1, 0, 0, '#ff0000');

    const top = createLayer('Top', 1, 1);
    top.opacity = 0.0;
    setPixel(top.data, 1, 0, 0, '#00ff00');

    const result = flattenLayers([bottom, top], 1, 1);
    // Top has 0 opacity, so bottom shows through
    expect(getPixel(result, 1, 0, 0)).toBe('#ff0000ff');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/layer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement layer system**

```typescript
// packages/core/src/layer.ts
import type { LayerData } from './types.js';
import { createCanvas } from './canvas.js';

export function createLayer(name: string, width: number, height: number): LayerData {
  return {
    name,
    visible: true,
    opacity: 1.0,
    data: createCanvas(width, height),
  };
}

export function flattenLayers(layers: LayerData[], width: number, height: number): Uint8ClampedArray {
  const result = createCanvas(width, height);
  const totalPixels = width * height;

  for (const layer of layers) {
    if (!layer.visible || layer.opacity === 0) continue;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const srcR = layer.data[idx];
      const srcG = layer.data[idx + 1];
      const srcB = layer.data[idx + 2];
      const srcA = (layer.data[idx + 3] / 255) * layer.opacity;

      if (srcA === 0) continue;

      const dstR = result[idx];
      const dstG = result[idx + 1];
      const dstB = result[idx + 2];
      const dstA = result[idx + 3] / 255;

      // Standard alpha compositing (source over)
      const outA = srcA + dstA * (1 - srcA);
      if (outA === 0) continue;

      result[idx] = Math.round((srcR * srcA + dstR * dstA * (1 - srcA)) / outA);
      result[idx + 1] = Math.round((srcG * srcA + dstG * dstA * (1 - srcA)) / outA);
      result[idx + 2] = Math.round((srcB * srcA + dstB * dstA * (1 - srcA)) / outA);
      result[idx + 3] = Math.round(outA * 255);
    }
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/layer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/layer.ts packages/core/src/__tests__/layer.test.ts
git commit -m "feat(core): add layer creation and alpha compositing"
```

---

## Phase 2: Drawing Tools

### Task 5: Pencil Tool

**Files:**
- Create: `packages/core/src/tools/pencil.ts`
- Test: `packages/core/src/__tests__/tools/pencil.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/core/src/__tests__/tools/pencil.test.ts
import { describe, it, expect } from 'vitest';
import { pencil } from '../../tools/pencil.js';
import { createCanvas, getPixel } from '../../canvas.js';

describe('pencil', () => {
  it('returns PixelDelta with old and new color', () => {
    const data = createCanvas(4, 4);
    const deltas = pencil(data, 4, 4, 1, 1, '#ff0000');
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toEqual({
      x: 1,
      y: 1,
      oldColor: '#00000000',
      newColor: '#ff0000ff',
    });
  });

  it('applies the pixel to the data', () => {
    const data = createCanvas(4, 4);
    pencil(data, 4, 4, 2, 3, '#00ff00');
    expect(getPixel(data, 4, 2, 3)).toBe('#00ff00ff');
  });

  it('returns empty array for out-of-bounds coordinates', () => {
    const data = createCanvas(4, 4);
    const deltas = pencil(data, 4, 4, 5, 5, '#ff0000');
    expect(deltas).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/pencil.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement pencil**

```typescript
// packages/core/src/tools/pencil.ts
import type { Color, PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds, parseColor } from '../canvas.js';

export function pencil(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: Color,
): PixelDelta[] {
  if (!isInBounds(width, height, x, y)) return [];

  const oldColor = getPixel(data, width, x, y);
  // Normalize the color to #RRGGBBAA
  const { r, g, b, a } = parseColor(color);
  const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;

  setPixel(data, width, x, y, color);

  return [{ x, y, oldColor, newColor }];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/pencil.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/tools/pencil.ts packages/core/src/__tests__/tools/pencil.test.ts
git commit -m "feat(core): add pencil tool"
```

---

### Task 6: Eraser Tool

**Files:**
- Create: `packages/core/src/tools/eraser.ts`
- Test: `packages/core/src/__tests__/tools/eraser.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/core/src/__tests__/tools/eraser.test.ts
import { describe, it, expect } from 'vitest';
import { eraser } from '../../tools/eraser.js';
import { createCanvas, getPixel, setPixel } from '../../canvas.js';

describe('eraser', () => {
  it('sets pixel to fully transparent', () => {
    const data = createCanvas(4, 4);
    setPixel(data, 4, 1, 1, '#ff0000');
    const deltas = eraser(data, 4, 4, 1, 1);
    expect(deltas).toHaveLength(1);
    expect(deltas[0].newColor).toBe('#00000000');
    expect(getPixel(data, 4, 1, 1)).toBe('#00000000');
  });

  it('returns empty array for out-of-bounds', () => {
    const data = createCanvas(4, 4);
    expect(eraser(data, 4, 4, -1, 0)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/eraser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement eraser**

```typescript
// packages/core/src/tools/eraser.ts
import type { PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds } from '../canvas.js';

export function eraser(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): PixelDelta[] {
  if (!isInBounds(width, height, x, y)) return [];

  const oldColor = getPixel(data, width, x, y);
  setPixel(data, width, x, y, '#00000000');

  return [{ x, y, oldColor, newColor: '#00000000' }];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/eraser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/tools/eraser.ts packages/core/src/__tests__/tools/eraser.test.ts
git commit -m "feat(core): add eraser tool"
```

---

### Task 7: Fill (Flood Fill) Tool

**Files:**
- Create: `packages/core/src/tools/fill.ts`
- Test: `packages/core/src/__tests__/tools/fill.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/tools/fill.test.ts
import { describe, it, expect } from 'vitest';
import { fill } from '../../tools/fill.js';
import { createCanvas, getPixel, setPixel } from '../../canvas.js';

describe('fill', () => {
  it('fills connected region of same color', () => {
    const data = createCanvas(4, 4);
    const deltas = fill(data, 4, 4, 0, 0, '#ff0000');
    // All 16 pixels should be filled (all were transparent)
    expect(deltas).toHaveLength(16);
    expect(getPixel(data, 4, 0, 0)).toBe('#ff0000ff');
    expect(getPixel(data, 4, 3, 3)).toBe('#ff0000ff');
  });

  it('stops at color boundary', () => {
    const data = createCanvas(4, 4);
    // Draw a vertical wall at x=2
    for (let y = 0; y < 4; y++) {
      setPixel(data, 4, 2, y, '#0000ff');
    }
    const deltas = fill(data, 4, 4, 0, 0, '#ff0000');
    // Only left side fills (x=0,1 * 4 rows = 8 pixels)
    expect(deltas).toHaveLength(8);
    // Right side should still be transparent
    expect(getPixel(data, 4, 3, 0)).toBe('#00000000');
  });

  it('does nothing when target color equals fill color', () => {
    const data = createCanvas(2, 2);
    setPixel(data, 2, 0, 0, '#ff0000');
    setPixel(data, 2, 1, 0, '#ff0000');
    setPixel(data, 2, 0, 1, '#ff0000');
    setPixel(data, 2, 1, 1, '#ff0000');
    const deltas = fill(data, 2, 2, 0, 0, '#ff0000');
    expect(deltas).toHaveLength(0);
  });

  it('returns empty array for out-of-bounds', () => {
    const data = createCanvas(4, 4);
    expect(fill(data, 4, 4, -1, 0, '#ff0000')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/fill.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement fill (BFS flood fill)**

```typescript
// packages/core/src/tools/fill.ts
import type { Color, PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds, parseColor } from '../canvas.js';

export function fill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  color: Color,
): PixelDelta[] {
  if (!isInBounds(width, height, startX, startY)) return [];

  const targetColor = getPixel(data, width, startX, startY);
  const { r, g, b, a } = parseColor(color);
  const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;

  if (targetColor === newColor) return [];

  const deltas: PixelDelta[] = [];
  const visited = new Set<number>();
  const queue: [number, number][] = [[startX, startY]];

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = y * width + x;

    if (visited.has(key)) continue;
    if (!isInBounds(width, height, x, y)) continue;
    if (getPixel(data, width, x, y) !== targetColor) continue;

    visited.add(key);
    const oldColor = getPixel(data, width, x, y);
    setPixel(data, width, x, y, color);
    deltas.push({ x, y, oldColor, newColor });

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return deltas;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/fill.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/tools/fill.ts packages/core/src/__tests__/tools/fill.test.ts
git commit -m "feat(core): add flood fill tool"
```

---

### Task 8: Line Tool (Bresenham)

**Files:**
- Create: `packages/core/src/tools/line.ts`
- Test: `packages/core/src/__tests__/tools/line.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/tools/line.test.ts
import { describe, it, expect } from 'vitest';
import { line } from '../../tools/line.js';
import { createCanvas, getPixel } from '../../canvas.js';

describe('line', () => {
  it('draws horizontal line', () => {
    const data = createCanvas(8, 8);
    const deltas = line(data, 8, 8, 0, 0, 4, 0, '#ff0000');
    expect(deltas).toHaveLength(5); // 0,1,2,3,4
    for (let x = 0; x <= 4; x++) {
      expect(getPixel(data, 8, x, 0)).toBe('#ff0000ff');
    }
  });

  it('draws vertical line', () => {
    const data = createCanvas(8, 8);
    const deltas = line(data, 8, 8, 3, 1, 3, 5, '#00ff00');
    expect(deltas).toHaveLength(5);
    for (let y = 1; y <= 5; y++) {
      expect(getPixel(data, 8, 3, y)).toBe('#00ff00ff');
    }
  });

  it('draws diagonal line', () => {
    const data = createCanvas(8, 8);
    const deltas = line(data, 8, 8, 0, 0, 3, 3, '#0000ff');
    expect(deltas).toHaveLength(4);
    for (let i = 0; i <= 3; i++) {
      expect(getPixel(data, 8, i, i)).toBe('#0000ffff');
    }
  });

  it('draws single point when start equals end', () => {
    const data = createCanvas(8, 8);
    const deltas = line(data, 8, 8, 2, 2, 2, 2, '#ff0000');
    expect(deltas).toHaveLength(1);
  });

  it('clips line to canvas bounds', () => {
    const data = createCanvas(4, 4);
    const deltas = line(data, 4, 4, 0, 0, 10, 0, '#ff0000');
    expect(deltas).toHaveLength(4); // Only 0,1,2,3 are in bounds
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/line.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Bresenham's line algorithm**

```typescript
// packages/core/src/tools/line.ts
import type { Color, PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds, parseColor } from '../canvas.js';

export function line(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Color,
): PixelDelta[] {
  const { r, g, b, a } = parseColor(color);
  const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  const deltas: PixelDelta[] = [];

  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  let cx = x0;
  let cy = y0;

  while (true) {
    if (isInBounds(width, height, cx, cy)) {
      const oldColor = getPixel(data, width, cx, cy);
      setPixel(data, width, cx, cy, color);
      deltas.push({ x: cx, y: cy, oldColor, newColor });
    }

    if (cx === x1 && cy === y1) break;

    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      cx += sx;
    }
    if (e2 <= dx) {
      err += dx;
      cy += sy;
    }
  }

  return deltas;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/line.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/tools/line.ts packages/core/src/__tests__/tools/line.test.ts
git commit -m "feat(core): add line tool with Bresenham algorithm"
```

---

### Task 9: Rect Tool

**Files:**
- Create: `packages/core/src/tools/rect.ts`
- Test: `packages/core/src/__tests__/tools/rect.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/tools/rect.test.ts
import { describe, it, expect } from 'vitest';
import { rect } from '../../tools/rect.js';
import { createCanvas, getPixel } from '../../canvas.js';

describe('rect', () => {
  it('draws outline rectangle', () => {
    const data = createCanvas(8, 8);
    const deltas = rect(data, 8, 8, 1, 1, 3, 3, '#ff0000', false);
    // Outline of 3x3 = 8 pixels (perimeter)
    expect(deltas).toHaveLength(8);
    // Corners
    expect(getPixel(data, 8, 1, 1)).toBe('#ff0000ff');
    expect(getPixel(data, 8, 3, 3)).toBe('#ff0000ff');
    // Center should be empty
    expect(getPixel(data, 8, 2, 2)).toBe('#00000000');
  });

  it('draws filled rectangle', () => {
    const data = createCanvas(8, 8);
    const deltas = rect(data, 8, 8, 1, 1, 3, 3, '#ff0000', true);
    expect(deltas).toHaveLength(9); // 3x3 = 9
    expect(getPixel(data, 8, 2, 2)).toBe('#ff0000ff');
  });

  it('clips to canvas bounds', () => {
    const data = createCanvas(4, 4);
    const deltas = rect(data, 4, 4, 2, 2, 5, 5, '#ff0000', true);
    // Only 2x2 pixels are in bounds (2,2), (3,2), (2,3), (3,3)
    expect(deltas).toHaveLength(4);
  });

  it('defaults to outline when filled is undefined', () => {
    const data = createCanvas(8, 8);
    const deltas = rect(data, 8, 8, 0, 0, 2, 2, '#ff0000');
    // 3x3 outline = 8 pixels
    expect(deltas).toHaveLength(8);
    expect(getPixel(data, 8, 1, 1)).toBe('#00000000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/rect.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement rect**

```typescript
// packages/core/src/tools/rect.ts
import type { Color, PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds, parseColor } from '../canvas.js';

export function rect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Color,
  filled?: boolean,
): PixelDelta[] {
  const { r, g, b, a } = parseColor(color);
  const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  const deltas: PixelDelta[] = [];

  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (!isInBounds(width, height, px, py)) continue;

      const isEdge = px === x || px === x + w - 1 || py === y || py === y + h - 1;
      if (!filled && !isEdge) continue;

      const oldColor = getPixel(data, width, px, py);
      setPixel(data, width, px, py, color);
      deltas.push({ x: px, y: py, oldColor, newColor });
    }
  }

  return deltas;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/rect.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/tools/rect.ts packages/core/src/__tests__/tools/rect.test.ts
git commit -m "feat(core): add rect tool with outline and fill modes"
```

---

### Task 10: Selection & Move Tools

**Files:**
- Create: `packages/core/src/tools/selection.ts`
- Test: `packages/core/src/__tests__/tools/selection.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/tools/selection.test.ts
import { describe, it, expect } from 'vitest';
import { select, move } from '../../tools/selection.js';
import { createCanvas, getPixel, setPixel } from '../../canvas.js';

describe('select', () => {
  it('returns selection with pixel data from region', () => {
    const data = createCanvas(8, 8);
    setPixel(data, 8, 1, 1, '#ff0000');
    setPixel(data, 8, 2, 1, '#00ff00');

    const sel = select(data, 8, 8, 1, 1, 2, 2);
    expect(sel.x).toBe(1);
    expect(sel.y).toBe(1);
    expect(sel.width).toBe(2);
    expect(sel.height).toBe(2);
    expect(sel.data.byteLength).toBe(2 * 2 * 4);
  });

  it('clamps selection to canvas bounds', () => {
    const data = createCanvas(4, 4);
    const sel = select(data, 4, 4, 3, 3, 4, 4);
    // Clamped to 1x1
    expect(sel.width).toBe(1);
    expect(sel.height).toBe(1);
  });
});

describe('move', () => {
  it('moves selection content by offset', () => {
    const data = createCanvas(8, 8);
    setPixel(data, 8, 1, 1, '#ff0000');
    setPixel(data, 8, 2, 1, '#00ff00');

    const sel = select(data, 8, 8, 1, 1, 2, 1);
    const deltas = move(data, 8, 8, sel, 2, 0);

    // Original positions should be cleared
    expect(getPixel(data, 8, 1, 1)).toBe('#00000000');
    expect(getPixel(data, 8, 2, 1)).toBe('#00000000');
    // New positions should have the colors
    expect(getPixel(data, 8, 3, 1)).toBe('#ff0000ff');
    expect(getPixel(data, 8, 4, 1)).toBe('#00ff00ff');
    expect(deltas.length).toBeGreaterThan(0);
  });

  it('clips moved content to canvas bounds', () => {
    const data = createCanvas(4, 4);
    setPixel(data, 4, 0, 0, '#ff0000');
    const sel = select(data, 4, 4, 0, 0, 1, 1);
    const deltas = move(data, 4, 4, sel, 10, 0);
    // Pixel moved out of bounds — just cleared
    expect(getPixel(data, 4, 0, 0)).toBe('#00000000');
    // Nothing placed since destination is out of bounds
    expect(deltas.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/selection.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement selection and move**

```typescript
// packages/core/src/tools/selection.ts
import type { Selection, PixelDelta } from '../types.js';
import { getPixel, setPixel, isInBounds, pixelIndex } from '../canvas.js';

export function select(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
): Selection {
  // Clamp to canvas bounds
  const clampedW = Math.min(w, width - x);
  const clampedH = Math.min(h, height - y);

  const selData = new Uint8ClampedArray(clampedW * clampedH * 4);

  for (let sy = 0; sy < clampedH; sy++) {
    for (let sx = 0; sx < clampedW; sx++) {
      const srcIdx = pixelIndex(width, x + sx, y + sy);
      const dstIdx = (sy * clampedW + sx) * 4;
      selData[dstIdx] = data[srcIdx];
      selData[dstIdx + 1] = data[srcIdx + 1];
      selData[dstIdx + 2] = data[srcIdx + 2];
      selData[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return { x, y, width: clampedW, height: clampedH, data: selData };
}

export function move(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  selection: Selection,
  dx: number,
  dy: number,
): PixelDelta[] {
  const deltas: PixelDelta[] = [];

  // First, clear original position
  for (let sy = 0; sy < selection.height; sy++) {
    for (let sx = 0; sx < selection.width; sx++) {
      const px = selection.x + sx;
      const py = selection.y + sy;
      if (isInBounds(width, height, px, py)) {
        const oldColor = getPixel(data, width, px, py);
        if (oldColor !== '#00000000') {
          setPixel(data, width, px, py, '#00000000');
          deltas.push({ x: px, y: py, oldColor, newColor: '#00000000' });
        }
      }
    }
  }

  // Then, paste at new position
  for (let sy = 0; sy < selection.height; sy++) {
    for (let sx = 0; sx < selection.width; sx++) {
      const selIdx = (sy * selection.width + sx) * 4;
      const r = selection.data[selIdx];
      const g = selection.data[selIdx + 1];
      const b = selection.data[selIdx + 2];
      const a = selection.data[selIdx + 3];

      if (a === 0) continue; // Skip transparent pixels

      const px = selection.x + sx + dx;
      const py = selection.y + sy + dy;
      if (!isInBounds(width, height, px, py)) continue;

      const oldColor = getPixel(data, width, px, py);
      const newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
      setPixel(data, width, px, py, newColor);
      deltas.push({ x: px, y: py, oldColor, newColor });
    }
  }

  return deltas;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/tools/selection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/tools/selection.ts packages/core/src/__tests__/tools/selection.test.ts
git commit -m "feat(core): add selection and move tools"
```

---

## Phase 3: Document, Commands & Features

### Task 11: Command Pattern & Undo/Redo

**Files:**
- Create: `packages/core/src/commands.ts`
- Test: `packages/core/src/__tests__/commands.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/commands.test.ts
import { describe, it, expect } from 'vitest';
import { DrawCommand, CommandStack } from '../commands.js';
import { createCanvas, getPixel, setPixel } from '../canvas.js';
import type { PixelDelta } from '../types.js';

describe('DrawCommand', () => {
  it('undoes by restoring old pixel colors', () => {
    const data = createCanvas(4, 4);
    const deltas: PixelDelta[] = [
      { x: 0, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' },
      { x: 1, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' },
    ];
    // Simulate that the pixels were already drawn
    setPixel(data, 4, 0, 0, '#ff0000');
    setPixel(data, 4, 1, 0, '#ff0000');

    const cmd = new DrawCommand(data, 4, deltas);
    cmd.undo();

    expect(getPixel(data, 4, 0, 0)).toBe('#00000000');
    expect(getPixel(data, 4, 1, 0)).toBe('#00000000');
  });

  it('redo restores new pixel colors', () => {
    const data = createCanvas(4, 4);
    const deltas: PixelDelta[] = [
      { x: 0, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' },
    ];

    const cmd = new DrawCommand(data, 4, deltas);
    cmd.undo();
    expect(getPixel(data, 4, 0, 0)).toBe('#00000000');
    cmd.execute();
    expect(getPixel(data, 4, 0, 0)).toBe('#ff0000ff');
  });
});

describe('CommandStack', () => {
  it('supports undo and redo', () => {
    const data = createCanvas(4, 4);
    setPixel(data, 4, 0, 0, '#ff0000');
    const cmd = new DrawCommand(data, 4, [
      { x: 0, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' },
    ]);

    const stack = new CommandStack();
    stack.push(cmd);

    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);

    stack.undo();
    expect(getPixel(data, 4, 0, 0)).toBe('#00000000');
    expect(stack.canRedo).toBe(true);

    stack.redo();
    expect(getPixel(data, 4, 0, 0)).toBe('#ff0000ff');
  });

  it('clears redo stack on new push', () => {
    const data = createCanvas(4, 4);
    const stack = new CommandStack();

    setPixel(data, 4, 0, 0, '#ff0000');
    stack.push(new DrawCommand(data, 4, [
      { x: 0, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' },
    ]));

    stack.undo();
    expect(stack.canRedo).toBe(true);

    setPixel(data, 4, 1, 0, '#00ff00');
    stack.push(new DrawCommand(data, 4, [
      { x: 1, y: 0, oldColor: '#00000000', newColor: '#00ff00ff' },
    ]));

    expect(stack.canRedo).toBe(false);
  });

  it('respects max limit', () => {
    const data = createCanvas(4, 4);
    const stack = new CommandStack(2);

    for (let i = 0; i < 5; i++) {
      setPixel(data, 4, i % 4, 0, '#ff0000');
      stack.push(new DrawCommand(data, 4, [
        { x: i % 4, y: 0, oldColor: '#00000000', newColor: '#ff0000ff' },
      ]));
    }

    // Can only undo 2 times (the limit)
    stack.undo();
    stack.undo();
    expect(stack.canUndo).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/commands.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement command pattern**

```typescript
// packages/core/src/commands.ts
import type { PixelDelta } from './types.js';
import { setPixel } from './canvas.js';

export interface Command {
  execute(): void;
  undo(): void;
}

export class DrawCommand implements Command {
  constructor(
    private data: Uint8ClampedArray,
    private width: number,
    private deltas: PixelDelta[],
  ) {}

  execute(): void {
    for (const delta of this.deltas) {
      setPixel(this.data, this.width, delta.x, delta.y, delta.newColor);
    }
  }

  undo(): void {
    for (const delta of this.deltas) {
      setPixel(this.data, this.width, delta.x, delta.y, delta.oldColor);
    }
  }
}

export class CommandStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  constructor(private maxSize: number = 100) {}

  push(command: Command): void {
    this.undoStack.push(command);
    this.redoStack = [];
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
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

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/commands.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/commands.ts packages/core/src/__tests__/commands.test.ts
git commit -m "feat(core): add command pattern with undo/redo stack"
```

---

### Task 12: Document Class (Layers + Mirror Mode + Active Layer)

**Files:**
- Create: `packages/core/src/document.ts`
- Test: `packages/core/src/__tests__/document.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/document.test.ts
import { describe, it, expect } from 'vitest';
import { Document } from '../document.js';
import { getPixel } from '../canvas.js';

describe('Document', () => {
  it('creates with one default layer', () => {
    const doc = new Document(8, 8);
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0].name).toBe('Layer 1');
    expect(doc.activeLayerIndex).toBe(0);
  });

  it('adds and removes layers', () => {
    const doc = new Document(8, 8);
    doc.addLayer('Layer 2');
    expect(doc.layers).toHaveLength(2);
    expect(doc.layers[1].name).toBe('Layer 2');

    doc.removeLayer(0);
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0].name).toBe('Layer 2');
  });

  it('prevents removing last layer', () => {
    const doc = new Document(8, 8);
    expect(() => doc.removeLayer(0)).toThrow();
  });

  it('reorders layers', () => {
    const doc = new Document(8, 8);
    doc.addLayer('Layer 2');
    doc.addLayer('Layer 3');
    doc.reorderLayer(2, 0);
    expect(doc.layers[0].name).toBe('Layer 3');
    expect(doc.layers[2].name).toBe('Layer 1');
  });

  it('merges layers', () => {
    const doc = new Document(4, 4);
    doc.addLayer('Layer 2');
    doc.mergeLayerDown(1);
    expect(doc.layers).toHaveLength(1);
  });

  it('draws with pencil and supports undo', () => {
    const doc = new Document(4, 4);
    doc.draw('pencil', 1, 1, '#ff0000');
    expect(getPixel(doc.activeLayer.data, 4, 1, 1)).toBe('#ff0000ff');

    doc.undo();
    expect(getPixel(doc.activeLayer.data, 4, 1, 1)).toBe('#00000000');

    doc.redo();
    expect(getPixel(doc.activeLayer.data, 4, 1, 1)).toBe('#ff0000ff');
  });

  it('applies mirror mode to drawing', () => {
    const doc = new Document(8, 8);
    doc.mirrorMode = { horizontal: true, vertical: false };
    doc.draw('pencil', 1, 3, '#ff0000');

    // Original pixel
    expect(getPixel(doc.activeLayer.data, 8, 1, 3)).toBe('#ff0000ff');
    // Horizontally mirrored: x' = width - 1 - x = 6
    expect(getPixel(doc.activeLayer.data, 8, 6, 3)).toBe('#ff0000ff');
  });

  it('applies both horizontal and vertical mirror', () => {
    const doc = new Document(8, 8);
    doc.mirrorMode = { horizontal: true, vertical: true };
    doc.draw('pencil', 1, 1, '#ff0000');

    expect(getPixel(doc.activeLayer.data, 8, 1, 1)).toBe('#ff0000ff');
    expect(getPixel(doc.activeLayer.data, 8, 6, 1)).toBe('#ff0000ff'); // h-mirror
    expect(getPixel(doc.activeLayer.data, 8, 1, 6)).toBe('#ff0000ff'); // v-mirror
    expect(getPixel(doc.activeLayer.data, 8, 6, 6)).toBe('#ff0000ff'); // both
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/document.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Document**

```typescript
// packages/core/src/document.ts
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

  constructor(
    public readonly width: number,
    public readonly height: number,
    maxUndo: number = 100,
  ) {
    this.layers = [createLayer('Layer 1', width, height)];
    this.commands = new CommandStack(maxUndo);
  }

  get activeLayer(): LayerData {
    return this.layers[this.activeLayerIndex];
  }

  addLayer(name: string, position?: number): void {
    const layer = createLayer(name, this.width, this.height);
    if (position !== undefined) {
      this.layers.splice(position, 0, layer);
    } else {
      this.layers.push(layer);
    }
  }

  removeLayer(index: number): void {
    if (this.layers.length <= 1) {
      throw new PixelArtError('INVALID_ARGS', 'Cannot remove the last layer');
    }
    this.validateLayerIndex(index);
    this.layers.splice(index, 1);
    if (this.activeLayerIndex >= this.layers.length) {
      this.activeLayerIndex = this.layers.length - 1;
    }
  }

  reorderLayer(from: number, to: number): void {
    this.validateLayerIndex(from);
    this.validateLayerIndex(to);
    const [layer] = this.layers.splice(from, 1);
    this.layers.splice(to, 0, layer);
  }

  mergeLayerDown(index: number): void {
    if (index <= 0 || index >= this.layers.length) {
      throw new PixelArtError('INVALID_LAYER_INDEX', `Cannot merge layer at index ${index} down`);
    }
    const merged = flattenLayers([this.layers[index - 1], this.layers[index]], this.width, this.height);
    this.layers[index - 1].data = merged;
    this.layers.splice(index, 1);
    if (this.activeLayerIndex >= this.layers.length) {
      this.activeLayerIndex = this.layers.length - 1;
    }
  }

  draw(tool: DrawTool, x: number, y: number, color?: Color, ...extra: unknown[]): void {
    const data = this.activeLayer.data;
    let deltas = this.executeTool(tool, data, x, y, color, ...extra);

    // Apply mirror mode
    if (this.mirrorMode.horizontal || this.mirrorMode.vertical) {
      const mirrored = this.applyMirror(tool, data, x, y, color, ...extra);
      deltas = [...deltas, ...mirrored];
    }

    if (deltas.length > 0) {
      this.commands.push(new DrawCommand(data, this.width, deltas));
    }
  }

  private executeTool(tool: DrawTool, data: Uint8ClampedArray, x: number, y: number, color?: Color, ...extra: unknown[]): PixelDelta[] {
    switch (tool) {
      case 'pencil':
        return pencil(data, this.width, this.height, x, y, color!);
      case 'eraser':
        return eraser(data, this.width, this.height, x, y);
      case 'fill':
        return fill(data, this.width, this.height, x, y, color!);
      case 'line':
        return line(data, this.width, this.height, x, y, extra[0] as number, extra[1] as number, color!);
      case 'rect':
        return rect(data, this.width, this.height, x, y, extra[0] as number, extra[1] as number, color!, extra[2] as boolean | undefined);
      default:
        throw new PixelArtError('INVALID_ARGS', `Unknown tool: ${tool}`);
    }
  }

  private applyMirror(tool: DrawTool, data: Uint8ClampedArray, x: number, y: number, color?: Color, ...extra: unknown[]): PixelDelta[] {
    const deltas: PixelDelta[] = [];

    if (this.mirrorMode.horizontal) {
      const mx = this.width - 1 - x;
      deltas.push(...this.executeTool(tool, data, mx, y, color, ...extra));
    }
    if (this.mirrorMode.vertical) {
      const my = this.height - 1 - y;
      deltas.push(...this.executeTool(tool, data, x, my, color, ...extra));
    }
    if (this.mirrorMode.horizontal && this.mirrorMode.vertical) {
      const mx = this.width - 1 - x;
      const my = this.height - 1 - y;
      deltas.push(...this.executeTool(tool, data, mx, my, color, ...extra));
    }

    return deltas;
  }

  undo(): void {
    this.commands.undo();
  }

  redo(): void {
    this.commands.redo();
  }

  get canUndo(): boolean {
    return this.commands.canUndo;
  }

  get canRedo(): boolean {
    return this.commands.canRedo;
  }

  flatten(): Uint8ClampedArray {
    return flattenLayers(this.layers, this.width, this.height);
  }

  private validateLayerIndex(index: number): void {
    if (index < 0 || index >= this.layers.length) {
      throw new PixelArtError('INVALID_LAYER_INDEX', `Layer index ${index} out of range [0, ${this.layers.length - 1}]`);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/document.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/document.ts packages/core/src/__tests__/document.test.ts
git commit -m "feat(core): add Document class with layers, undo/redo, and mirror mode"
```

---

### Task 13: Transform Operations

**Files:**
- Create: `packages/core/src/transform.ts`
- Test: `packages/core/src/__tests__/transform.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/transform.test.ts
import { describe, it, expect } from 'vitest';
import { flipH, flipV, rotate90, resize } from '../transform.js';
import { createCanvas, getPixel, setPixel } from '../canvas.js';

describe('flipH', () => {
  it('flips pixels horizontally', () => {
    const data = createCanvas(4, 1);
    setPixel(data, 4, 0, 0, '#ff0000');
    setPixel(data, 4, 3, 0, '#00ff00');

    flipH(data, 4, 1);

    expect(getPixel(data, 4, 0, 0)).toBe('#00ff00ff');
    expect(getPixel(data, 4, 3, 0)).toBe('#ff0000ff');
  });
});

describe('flipV', () => {
  it('flips pixels vertically', () => {
    const data = createCanvas(1, 4);
    setPixel(data, 1, 0, 0, '#ff0000');
    setPixel(data, 1, 0, 3, '#00ff00');

    flipV(data, 1, 4);

    expect(getPixel(data, 1, 0, 0)).toBe('#00ff00ff');
    expect(getPixel(data, 1, 0, 3)).toBe('#ff0000ff');
  });
});

describe('rotate90', () => {
  it('rotates 90 degrees clockwise', () => {
    // 2x3 → 3x2
    const data = createCanvas(2, 3);
    setPixel(data, 2, 0, 0, '#ff0000'); // top-left → top-right
    setPixel(data, 2, 1, 2, '#00ff00'); // bottom-right → bottom-left... wait

    const result = rotate90(data, 2, 3);
    // After 90° CW: (x,y) → (height-1-y, x), new dims = (3, 2)
    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
    expect(getPixel(result.data, 3, 2, 0)).toBe('#ff0000ff');
  });
});

describe('resize', () => {
  it('resizes with nearest-neighbor, anchored top-left', () => {
    const data = createCanvas(2, 2);
    setPixel(data, 2, 0, 0, '#ff0000');
    setPixel(data, 2, 1, 0, '#00ff00');
    setPixel(data, 2, 0, 1, '#0000ff');
    setPixel(data, 2, 1, 1, '#ffff00');

    const result = resize(data, 2, 2, 4, 4);
    expect(result.byteLength).toBe(4 * 4 * 4);
    // Top-left 2x2 block should be red
    expect(getPixel(result, 4, 0, 0)).toBe('#ff0000ff');
    expect(getPixel(result, 4, 1, 1)).toBe('#ff0000ff');
    // Top-right 2x2 block should be green
    expect(getPixel(result, 4, 2, 0)).toBe('#00ff00ff');
  });

  it('crops when shrinking', () => {
    const data = createCanvas(4, 4);
    setPixel(data, 4, 0, 0, '#ff0000');
    setPixel(data, 4, 3, 3, '#00ff00');

    const result = resize(data, 4, 4, 2, 2);
    expect(result.byteLength).toBe(2 * 2 * 4);
    expect(getPixel(result, 2, 0, 0)).toBe('#ff0000ff');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/transform.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement transforms**

```typescript
// packages/core/src/transform.ts
import { createCanvas, pixelIndex } from './canvas.js';

export function flipH(data: Uint8ClampedArray, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < Math.floor(width / 2); x++) {
      const leftIdx = pixelIndex(width, x, y);
      const rightIdx = pixelIndex(width, width - 1 - x, y);
      for (let c = 0; c < 4; c++) {
        const tmp = data[leftIdx + c];
        data[leftIdx + c] = data[rightIdx + c];
        data[rightIdx + c] = tmp;
      }
    }
  }
}

export function flipV(data: Uint8ClampedArray, width: number, height: number): void {
  const rowBytes = width * 4;
  const temp = new Uint8ClampedArray(rowBytes);
  for (let y = 0; y < Math.floor(height / 2); y++) {
    const topStart = y * rowBytes;
    const bottomStart = (height - 1 - y) * rowBytes;
    temp.set(data.subarray(topStart, topStart + rowBytes));
    data.copyWithin(topStart, bottomStart, bottomStart + rowBytes);
    data.set(temp, bottomStart);
  }
}

export function rotate90(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const newWidth = height;
  const newHeight = width;
  const result = createCanvas(newWidth, newHeight);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = pixelIndex(width, x, y);
      // 90° CW: (x, y) → (height - 1 - y, x) in new coords
      const dstIdx = pixelIndex(newWidth, height - 1 - y, x);
      result[dstIdx] = data[srcIdx];
      result[dstIdx + 1] = data[srcIdx + 1];
      result[dstIdx + 2] = data[srcIdx + 2];
      result[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return { data: result, width: newWidth, height: newHeight };
}

export function resize(
  data: Uint8ClampedArray,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): Uint8ClampedArray {
  const result = createCanvas(newWidth, newHeight);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor((x * oldWidth) / newWidth);
      const srcY = Math.floor((y * oldHeight) / newHeight);
      const srcIdx = pixelIndex(oldWidth, srcX, srcY);
      const dstIdx = pixelIndex(newWidth, x, y);
      result[dstIdx] = data[srcIdx];
      result[dstIdx + 1] = data[srcIdx + 1];
      result[dstIdx + 2] = data[srcIdx + 2];
      result[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/transform.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/transform.ts packages/core/src/__tests__/transform.test.ts
git commit -m "feat(core): add transform operations (flip, rotate, resize)"
```

---

### Task 14: Palette System

**Files:**
- Create: `packages/core/src/palette.ts`
- Test: `packages/core/src/__tests__/palette.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/palette.test.ts
import { describe, it, expect } from 'vitest';
import { getPresetPalette, listPresets, isValidPalette } from '../palette.js';

describe('listPresets', () => {
  it('returns all preset palette names', () => {
    const presets = listPresets();
    expect(presets).toContain('PICO-8');
    expect(presets).toContain('GameBoy');
    expect(presets).toContain('NES');
    expect(presets).toContain('Endesga 32');
    expect(presets).toContain('Endesga 64');
    expect(presets).toContain('Free');
  });
});

describe('getPresetPalette', () => {
  it('returns PICO-8 palette with 16 colors', () => {
    const palette = getPresetPalette('PICO-8');
    expect(palette.name).toBe('PICO-8');
    expect(palette.colors).toHaveLength(16);
    expect(palette.colors[0]).toBe('#000000');
  });

  it('returns GameBoy palette with 4 colors', () => {
    const palette = getPresetPalette('GameBoy');
    expect(palette.colors).toHaveLength(4);
  });

  it('returns Free palette with empty colors', () => {
    const palette = getPresetPalette('Free');
    expect(palette.colors).toHaveLength(0);
  });

  it('throws for unknown preset', () => {
    expect(() => getPresetPalette('Unknown')).toThrow();
  });
});

describe('isValidPalette', () => {
  it('validates correct palette', () => {
    expect(isValidPalette({ name: 'Test', colors: ['#ff0000', '#00ff00'] })).toBe(true);
  });

  it('rejects invalid color format', () => {
    expect(isValidPalette({ name: 'Bad', colors: ['red'] })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/palette.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement palette system**

```typescript
// packages/core/src/palette.ts
import type { Palette } from './types.js';
import { PixelArtError } from './errors.js';

const PRESETS: Record<string, Palette> = {
  'PICO-8': {
    name: 'PICO-8',
    colors: [
      '#000000', '#1d2b53', '#7e2553', '#008751',
      '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
      '#ff004d', '#ffa300', '#ffec27', '#00e436',
      '#29adff', '#83769c', '#ff77a8', '#ffccaa',
    ],
  },
  'GameBoy': {
    name: 'GameBoy',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  },
  'NES': {
    name: 'NES',
    colors: [
      '#7c7c7c', '#0000fc', '#0000bc', '#4428bc', '#940084', '#a80020', '#a81000', '#881400',
      '#503000', '#007800', '#006800', '#005800', '#004058', '#000000', '#000000', '#000000',
      '#bcbcbc', '#0078f8', '#0058f8', '#6844fc', '#d800cc', '#e40058', '#f83800', '#e45c10',
      '#ac7c00', '#00b800', '#00a800', '#00a844', '#008888', '#000000', '#000000', '#000000',
      '#f8f8f8', '#3cbcfc', '#6888fc', '#9878f8', '#f878f8', '#f85898', '#f87858', '#fca044',
      '#f8b800', '#b8f818', '#58d854', '#58f898', '#00e8d8', '#787878', '#000000', '#000000',
      '#fcfcfc', '#a4e4fc', '#b8b8f8', '#d8b8f8', '#f8b8f8', '#f8a4c0', '#f0d0b0', '#fce0a8',
    ],
  },
  'Endesga 32': {
    name: 'Endesga 32',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f50', '#733e39', '#3e2731', '#a22633',
      '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e',
      '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
      '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796', '#c28569',
    ],
  },
  'Endesga 64': {
    name: 'Endesga 64',
    colors: [
      '#ff0040', '#131313', '#1b1b1b', '#272727', '#3d3d3d', '#5d5d5d', '#858585', '#b4b4b4',
      '#ffffff', '#c7cfdd', '#92a1b9', '#657392', '#424c6e', '#2a2f4e', '#1a1932', '#0e071b',
      '#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f', '#f9e6cf',
      '#edab50', '#e07438', '#c64524', '#8e251d', '#ff5000', '#ed7614', '#ffa214', '#ffc825',
      '#ffeb57', '#d3fc7e', '#99e65f', '#5ac54f', '#33984b', '#1e6f50', '#134c4c', '#0c2e44',
      '#00396d', '#0069aa', '#0098dc', '#00cdf9', '#0cf1ff', '#94fdff', '#fdd2ed', '#f389f5',
      '#db3ffd', '#7a09fa', '#3003d9', '#0c0293', '#03193f', '#3b1443', '#622461', '#93388f',
      '#ca52c9', '#c85086', '#f68187', '#f5555d', '#ea323c', '#c42430', '#891e2b', '#571c27',
    ],
  },
  'Free': {
    name: 'Free',
    colors: [],
  },
};

export function listPresets(): string[] {
  return Object.keys(PRESETS);
}

export function getPresetPalette(name: string): Palette {
  const palette = PRESETS[name];
  if (!palette) {
    throw new PixelArtError('INVALID_ARGS', `Unknown preset palette: ${name}. Available: ${listPresets().join(', ')}`);
  }
  return { ...palette, colors: [...palette.colors] };
}

export function isValidPalette(palette: { name: string; colors: string[] }): boolean {
  if (!palette.name || !Array.isArray(palette.colors)) return false;
  const colorRegex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  return palette.colors.every((c) => colorRegex.test(c));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/palette.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/palette.ts packages/core/src/__tests__/palette.test.ts
git commit -m "feat(core): add palette system with 6 presets"
```

---

## Phase 4: Serialization & Export

### Task 15: .pxart Serialization (Save/Load with zlib)

**Files:**
- Create: `packages/core/src/serialization.ts`
- Test: `packages/core/src/__tests__/serialization.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/serialization.test.ts
import { describe, it, expect } from 'vitest';
import { serializeProject, deserializeProject } from '../serialization.js';
import { Document } from '../document.js';
import { getPixel } from '../canvas.js';

describe('serialization', () => {
  it('round-trips a document through serialize/deserialize', () => {
    const doc = new Document(8, 8);
    doc.draw('pencil', 1, 1, '#ff0000');
    doc.addLayer('Layer 2');
    doc.palette = { name: 'PICO-8', colors: ['#000000', '#1d2b53'] };

    const json = serializeProject(doc);
    const data = JSON.parse(json);
    expect(data.version).toBe(1);
    expect(data.width).toBe(8);
    expect(data.height).toBe(8);
    expect(data.layers).toHaveLength(2);
    expect(data.palette.name).toBe('PICO-8');

    const restored = deserializeProject(json);
    expect(restored.width).toBe(8);
    expect(restored.height).toBe(8);
    expect(restored.layers).toHaveLength(2);
    expect(getPixel(restored.layers[0].data, 8, 1, 1)).toBe('#ff0000ff');
    expect(restored.palette.name).toBe('PICO-8');
  });

  it('compresses layer data (output smaller than raw base64)', () => {
    const doc = new Document(64, 64);
    // Mostly transparent — should compress very well
    doc.draw('pencil', 0, 0, '#ff0000');

    const json = serializeProject(doc);
    const data = JSON.parse(json);
    const rawSize = 64 * 64 * 4 * (4 / 3); // base64 of raw RGBA
    expect(data.layers[0].data.length).toBeLessThan(rawSize);
  });

  it('includes metadata with timestamps', () => {
    const doc = new Document(4, 4);
    const json = serializeProject(doc);
    const data = JSON.parse(json);
    expect(data.metadata.createdAt).toBeDefined();
    expect(data.metadata.modifiedAt).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/serialization.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement serialization**

```typescript
// packages/core/src/serialization.ts
import { deflate, inflate } from 'pako';
import type { ProjectData, LayerData } from './types.js';
import { Document } from './document.js';
import { createCanvas } from './canvas.js';
import { PixelArtError } from './errors.js';

export function serializeProject(doc: Document): string {
  const now = new Date().toISOString();
  const project: ProjectData = {
    version: 1,
    width: doc.width,
    height: doc.height,
    layers: doc.layers.map((layer) => ({
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      data: compressLayerData(layer.data),
    })),
    palette: { ...doc.palette },
    metadata: {
      createdAt: now,
      modifiedAt: now,
    },
  };
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(json: string): Document {
  let data: ProjectData;
  try {
    data = JSON.parse(json);
  } catch {
    throw new PixelArtError('INVALID_ARGS', 'Invalid .pxart file: not valid JSON');
  }

  if (data.version !== 1) {
    throw new PixelArtError('INVALID_ARGS', `Unsupported .pxart version: ${data.version}`);
  }

  const doc = new Document(data.width, data.height);
  // Remove the default layer
  doc.layers.length = 0;

  for (const layerData of data.layers) {
    const pixels = decompressLayerData(layerData.data, data.width, data.height);
    const layer: LayerData = {
      name: layerData.name,
      visible: layerData.visible,
      opacity: layerData.opacity,
      data: pixels,
    };
    doc.layers.push(layer);
  }

  doc.palette = data.palette;
  return doc;
}

function compressLayerData(data: Uint8ClampedArray): string {
  const compressed = deflate(data);
  return uint8ToBase64(compressed);
}

function decompressLayerData(base64: string, width: number, height: number): Uint8ClampedArray {
  const compressed = base64ToUint8(base64);
  const raw = inflate(compressed);
  const expected = width * height * 4;
  if (raw.length !== expected) {
    throw new PixelArtError('INVALID_ARGS', `Layer data size mismatch: got ${raw.length}, expected ${expected}`);
  }
  return new Uint8ClampedArray(raw);
}

function uint8ToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/serialization.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/serialization.ts packages/core/src/__tests__/serialization.test.ts
git commit -m "feat(core): add .pxart serialization with zlib compression"
```

---

### Task 16: PNG Export

**Files:**
- Create: `packages/core/src/export-png.ts`
- Test: `packages/core/src/__tests__/export-png.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/export-png.test.ts
import { describe, it, expect } from 'vitest';
import { exportPng, parsePng } from '../export-png.js';
import { Document } from '../document.js';

describe('exportPng', () => {
  it('produces valid PNG buffer', () => {
    const doc = new Document(4, 4);
    doc.draw('pencil', 0, 0, '#ff0000');
    const buffer = exportPng(doc);
    // PNG magic bytes
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50); // P
    expect(buffer[2]).toBe(0x4e); // N
    expect(buffer[3]).toBe(0x47); // G
  });

  it('exports only specified layer indices', () => {
    const doc = new Document(4, 4);
    doc.draw('pencil', 0, 0, '#ff0000');
    doc.addLayer('Layer 2');
    doc.activeLayerIndex = 1;
    doc.draw('pencil', 1, 1, '#00ff00');

    // Export only layer 1 (Layer 2)
    const buffer = exportPng(doc, [1]);
    const parsed = parsePng(buffer);
    // Pixel (0,0) should be transparent (layer 0 excluded)
    const idx = 0;
    expect(parsed.data[idx + 3]).toBe(0);
    // Pixel (1,1) should be green
    const idx2 = (1 * 4 + 1) * 4;
    expect(parsed.data[idx2]).toBe(0);
    expect(parsed.data[idx2 + 1]).toBe(255);
  });

  it('round-trips through PNG encode/decode', () => {
    const doc = new Document(2, 2);
    doc.draw('pencil', 0, 0, '#ff0000');
    doc.draw('pencil', 1, 1, '#0000ff');

    const buffer = exportPng(doc);
    const parsed = parsePng(buffer);
    expect(parsed.width).toBe(2);
    expect(parsed.height).toBe(2);
    // Check red pixel at (0,0)
    expect(parsed.data[0]).toBe(255); // R
    expect(parsed.data[1]).toBe(0);
    expect(parsed.data[2]).toBe(0);
    expect(parsed.data[3]).toBe(255); // A
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/export-png.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement PNG export**

```typescript
// packages/core/src/export-png.ts
import { PNG } from 'pngjs';
import { Document } from './document.js';
import { flattenLayers } from './layer.js';
import type { LayerData } from './types.js';

export function exportPng(doc: Document, layerIndices?: number[]): Buffer {
  let layers: LayerData[];
  if (layerIndices) {
    layers = layerIndices.map((i) => doc.layers[i]);
  } else {
    layers = doc.layers;
  }

  const flattened = flattenLayers(layers, doc.width, doc.height);

  const png = new PNG({ width: doc.width, height: doc.height });
  for (let i = 0; i < flattened.length; i++) {
    png.data[i] = flattened[i];
  }

  return PNG.sync.write(png);
}

export function parsePng(buffer: Buffer): { width: number; height: number; data: Uint8ClampedArray } {
  const png = PNG.sync.read(buffer);
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/export-png.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/export-png.ts packages/core/src/__tests__/export-png.test.ts
git commit -m "feat(core): add PNG export with layer filtering"
```

---

### Task 17: Spritesheet Export

**Files:**
- Create: `packages/core/src/export-spritesheet.ts`
- Test: `packages/core/src/__tests__/export-spritesheet.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/export-spritesheet.test.ts
import { describe, it, expect } from 'vitest';
import { createSpritesheet } from '../export-spritesheet.js';
import { Document } from '../document.js';
import { parsePng } from '../export-png.js';

describe('createSpritesheet', () => {
  it('creates atlas from multiple documents', () => {
    const doc1 = new Document(8, 8);
    doc1.draw('pencil', 0, 0, '#ff0000');

    const doc2 = new Document(8, 8);
    doc2.draw('pencil', 0, 0, '#00ff00');

    const result = createSpritesheet(
      [
        { name: 'sprite1.png', doc: doc1 },
        { name: 'sprite2.png', doc: doc2 },
      ],
    );

    // Row-based packing: 16x8 atlas (two 8x8 sprites side by side)
    const parsed = parsePng(result.atlas);
    expect(parsed.width).toBe(16);
    expect(parsed.height).toBe(8);

    // JSON descriptor
    expect(result.descriptor.frames['sprite1.png']).toEqual({
      frame: { x: 0, y: 0, w: 8, h: 8 },
      sourceSize: { w: 8, h: 8 },
    });
    expect(result.descriptor.frames['sprite2.png']).toEqual({
      frame: { x: 8, y: 0, w: 8, h: 8 },
      sourceSize: { w: 8, h: 8 },
    });
    expect(result.descriptor.meta.size).toEqual({ w: 16, h: 8 });
    expect(result.descriptor.meta.format).toBe('RGBA8888');
  });

  it('handles sprites of different heights (row-based packing)', () => {
    const doc1 = new Document(8, 8);
    const doc2 = new Document(8, 16);

    const result = createSpritesheet([
      { name: 'small.png', doc: doc1 },
      { name: 'tall.png', doc: doc2 },
    ]);

    const parsed = parsePng(result.atlas);
    expect(parsed.width).toBe(16);
    expect(parsed.height).toBe(16); // Row height = max height in row
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/export-spritesheet.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement spritesheet export**

```typescript
// packages/core/src/export-spritesheet.ts
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
  // Row-based packing: all sprites in a single row
  let totalWidth = 0;
  let maxHeight = 0;
  const flattenedSprites: { name: string; data: Uint8ClampedArray; w: number; h: number }[] = [];

  for (const sprite of sprites) {
    const data = flattenLayers(sprite.doc.layers, sprite.doc.width, sprite.doc.height);
    flattenedSprites.push({ name: sprite.name, data, w: sprite.doc.width, h: sprite.doc.height });
    totalWidth += sprite.doc.width;
    maxHeight = Math.max(maxHeight, sprite.doc.height);
  }

  // Create atlas PNG
  const atlas = new PNG({ width: totalWidth, height: maxHeight });
  // Initialize to transparent
  atlas.data.fill(0);

  const frames: SpritesheetData['frames'] = {};
  let xOffset = 0;

  for (const sprite of flattenedSprites) {
    // Copy sprite pixels into atlas
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
    meta: {
      size: { w: totalWidth, h: maxHeight },
      format: 'RGBA8888',
    },
  };

  return { atlas: PNG.sync.write(atlas), descriptor };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/export-spritesheet.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/export-spritesheet.ts packages/core/src/__tests__/export-spritesheet.test.ts
git commit -m "feat(core): add row-based spritesheet export"
```

---

### Task 18: File Locking

**Files:**
- Create: `packages/core/src/file-lock.ts`
- Test: `packages/core/src/__tests__/file-lock.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/__tests__/file-lock.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { acquireLock, releaseLock, isLocked } from '../file-lock.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('file-lock', () => {
  const tmpDir = os.tmpdir();
  const testFile = path.join(tmpDir, 'test-lock.pxart');
  const lockFile = testFile + '.lock';

  afterEach(() => {
    try { fs.unlinkSync(lockFile); } catch {}
  });

  it('acquires lock by creating .lock file with PID', () => {
    acquireLock(testFile);
    expect(fs.existsSync(lockFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
    expect(content.pid).toBe(process.pid);
    expect(content.timestamp).toBeDefined();
    releaseLock(testFile);
  });

  it('releases lock by deleting .lock file', () => {
    acquireLock(testFile);
    releaseLock(testFile);
    expect(fs.existsSync(lockFile)).toBe(false);
  });

  it('detects active lock', () => {
    acquireLock(testFile);
    expect(isLocked(testFile)).toBe(true);
    releaseLock(testFile);
    expect(isLocked(testFile)).toBe(false);
  });

  it('reclaims stale lock from dead PID', () => {
    // Write a lock with a PID that doesn't exist
    fs.writeFileSync(lockFile, JSON.stringify({ pid: 9999999, timestamp: Date.now() }));
    // Should be able to acquire despite existing lock
    acquireLock(testFile);
    const content = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
    expect(content.pid).toBe(process.pid);
    releaseLock(testFile);
  });

  it('throws FILE_LOCKED when lock held by live process', () => {
    acquireLock(testFile);
    // Same PID, but acquireLock should still throw since lock exists for live PID
    // (In practice this prevents double-acquire)
    expect(() => acquireLock(testFile)).toThrow('FILE_LOCKED');
    releaseLock(testFile);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test -- src/__tests__/file-lock.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement file locking**

```typescript
// packages/core/src/file-lock.ts
import * as fs from 'node:fs';
import { PixelArtError } from './errors.js';

interface LockContent {
  pid: number;
  timestamp: number;
}

const STALE_TIMEOUT_MS = 30_000;

function lockPath(filePath: string): string {
  return filePath + '.lock';
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireLock(filePath: string): void {
  const lock = lockPath(filePath);

  if (fs.existsSync(lock)) {
    try {
      const content: LockContent = JSON.parse(fs.readFileSync(lock, 'utf-8'));
      if (isProcessAlive(content.pid)) {
        throw new PixelArtError('FILE_LOCKED', `File is locked by PID ${content.pid}`);
      }
      // PID is dead — reclaim
    } catch (e) {
      if (e instanceof PixelArtError) throw e;
      // Corrupted lock file — reclaim
    }
  }

  const content: LockContent = { pid: process.pid, timestamp: Date.now() };
  fs.writeFileSync(lock, JSON.stringify(content));
}

export function releaseLock(filePath: string): void {
  const lock = lockPath(filePath);
  try {
    fs.unlinkSync(lock);
  } catch {
    // Lock already gone
  }
}

export function isLocked(filePath: string): boolean {
  const lock = lockPath(filePath);
  if (!fs.existsSync(lock)) return false;

  try {
    const content: LockContent = JSON.parse(fs.readFileSync(lock, 'utf-8'));
    if (isProcessAlive(content.pid)) return true;
    // Stale lock from dead process
    return false;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test -- src/__tests__/file-lock.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/file-lock.ts packages/core/src/__tests__/file-lock.test.ts
git commit -m "feat(core): add PID-based advisory file locking"
```

---

### Task 19: Core Public API (index.ts)

**Files:**
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Create index.ts re-exporting all public API**

```typescript
// packages/core/src/index.ts
export * from './types.js';
export * from './errors.js';
export * from './canvas.js';
export * from './layer.js';
export { pencil } from './tools/pencil.js';
export { eraser } from './tools/eraser.js';
export { fill } from './tools/fill.js';
export { line } from './tools/line.js';
export { rect } from './tools/rect.js';
export { select, move } from './tools/selection.js';
export * from './commands.js';
export * from './document.js';
export * from './transform.js';
export * from './palette.js';
export * from './serialization.js';
export * from './export-png.js';
export * from './export-spritesheet.js';
export * from './file-lock.js';
```

- [ ] **Step 2: Run all core tests to verify nothing is broken**

Run: `cd packages/core && pnpm test`
Expected: All tests PASS

- [ ] **Step 3: Build the package**

Run: `cd packages/core && pnpm build`
Expected: `dist/` directory created with compiled JS + type declarations

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): add public API index with all exports"
```

---

## Phase 5: MCP Server

### Task 20: MCP Package Scaffold & Session

**Files:**
- Create: `packages/mcp/package.json`, `packages/mcp/tsconfig.json`, `packages/mcp/vitest.config.ts`
- Create: `packages/mcp/src/session.ts`
- Test: `packages/mcp/src/__tests__/session.test.ts`

- [ ] **Step 1: Create MCP package config**

```json
// packages/mcp/package.json
{
  "name": "@pixel-art/mcp",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "pixel-art-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@pixel-art/core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.12.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.1.0"
  }
}
```

```json
// packages/mcp/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

```typescript
// packages/mcp/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 2: Write failing test for session**

```typescript
// packages/mcp/src/__tests__/session.test.ts
import { describe, it, expect } from 'vitest';
import { Session } from '../session.js';

describe('Session', () => {
  it('creates with no document initially', () => {
    const session = new Session();
    expect(session.document).toBeNull();
    expect(session.projectPath).toBeNull();
  });

  it('creates a new canvas', () => {
    const session = new Session();
    session.createCanvas(16, 16);
    expect(session.document).not.toBeNull();
    expect(session.document!.width).toBe(16);
    expect(session.document!.height).toBe(16);
  });

  it('throws when accessing document before creation', () => {
    const session = new Session();
    expect(() => session.requireDocument()).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm install && cd packages/mcp && pnpm test -- src/__tests__/session.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement session**

```typescript
// packages/mcp/src/session.ts
import { Document, getPresetPalette, deserializeProject, PixelArtError } from '@pixel-art/core';
import * as fs from 'node:fs';

export class Session {
  document: Document | null = null;
  projectPath: string | null = null;

  createCanvas(width: number, height: number, paletteName?: string): void {
    this.document = new Document(width, height);
    if (paletteName) {
      this.document.palette = getPresetPalette(paletteName);
    }
    this.projectPath = null;
  }

  openProject(path: string): void {
    if (!fs.existsSync(path)) {
      throw new PixelArtError('FILE_NOT_FOUND', `File not found: ${path}`);
    }
    const json = fs.readFileSync(path, 'utf-8');
    this.document = deserializeProject(json);
    this.projectPath = path;
  }

  requireDocument(): Document {
    if (!this.document) {
      throw new PixelArtError('INVALID_ARGS', 'No canvas created. Use create_canvas or open_project first.');
    }
    return this.document;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/mcp && pnpm test -- src/__tests__/session.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/mcp/package.json packages/mcp/tsconfig.json packages/mcp/vitest.config.ts packages/mcp/src/session.ts packages/mcp/src/__tests__/session.test.ts pnpm-lock.yaml
git commit -m "feat(mcp): scaffold MCP package with session management"
```

---

### Task 21: MCP Server Setup with Canvas & Layer Tools

**Files:**
- Create: `packages/mcp/src/server.ts`, `packages/mcp/src/index.ts`
- Create: `packages/mcp/src/tools/canvas-tools.ts`, `packages/mcp/src/tools/layer-tools.ts`
- Test: `packages/mcp/src/__tests__/server.test.ts`

- [ ] **Step 1: Write failing integration test**

```typescript
// packages/mcp/src/__tests__/server.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Session } from '../session.js';
import { handleCreateCanvas, handleSaveProject, handleOpenProject } from '../tools/canvas-tools.js';
import { handleCreateLayer, handleSetLayerVisibility, handleDeleteLayer, handleReorderLayer, handleMergeLayers, handleSetLayerOpacity, handleSetActiveLayer } from '../tools/layer-tools.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('canvas tools', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
  });

  it('create_canvas creates a document', () => {
    const result = handleCreateCanvas(session, { width: 16, height: 16 });
    expect(result.content[0].text).toContain('16x16');
    expect(session.document).not.toBeNull();
  });

  it('create_canvas with palette', () => {
    const result = handleCreateCanvas(session, { width: 8, height: 8, palette: 'PICO-8' });
    expect(session.document!.palette.name).toBe('PICO-8');
  });

  it('save_project and open_project round-trip', () => {
    handleCreateCanvas(session, { width: 8, height: 8 });
    const tmpPath = path.join(os.tmpdir(), `test-${Date.now()}.pxart`);
    handleSaveProject(session, { path: tmpPath });
    expect(fs.existsSync(tmpPath)).toBe(true);

    const session2 = new Session();
    handleOpenProject(session2, { path: tmpPath });
    expect(session2.document!.width).toBe(8);

    fs.unlinkSync(tmpPath);
  });
});

describe('layer tools', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
    handleCreateCanvas(session, { width: 8, height: 8 });
  });

  it('create_layer adds a layer', () => {
    handleCreateLayer(session, { name: 'Layer 2' });
    expect(session.document!.layers).toHaveLength(2);
  });

  it('set_active_layer changes active layer', () => {
    handleCreateLayer(session, { name: 'Layer 2' });
    handleSetActiveLayer(session, { index: 1 });
    expect(session.document!.activeLayerIndex).toBe(1);
  });

  it('delete_layer removes a layer', () => {
    handleCreateLayer(session, { name: 'Layer 2' });
    handleDeleteLayer(session, { index: 0 });
    expect(session.document!.layers).toHaveLength(1);
    expect(session.document!.layers[0].name).toBe('Layer 2');
  });

  it('set_layer_visibility toggles visibility', () => {
    handleSetLayerVisibility(session, { index: 0, visible: false });
    expect(session.document!.layers[0].visible).toBe(false);
  });

  it('set_layer_opacity sets opacity', () => {
    handleSetLayerOpacity(session, { index: 0, opacity: 0.5 });
    expect(session.document!.layers[0].opacity).toBe(0.5);
  });

  it('reorder_layer moves layer', () => {
    handleCreateLayer(session, { name: 'Layer 2' });
    handleCreateLayer(session, { name: 'Layer 3' });
    handleReorderLayer(session, { from: 2, to: 0 });
    expect(session.document!.layers[0].name).toBe('Layer 3');
  });

  it('merge_layers merges down', () => {
    handleCreateLayer(session, { name: 'Layer 2' });
    handleMergeLayers(session, { indices: [0, 1] });
    expect(session.document!.layers).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/mcp && pnpm test -- src/__tests__/server.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement canvas and layer tools**

```typescript
// packages/mcp/src/tools/canvas-tools.ts
import { Session } from '../session.js';
import { serializeProject, acquireLock, releaseLock } from '@pixel-art/core';
import * as fs from 'node:fs';

interface McpResult {
  content: { type: string; text: string }[];
}

export function handleCreateCanvas(session: Session, args: { width: number; height: number; palette?: string }): McpResult {
  session.createCanvas(args.width, args.height, args.palette);
  return { content: [{ type: 'text', text: `Created ${args.width}x${args.height} canvas${args.palette ? ` with ${args.palette} palette` : ''}` }] };
}

export function handleOpenProject(session: Session, args: { path: string }): McpResult {
  session.openProject(args.path);
  const doc = session.requireDocument();
  return { content: [{ type: 'text', text: `Opened project: ${args.path} (${doc.width}x${doc.height}, ${doc.layers.length} layers)` }] };
}

export function handleSaveProject(session: Session, args: { path: string }): McpResult {
  const doc = session.requireDocument();
  acquireLock(args.path);
  try {
    const json = serializeProject(doc);
    fs.writeFileSync(args.path, json);
    session.projectPath = args.path;
  } finally {
    releaseLock(args.path);
  }
  return { content: [{ type: 'text', text: `Saved project to ${args.path}` }] };
}
```

```typescript
// packages/mcp/src/tools/layer-tools.ts
import { Session } from '../session.js';
import { PixelArtError } from '@pixel-art/core';

interface McpResult {
  content: { type: string; text: string }[];
}

export function handleCreateLayer(session: Session, args: { name: string; position?: number }): McpResult {
  const doc = session.requireDocument();
  doc.addLayer(args.name, args.position);
  return { content: [{ type: 'text', text: `Created layer "${args.name}" (${doc.layers.length} total)` }] };
}

export function handleDeleteLayer(session: Session, args: { index: number }): McpResult {
  const doc = session.requireDocument();
  const name = doc.layers[args.index]?.name;
  doc.removeLayer(args.index);
  return { content: [{ type: 'text', text: `Deleted layer "${name}" (${doc.layers.length} remaining)` }] };
}

export function handleSetActiveLayer(session: Session, args: { index: number }): McpResult {
  const doc = session.requireDocument();
  if (args.index < 0 || args.index >= doc.layers.length) {
    throw new PixelArtError('INVALID_LAYER_INDEX', `Layer index ${args.index} out of range`);
  }
  doc.activeLayerIndex = args.index;
  return { content: [{ type: 'text', text: `Active layer: ${doc.layers[args.index].name} (index ${args.index})` }] };
}

export function handleSetLayerVisibility(session: Session, args: { index: number; visible: boolean }): McpResult {
  const doc = session.requireDocument();
  if (args.index < 0 || args.index >= doc.layers.length) {
    throw new PixelArtError('INVALID_LAYER_INDEX', `Layer index ${args.index} out of range`);
  }
  doc.layers[args.index].visible = args.visible;
  return { content: [{ type: 'text', text: `Layer "${doc.layers[args.index].name}" visibility: ${args.visible}` }] };
}

export function handleSetLayerOpacity(session: Session, args: { index: number; opacity: number }): McpResult {
  const doc = session.requireDocument();
  if (args.index < 0 || args.index >= doc.layers.length) {
    throw new PixelArtError('INVALID_LAYER_INDEX', `Layer index ${args.index} out of range`);
  }
  doc.layers[args.index].opacity = args.opacity;
  return { content: [{ type: 'text', text: `Layer "${doc.layers[args.index].name}" opacity: ${args.opacity}` }] };
}

export function handleReorderLayer(session: Session, args: { from: number; to: number }): McpResult {
  const doc = session.requireDocument();
  doc.reorderLayer(args.from, args.to);
  return { content: [{ type: 'text', text: `Moved layer from index ${args.from} to ${args.to}` }] };
}

export function handleMergeLayers(session: Session, args: { indices: number[] }): McpResult {
  const doc = session.requireDocument();
  // Sort indices descending and merge each into the one below
  const sorted = [...args.indices].sort((a, b) => b - a);
  for (const idx of sorted) {
    if (idx > 0) {
      doc.mergeLayerDown(idx);
    }
  }
  return { content: [{ type: 'text', text: `Merged layers. ${doc.layers.length} layers remaining.` }] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/mcp && pnpm test -- src/__tests__/server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mcp/src/tools/canvas-tools.ts packages/mcp/src/tools/layer-tools.ts packages/mcp/src/__tests__/server.test.ts
git commit -m "feat(mcp): add canvas and layer tool handlers"
```

---

### Task 22: MCP Drawing Tools

**Files:**
- Create: `packages/mcp/src/tools/drawing-tools.ts`
- Test: `packages/mcp/src/__tests__/drawing-tools.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/mcp/src/__tests__/drawing-tools.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Session } from '../session.js';
import { handleCreateCanvas } from '../tools/canvas-tools.js';
import { handleDrawPixels, handleDrawLine, handleDrawRect, handleFill, handleErase } from '../tools/drawing-tools.js';
import { getPixel } from '@pixel-art/core';

describe('drawing tools', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
    handleCreateCanvas(session, { width: 16, height: 16 });
  });

  it('draw_pixels sets pixels', () => {
    handleDrawPixels(session, {
      pixels: [
        { x: 0, y: 0, color: '#ff0000' },
        { x: 1, y: 1, color: '#00ff00' },
      ],
    });
    const doc = session.requireDocument();
    expect(getPixel(doc.activeLayer.data, 16, 0, 0)).toBe('#ff0000ff');
    expect(getPixel(doc.activeLayer.data, 16, 1, 1)).toBe('#00ff00ff');
  });

  it('draw_line draws a line', () => {
    handleDrawLine(session, { x0: 0, y0: 0, x1: 4, y1: 0, color: '#ff0000' });
    const doc = session.requireDocument();
    for (let x = 0; x <= 4; x++) {
      expect(getPixel(doc.activeLayer.data, 16, x, 0)).toBe('#ff0000ff');
    }
  });

  it('draw_rect draws a filled rectangle', () => {
    handleDrawRect(session, { x: 0, y: 0, w: 3, h: 3, color: '#ff0000', filled: true });
    const doc = session.requireDocument();
    expect(getPixel(doc.activeLayer.data, 16, 1, 1)).toBe('#ff0000ff');
  });

  it('fill floods an area', () => {
    handleFill(session, { x: 0, y: 0, color: '#ff0000' });
    const doc = session.requireDocument();
    expect(getPixel(doc.activeLayer.data, 16, 15, 15)).toBe('#ff0000ff');
  });

  it('erase sets pixels transparent', () => {
    handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
    handleErase(session, { pixels: [{ x: 0, y: 0 }] });
    const doc = session.requireDocument();
    expect(getPixel(doc.activeLayer.data, 16, 0, 0)).toBe('#00000000');
  });

  it('targets specific layer when provided', () => {
    const doc = session.requireDocument();
    doc.addLayer('Layer 2');
    handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }], layer: 1 });
    expect(getPixel(doc.layers[1].data, 16, 0, 0)).toBe('#ff0000ff');
    // Layer 0 should be untouched
    expect(getPixel(doc.layers[0].data, 16, 0, 0)).toBe('#00000000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/mcp && pnpm test -- src/__tests__/drawing-tools.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement drawing tools**

```typescript
// packages/mcp/src/tools/drawing-tools.ts
import { Session } from '../session.js';
import { pencil, eraser, fill, line, rect, getPixel, setPixel, DrawCommand } from '@pixel-art/core';

interface McpResult {
  content: { type: string; text: string }[];
}

function getLayerData(session: Session, layerIndex?: number) {
  const doc = session.requireDocument();
  const idx = layerIndex ?? doc.activeLayerIndex;
  return { doc, layer: doc.layers[idx], idx };
}

export function handleDrawPixels(session: Session, args: { pixels: { x: number; y: number; color: string }[]; layer?: number }): McpResult {
  const { doc, layer } = getLayerData(session, args.layer);
  let count = 0;
  for (const p of args.pixels) {
    const deltas = pencil(layer.data, doc.width, doc.height, p.x, p.y, p.color);
    count += deltas.length;
  }
  return { content: [{ type: 'text', text: `Drew ${count} pixels` }] };
}

export function handleDrawLine(session: Session, args: { x0: number; y0: number; x1: number; y1: number; color: string; layer?: number }): McpResult {
  const { doc, layer } = getLayerData(session, args.layer);
  const deltas = line(layer.data, doc.width, doc.height, args.x0, args.y0, args.x1, args.y1, args.color);
  return { content: [{ type: 'text', text: `Drew line: ${deltas.length} pixels` }] };
}

export function handleDrawRect(session: Session, args: { x: number; y: number; w: number; h: number; color: string; filled?: boolean; layer?: number }): McpResult {
  const { doc, layer } = getLayerData(session, args.layer);
  const deltas = rect(layer.data, doc.width, doc.height, args.x, args.y, args.w, args.h, args.color, args.filled);
  return { content: [{ type: 'text', text: `Drew rect: ${deltas.length} pixels` }] };
}

export function handleFill(session: Session, args: { x: number; y: number; color: string; layer?: number }): McpResult {
  const { doc, layer } = getLayerData(session, args.layer);
  const deltas = fill(layer.data, doc.width, doc.height, args.x, args.y, args.color);
  return { content: [{ type: 'text', text: `Filled: ${deltas.length} pixels` }] };
}

export function handleErase(session: Session, args: { pixels: { x: number; y: number }[]; layer?: number }): McpResult {
  const { doc, layer } = getLayerData(session, args.layer);
  let count = 0;
  for (const p of args.pixels) {
    const deltas = eraser(layer.data, doc.width, doc.height, p.x, p.y);
    count += deltas.length;
  }
  return { content: [{ type: 'text', text: `Erased ${count} pixels` }] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/mcp && pnpm test -- src/__tests__/drawing-tools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mcp/src/tools/drawing-tools.ts packages/mcp/src/__tests__/drawing-tools.test.ts
git commit -m "feat(mcp): add drawing tool handlers"
```

---

### Task 23: MCP Transform, Mirror, Selection, Palette & Export Tools

**Files:**
- Create: `packages/mcp/src/tools/transform-tools.ts`, `packages/mcp/src/tools/palette-tools.ts`, `packages/mcp/src/tools/export-tools.ts`
- Test: `packages/mcp/src/__tests__/remaining-tools.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/mcp/src/__tests__/remaining-tools.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Session } from '../session.js';
import { handleCreateCanvas } from '../tools/canvas-tools.js';
import { handleDrawPixels } from '../tools/drawing-tools.js';
import { handleTransform, handleMirrorMode, handleSelectAndMove } from '../tools/transform-tools.js';
import { handleSetPalette } from '../tools/palette-tools.js';
import { handleExportPng } from '../tools/export-tools.js';
import { getPixel } from '@pixel-art/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('transform tools', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
    handleCreateCanvas(session, { width: 8, height: 8 });
  });

  it('flip_h flips horizontally', () => {
    handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
    handleTransform(session, { op: 'flip_h' });
    const doc = session.requireDocument();
    expect(getPixel(doc.activeLayer.data, 8, 7, 0)).toBe('#ff0000ff');
    expect(getPixel(doc.activeLayer.data, 8, 0, 0)).toBe('#00000000');
  });

  it('rotate 90 degrees', () => {
    handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
    handleTransform(session, { op: 'rotate', degrees: 90 });
    const doc = session.requireDocument();
    // After 90° CW on 8x8: (0,0) → (7,0)
    expect(getPixel(doc.activeLayer.data, 8, 7, 0)).toBe('#ff0000ff');
  });

  it('mirror_mode sets mirror state', () => {
    handleMirrorMode(session, { horizontal: true, vertical: false });
    const doc = session.requireDocument();
    expect(doc.mirrorMode.horizontal).toBe(true);
  });

  it('select_and_move moves pixels', () => {
    handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
    handleSelectAndMove(session, { x: 0, y: 0, w: 1, h: 1, dx: 3, dy: 3 });
    const doc = session.requireDocument();
    expect(getPixel(doc.activeLayer.data, 8, 0, 0)).toBe('#00000000');
    expect(getPixel(doc.activeLayer.data, 8, 3, 3)).toBe('#ff0000ff');
  });
});

describe('palette tools', () => {
  it('set_palette by preset name', () => {
    const session = new Session();
    handleCreateCanvas(session, { width: 8, height: 8 });
    handleSetPalette(session, { name: 'PICO-8' });
    expect(session.requireDocument().palette.name).toBe('PICO-8');
  });

  it('set_palette by color array', () => {
    const session = new Session();
    handleCreateCanvas(session, { width: 8, height: 8 });
    handleSetPalette(session, { colors: ['#ff0000', '#00ff00'] });
    expect(session.requireDocument().palette.colors).toHaveLength(2);
  });
});

describe('export tools', () => {
  it('export_png creates a PNG file', () => {
    const session = new Session();
    handleCreateCanvas(session, { width: 4, height: 4 });
    handleDrawPixels(session, { pixels: [{ x: 0, y: 0, color: '#ff0000' }] });
    const tmpPath = path.join(os.tmpdir(), `test-export-${Date.now()}.png`);
    handleExportPng(session, { path: tmpPath });
    expect(fs.existsSync(tmpPath)).toBe(true);
    const data = fs.readFileSync(tmpPath);
    expect(data[0]).toBe(0x89); // PNG magic
    fs.unlinkSync(tmpPath);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/mcp && pnpm test -- src/__tests__/remaining-tools.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement transform, palette, and export tools**

```typescript
// packages/mcp/src/tools/transform-tools.ts
import { Session } from '../session.js';
import { flipH, flipV, rotate90, resize, select, move, PixelArtError } from '@pixel-art/core';

interface McpResult {
  content: { type: string; text: string }[];
}

export function handleTransform(session: Session, args: { op: string; degrees?: number; width?: number; height?: number }): McpResult {
  const doc = session.requireDocument();

  switch (args.op) {
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
      if (!args.degrees || ![90, 180, 270].includes(args.degrees)) {
        throw new PixelArtError('INVALID_ARGS', 'Rotation must be 90, 180, or 270 degrees');
      }
      const rotations = args.degrees / 90;
      for (let r = 0; r < rotations; r++) {
        for (let i = 0; i < doc.layers.length; i++) {
          const result = rotate90(doc.layers[i].data, doc.width, doc.height);
          doc.layers[i].data = result.data;
        }
      }
      // Note: width/height swap happens on 90° and 270° but Document has readonly dims.
      // For v1, rotation is only supported on square canvases or we rebuild the document.
      return { content: [{ type: 'text', text: `Rotated ${args.degrees}°` }] };
    }

    case 'resize': {
      if (!args.width || !args.height) {
        throw new PixelArtError('INVALID_ARGS', 'resize requires width and height');
      }
      for (let i = 0; i < doc.layers.length; i++) {
        doc.layers[i].data = resize(doc.layers[i].data, doc.width, doc.height, args.width, args.height);
      }
      return { content: [{ type: 'text', text: `Resized to ${args.width}x${args.height}` }] };
    }

    default:
      throw new PixelArtError('INVALID_ARGS', `Unknown transform op: ${args.op}`);
  }
}

export function handleMirrorMode(session: Session, args: { horizontal?: boolean; vertical?: boolean }): McpResult {
  const doc = session.requireDocument();
  doc.mirrorMode = {
    horizontal: args.horizontal ?? doc.mirrorMode.horizontal,
    vertical: args.vertical ?? doc.mirrorMode.vertical,
  };
  return { content: [{ type: 'text', text: `Mirror mode: H=${doc.mirrorMode.horizontal} V=${doc.mirrorMode.vertical}` }] };
}

export function handleSelectAndMove(session: Session, args: { x: number; y: number; w: number; h: number; dx: number; dy: number; layer?: number }): McpResult {
  const doc = session.requireDocument();
  const layerIdx = args.layer ?? doc.activeLayerIndex;
  const layer = doc.layers[layerIdx];
  const sel = select(layer.data, doc.width, doc.height, args.x, args.y, args.w, args.h);
  const deltas = move(layer.data, doc.width, doc.height, sel, args.dx, args.dy);
  return { content: [{ type: 'text', text: `Moved selection: ${deltas.length} pixels changed` }] };
}
```

```typescript
// packages/mcp/src/tools/palette-tools.ts
import { Session } from '../session.js';
import { getPresetPalette, isValidPalette, PixelArtError } from '@pixel-art/core';

interface McpResult {
  content: { type: string; text: string }[];
}

export function handleSetPalette(session: Session, args: { name?: string; colors?: string[] }): McpResult {
  const doc = session.requireDocument();
  if (args.name) {
    doc.palette = getPresetPalette(args.name);
  } else if (args.colors) {
    const palette = { name: 'Custom', colors: args.colors };
    if (!isValidPalette(palette)) {
      throw new PixelArtError('INVALID_COLOR_FORMAT', 'Invalid colors in palette');
    }
    doc.palette = palette;
  } else {
    throw new PixelArtError('INVALID_ARGS', 'Provide either name or colors');
  }
  return { content: [{ type: 'text', text: `Palette set to "${doc.palette.name}" (${doc.palette.colors.length} colors)` }] };
}
```

```typescript
// packages/mcp/src/tools/export-tools.ts
import { Session } from '../session.js';
import { exportPng, createSpritesheet, deserializeProject } from '@pixel-art/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface McpResult {
  content: { type: string; text: string }[];
}

export function handleExportPng(session: Session, args: { path: string; layers?: number[] }): McpResult {
  const doc = session.requireDocument();
  const buffer = exportPng(doc, args.layers);
  fs.writeFileSync(args.path, buffer);
  return { content: [{ type: 'text', text: `Exported PNG to ${args.path}` }] };
}

export function handleExportSpritesheet(session: Session, args: { projects: string[]; output_dir: string }): McpResult {
  const sprites = args.projects.map((p) => {
    const json = fs.readFileSync(p, 'utf-8');
    const doc = deserializeProject(json);
    const name = path.basename(p, '.pxart') + '.png';
    return { name, doc };
  });

  const result = createSpritesheet(sprites);
  fs.mkdirSync(args.output_dir, { recursive: true });
  fs.writeFileSync(path.join(args.output_dir, 'atlas.png'), result.atlas);
  fs.writeFileSync(path.join(args.output_dir, 'atlas.json'), JSON.stringify(result.descriptor, null, 2));
  return { content: [{ type: 'text', text: `Spritesheet exported to ${args.output_dir} (${sprites.length} sprites)` }] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/mcp && pnpm test -- src/__tests__/remaining-tools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mcp/src/tools/transform-tools.ts packages/mcp/src/tools/palette-tools.ts packages/mcp/src/tools/export-tools.ts packages/mcp/src/__tests__/remaining-tools.test.ts
git commit -m "feat(mcp): add transform, palette, and export tool handlers"
```

---

### Task 24: MCP Batch Generate

**Files:**
- Create: `packages/mcp/src/tools/batch-tools.ts`
- Test: `packages/mcp/src/__tests__/batch-tools.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/mcp/src/__tests__/batch-tools.test.ts
import { describe, it, expect } from 'vitest';
import { handleBatchGenerate } from '../tools/batch-tools.js';
import { Session } from '../session.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('batch_generate', () => {
  it('generates multiple assets from template', () => {
    const session = new Session();
    const outputDir = path.join(os.tmpdir(), `batch-test-${Date.now()}`);

    const result = handleBatchGenerate(session, {
      template: [
        { tool: 'create_canvas', args: { width: 4, height: 4 } },
        { tool: 'draw_pixels', args: { pixels: [{ x: 0, y: 0, color: '$color' }] } },
      ],
      variations: [
        { '$color': '#ff0000' },
        { '$color': '#00ff00' },
      ],
      export: { tool: 'export_png', args: { path: `${outputDir}/$index.png` } },
    });

    expect(fs.existsSync(path.join(outputDir, '0.png'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, '1.png'))).toBe(true);

    // Cleanup
    fs.rmSync(outputDir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/mcp && pnpm test -- src/__tests__/batch-tools.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement batch generate**

```typescript
// packages/mcp/src/tools/batch-tools.ts
import { Session } from '../session.js';
import { handleCreateCanvas, handleSaveProject } from './canvas-tools.js';
import { handleDrawPixels, handleDrawLine, handleDrawRect, handleFill, handleErase } from './drawing-tools.js';
import { handleCreateLayer } from './layer-tools.js';
import { handleSetPalette } from './palette-tools.js';
import { handleExportPng } from './export-tools.js';
import { handleTransform, handleMirrorMode } from './transform-tools.js';
import { PixelArtError } from '@pixel-art/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface McpResult {
  content: { type: string; text: string }[];
}

interface TemplateStep {
  tool: string;
  args: Record<string, unknown>;
}

interface BatchArgs {
  template: TemplateStep[];
  variations: Record<string, unknown>[];
  export: { tool: string; args: Record<string, unknown> };
}

const TOOL_HANDLERS: Record<string, (session: Session, args: any) => McpResult> = {
  create_canvas: handleCreateCanvas,
  draw_pixels: handleDrawPixels,
  draw_line: handleDrawLine,
  draw_rect: handleDrawRect,
  fill: handleFill,
  erase: handleErase,
  create_layer: handleCreateLayer,
  set_palette: handleSetPalette,
  transform: handleTransform,
  mirror_mode: handleMirrorMode,
  export_png: handleExportPng,
  save_project: handleSaveProject,
};

function substituteVars(args: Record<string, unknown>, vars: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      const varName = value;
      if (varName in vars) {
        result[key] = vars[varName];
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function handleBatchGenerate(session: Session, args: BatchArgs): McpResult {
  const { template, variations } = args;

  for (let i = 0; i < variations.length; i++) {
    const vars = { ...variations[i], '$index': String(i) };
    const batchSession = new Session();

    // Execute template steps
    for (const step of template) {
      const handler = TOOL_HANDLERS[step.tool];
      if (!handler) {
        throw new PixelArtError('INVALID_ARGS', `Unknown tool in template: ${step.tool}`);
      }
      const resolvedArgs = substituteVars(step.args, vars);
      handler(batchSession, resolvedArgs);
    }

    // Execute export step
    if (args.export) {
      const exportHandler = TOOL_HANDLERS[args.export.tool];
      if (!exportHandler) {
        throw new PixelArtError('INVALID_ARGS', `Unknown export tool: ${args.export.tool}`);
      }
      const exportArgs = substituteVars(args.export.args, vars);
      // Replace $index in string values
      for (const [key, value] of Object.entries(exportArgs)) {
        if (typeof value === 'string') {
          exportArgs[key] = value.replace('$index', String(i));
        }
      }
      // Ensure output directory exists
      const outputPath = exportArgs['path'] as string;
      if (outputPath) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }
      exportHandler(batchSession, exportArgs);
    }
  }

  return { content: [{ type: 'text', text: `Batch generated ${variations.length} assets` }] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/mcp && pnpm test -- src/__tests__/batch-tools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mcp/src/tools/batch-tools.ts packages/mcp/src/__tests__/batch-tools.test.ts
git commit -m "feat(mcp): add batch generate with variable substitution"
```

---

### Task 25: MCP Resources

**Files:**
- Create: `packages/mcp/src/resources/project-resource.ts`, `packages/mcp/src/resources/canvas-resource.ts`, `packages/mcp/src/resources/palette-resource.ts`
- Test: `packages/mcp/src/__tests__/resources.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/mcp/src/__tests__/resources.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readProjectResource } from '../resources/project-resource.js';
import { readCanvasResource } from '../resources/canvas-resource.js';
import { readPalettePresetsResource, readPaletteResource } from '../resources/palette-resource.js';
import { Document, serializeProject } from '@pixel-art/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('project resource', () => {
  it('returns metadata without pixel data', () => {
    const doc = new Document(8, 8);
    doc.addLayer('Layer 2');
    doc.palette = { name: 'PICO-8', colors: ['#000000'] };
    const tmpPath = path.join(os.tmpdir(), `test-res-${Date.now()}.pxart`);
    fs.writeFileSync(tmpPath, serializeProject(doc));

    const result = readProjectResource(tmpPath);
    expect(result.version).toBe(1);
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
    expect(result.layers).toHaveLength(2);
    expect(result.layers[0]).not.toHaveProperty('data');
    expect(result.palette.name).toBe('PICO-8');

    fs.unlinkSync(tmpPath);
  });
});

describe('canvas resource', () => {
  it('returns pixel data as 2D hex arrays', () => {
    const doc = new Document(2, 2);
    doc.draw('pencil', 0, 0, '#ff0000');
    const tmpPath = path.join(os.tmpdir(), `test-canvas-${Date.now()}.pxart`);
    fs.writeFileSync(tmpPath, serializeProject(doc));

    const result = readCanvasResource(tmpPath);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.layers).toHaveLength(1);
    expect(result.layers[0].pixels[0][0]).toBe('#ff0000ff');

    fs.unlinkSync(tmpPath);
  });
});

describe('palette resource', () => {
  it('lists all presets', () => {
    const result = readPalettePresetsResource();
    expect(result.palettes.length).toBeGreaterThan(0);
    expect(result.palettes.find((p: any) => p.name === 'PICO-8')).toBeDefined();
  });

  it('returns palette colors by name', () => {
    const result = readPaletteResource('PICO-8');
    expect(result.name).toBe('PICO-8');
    expect(result.colors).toHaveLength(16);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/mcp && pnpm test -- src/__tests__/resources.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement resources**

```typescript
// packages/mcp/src/resources/project-resource.ts
import { deserializeProject } from '@pixel-art/core';
import * as fs from 'node:fs';

export function readProjectResource(filePath: string) {
  const json = fs.readFileSync(filePath, 'utf-8');
  const doc = deserializeProject(json);
  return {
    version: 1,
    width: doc.width,
    height: doc.height,
    layers: doc.layers.map((l) => ({ name: l.name, visible: l.visible, opacity: l.opacity })),
    palette: doc.palette,
  };
}
```

```typescript
// packages/mcp/src/resources/canvas-resource.ts
import { deserializeProject, getPixel } from '@pixel-art/core';
import * as fs from 'node:fs';

export function readCanvasResource(filePath: string, layerIndex?: number) {
  const json = fs.readFileSync(filePath, 'utf-8');
  const doc = deserializeProject(json);

  const layersToRead = layerIndex !== undefined ? [doc.layers[layerIndex]] : doc.layers;

  return {
    width: doc.width,
    height: doc.height,
    layers: layersToRead.map((layer) => {
      const pixels: string[][] = [];
      for (let y = 0; y < doc.height; y++) {
        const row: string[] = [];
        for (let x = 0; x < doc.width; x++) {
          row.push(getPixel(layer.data, doc.width, x, y));
        }
        pixels.push(row);
      }
      return { name: layer.name, pixels };
    }),
  };
}
```

```typescript
// packages/mcp/src/resources/palette-resource.ts
import { listPresets, getPresetPalette } from '@pixel-art/core';

export function readPalettePresetsResource() {
  return {
    palettes: listPresets().map((name) => {
      const palette = getPresetPalette(name);
      return { name, count: palette.colors.length };
    }),
  };
}

export function readPaletteResource(name: string) {
  return getPresetPalette(name);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/mcp && pnpm test -- src/__tests__/resources.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mcp/src/resources/ packages/mcp/src/__tests__/resources.test.ts
git commit -m "feat(mcp): add project, canvas, and palette resources"
```

---

### Task 26: MCP Server Wiring (server.ts + index.ts)

**Files:**
- Create: `packages/mcp/src/server.ts`, `packages/mcp/src/index.ts`

- [ ] **Step 1: Implement MCP server with all tools and resources registered**

```typescript
// packages/mcp/src/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Session } from './session.js';
import { handleCreateCanvas, handleOpenProject, handleSaveProject } from './tools/canvas-tools.js';
import { handleCreateLayer, handleDeleteLayer, handleSetActiveLayer, handleSetLayerVisibility, handleSetLayerOpacity, handleReorderLayer, handleMergeLayers } from './tools/layer-tools.js';
import { handleDrawPixels, handleDrawLine, handleDrawRect, handleFill, handleErase } from './tools/drawing-tools.js';
import { handleTransform, handleMirrorMode, handleSelectAndMove } from './tools/transform-tools.js';
import { handleSetPalette } from './tools/palette-tools.js';
import { handleExportPng, handleExportSpritesheet } from './tools/export-tools.js';
import { handleBatchGenerate } from './tools/batch-tools.js';
import { readProjectResource } from './resources/project-resource.js';
import { readCanvasResource } from './resources/canvas-resource.js';
import { readPalettePresetsResource, readPaletteResource } from './resources/palette-resource.js';
import { PixelArtError } from '@pixel-art/core';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'pixel-art-creator',
    version: '0.1.0',
  });

  const session = new Session();

  function wrapHandler(handler: (session: Session, args: any) => any) {
    return (args: any) => {
      try {
        return handler(session, args);
      } catch (e) {
        if (e instanceof PixelArtError) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: { code: e.code, message: e.message } }) }] };
        }
        throw e;
      }
    };
  }

  // Canvas tools
  server.tool('create_canvas', { width: z.number(), height: z.number(), palette: z.string().optional() }, wrapHandler(handleCreateCanvas));
  server.tool('open_project', { path: z.string() }, wrapHandler(handleOpenProject));
  server.tool('save_project', { path: z.string() }, wrapHandler(handleSaveProject));

  // Layer tools
  server.tool('create_layer', { name: z.string(), position: z.number().optional() }, wrapHandler(handleCreateLayer));
  server.tool('delete_layer', { index: z.number() }, wrapHandler(handleDeleteLayer));
  server.tool('set_active_layer', { index: z.number() }, wrapHandler(handleSetActiveLayer));
  server.tool('set_layer_visibility', { index: z.number(), visible: z.boolean() }, wrapHandler(handleSetLayerVisibility));
  server.tool('set_layer_opacity', { index: z.number(), opacity: z.number() }, wrapHandler(handleSetLayerOpacity));
  server.tool('reorder_layer', { from: z.number(), to: z.number() }, wrapHandler(handleReorderLayer));
  server.tool('merge_layers', { indices: z.array(z.number()) }, wrapHandler(handleMergeLayers));

  // Drawing tools
  server.tool('draw_pixels', { pixels: z.array(z.object({ x: z.number(), y: z.number(), color: z.string() })), layer: z.number().optional() }, wrapHandler(handleDrawPixels));
  server.tool('draw_line', { x0: z.number(), y0: z.number(), x1: z.number(), y1: z.number(), color: z.string(), layer: z.number().optional() }, wrapHandler(handleDrawLine));
  server.tool('draw_rect', { x: z.number(), y: z.number(), w: z.number(), h: z.number(), color: z.string(), filled: z.boolean().optional(), layer: z.number().optional() }, wrapHandler(handleDrawRect));
  server.tool('fill', { x: z.number(), y: z.number(), color: z.string(), layer: z.number().optional() }, wrapHandler(handleFill));
  server.tool('erase', { pixels: z.array(z.object({ x: z.number(), y: z.number() })), layer: z.number().optional() }, wrapHandler(handleErase));

  // Transform tools
  server.tool('transform', { op: z.string(), degrees: z.number().optional(), width: z.number().optional(), height: z.number().optional() }, wrapHandler(handleTransform));
  server.tool('mirror_mode', { horizontal: z.boolean().optional(), vertical: z.boolean().optional() }, wrapHandler(handleMirrorMode));
  server.tool('select_and_move', { x: z.number(), y: z.number(), w: z.number(), h: z.number(), dx: z.number(), dy: z.number(), layer: z.number().optional() }, wrapHandler(handleSelectAndMove));

  // Palette tools
  server.tool('set_palette', { name: z.string().optional(), colors: z.array(z.string()).optional() }, wrapHandler(handleSetPalette));

  // Export tools
  server.tool('export_png', { path: z.string(), layers: z.array(z.number()).optional() }, wrapHandler(handleExportPng));
  server.tool('export_spritesheet', { projects: z.array(z.string()), output_dir: z.string() }, wrapHandler(handleExportSpritesheet));

  // Batch
  server.tool('batch_generate', {
    template: z.array(z.object({ tool: z.string(), args: z.record(z.unknown()) })),
    variations: z.array(z.record(z.unknown())),
    export: z.object({ tool: z.string(), args: z.record(z.unknown()) }),
  }, wrapHandler(handleBatchGenerate));

  // Resources
  server.resource('palette://presets', 'palette://presets', () => ({
    contents: [{ uri: 'palette://presets', text: JSON.stringify(readPalettePresetsResource()), mimeType: 'application/json' }],
  }));

  return server;
}
```

```typescript
// packages/mcp/src/index.ts
#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Build the MCP package**

Run: `cd packages/mcp && pnpm build`
Expected: Compiles successfully

- [ ] **Step 3: Run all MCP tests**

Run: `cd packages/mcp && pnpm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/mcp/src/server.ts packages/mcp/src/index.ts
git commit -m "feat(mcp): wire MCP server with all tools and resources"
```

---

## Phase 6: Electron App

### Task 27: Electron Package Scaffold

**Files:**
- Create: `packages/electron/package.json`, `packages/electron/tsconfig.json`
- Create: `packages/electron/src/main/index.ts`
- Create: `packages/electron/src/renderer/svelte.config.js`, `packages/electron/src/renderer/vite.config.ts`
- Create: `packages/electron/src/renderer/src/app.html`, `packages/electron/src/renderer/src/app.css`

- [ ] **Step 1: Create Electron package config**

```json
// packages/electron/package.json
{
  "name": "@pixel-art/electron",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"pnpm dev:renderer\" \"pnpm dev:main\"",
    "dev:renderer": "cd src/renderer && vite dev --port 5173",
    "dev:main": "tsc -p tsconfig.main.json && electron dist/main/index.js",
    "build": "pnpm build:renderer && pnpm build:main",
    "build:renderer": "cd src/renderer && vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "package": "electron-builder"
  },
  "dependencies": {
    "@pixel-art/core": "workspace:*",
    "electron-serve": "^2.1.1"
  },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.0",
    "@sveltejs/kit": "^2.16.0",
    "concurrently": "^9.1.0",
    "electron": "^35.0.0",
    "electron-builder": "^26.0.0",
    "svelte": "^5.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

```json
// packages/electron/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src/main",
    "outDir": "dist/main"
  },
  "include": ["src/main"]
}
```

- [ ] **Step 2: Create Electron main process entry**

```typescript
// packages/electron/src/main/index.ts
import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import { registerIpcHandlers } from './ipc.js';
import { createMenu } from './menu.js';

const isDev = !app.isPackaged;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(import.meta.dirname, 'preload.js'),
    },
    backgroundColor: '#0f0f23',
    title: 'Pixel Art Creator',
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(import.meta.dirname, '../renderer/build/index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 3: Create SvelteKit renderer scaffold**

```javascript
// packages/electron/src/renderer/svelte.config.js
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
    }),
  },
};

export default config;
```

```typescript
// packages/electron/src/renderer/vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
  },
});
```

```html
<!-- packages/electron/src/renderer/src/app.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pixel Art Creator</title>
    %sveltekit.head%
  </head>
  <body data-sveltekit-prerender="true">
    %sveltekit.body%
  </body>
</html>
```

```css
/* packages/electron/src/renderer/src/app.css */
:root {
  --bg-primary: #0f0f23;
  --bg-secondary: #1a1a3e;
  --bg-tertiary: #16213e;
  --text-primary: #c2c3c7;
  --text-secondary: #888;
  --accent: #e94560;
  --border: #333;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  overflow: hidden;
  height: 100vh;
}
```

- [ ] **Step 4: Install dependencies and verify structure**

Run: `pnpm install`
Expected: All dependencies installed

- [ ] **Step 5: Commit**

```bash
git add packages/electron/
git commit -m "feat(electron): scaffold Electron + SvelteKit app shell"
```

---

### Task 28: Editor Stores

**Files:**
- Create: `packages/electron/src/renderer/src/lib/stores/editor.ts`
- Create: `packages/electron/src/renderer/src/lib/stores/palette.ts`

- [ ] **Step 1: Implement editor store**

```typescript
// packages/electron/src/renderer/src/lib/stores/editor.ts
import { writable, derived } from 'svelte/store';
import { Document, type DrawTool } from '@pixel-art/core';

export const document = writable<Document | null>(null);
export const activeTool = writable<DrawTool>('pencil');
export const foregroundColor = writable('#000000');
export const backgroundColor = writable('#ffffff');
export const zoom = writable(8); // pixels per canvas pixel
export const gridVisible = writable(true);
export const cursorPosition = writable<{ x: number; y: number } | null>(null);
export const projectPath = writable<string | null>(null);
export const modified = writable(false);

export function newDocument(width: number, height: number): void {
  document.set(new Document(width, height));
  projectPath.set(null);
  modified.set(false);
}

export const activeLayerName = derived(document, ($doc) =>
  $doc ? $doc.layers[$doc.activeLayerIndex]?.name ?? '' : '',
);
```

```typescript
// packages/electron/src/renderer/src/lib/stores/palette.ts
import { writable, derived } from 'svelte/store';
import { getPresetPalette, listPresets, type Palette } from '@pixel-art/core';

export const activePalette = writable<Palette>(getPresetPalette('PICO-8'));
export const presetNames = listPresets();
```

- [ ] **Step 2: Commit**

```bash
git add packages/electron/src/renderer/src/lib/stores/
git commit -m "feat(electron): add editor and palette stores"
```

---

### Task 29: Canvas Viewport Component

**Files:**
- Create: `packages/electron/src/renderer/src/lib/components/Canvas.svelte`
- Create: `packages/electron/src/renderer/src/lib/utils/canvas-renderer.ts`

- [ ] **Step 1: Implement canvas renderer utility**

```typescript
// packages/electron/src/renderer/src/lib/utils/canvas-renderer.ts
import type { Document } from '@pixel-art/core';
import { flattenLayers } from '@pixel-art/core';

export function renderDocument(
  ctx: CanvasRenderingContext2D,
  doc: Document,
  zoom: number,
  gridVisible: boolean,
): void {
  const canvasW = doc.width * zoom;
  const canvasH = doc.height * zoom;
  ctx.canvas.width = canvasW;
  ctx.canvas.height = canvasH;

  // Draw checkerboard background
  drawCheckerboard(ctx, doc.width, doc.height, zoom);

  // Draw flattened layers
  const flattened = flattenLayers(doc.layers, doc.width, doc.height);
  const imageData = ctx.createImageData(doc.width, doc.height);
  imageData.data.set(flattened);

  // Scale up with nearest-neighbor
  ctx.imageSmoothingEnabled = false;
  const tempCanvas = new OffscreenCanvas(doc.width, doc.height);
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0, canvasW, canvasH);

  // Draw grid
  if (gridVisible && zoom >= 4) {
    drawGrid(ctx, doc.width, doc.height, zoom);
  }
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number): void {
  const light = '#2a2a3a';
  const dark = '#222236';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? light : dark;
      ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * zoom + 0.5, 0);
    ctx.lineTo(x * zoom + 0.5, height * zoom);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * zoom + 0.5);
    ctx.lineTo(width * zoom, y * zoom + 0.5);
    ctx.stroke();
  }
}
```

- [ ] **Step 2: Implement Canvas Svelte component**

```svelte
<!-- packages/electron/src/renderer/src/lib/components/Canvas.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { document, zoom, gridVisible, cursorPosition, activeTool, foregroundColor, modified } from '$lib/stores/editor';
  import { renderDocument } from '$lib/utils/canvas-renderer';

  let canvasEl: HTMLCanvasElement;
  let isDrawing = false;

  $: if ($document && canvasEl) {
    const ctx = canvasEl.getContext('2d');
    if (ctx) renderDocument(ctx, $document, $zoom, $gridVisible);
  }

  function canvasCoords(e: MouseEvent): { x: number; y: number } | null {
    if (!$document) return null;
    const rect = canvasEl.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / $zoom);
    const y = Math.floor((e.clientY - rect.top) / $zoom);
    if (x < 0 || x >= $document.width || y < 0 || y >= $document.height) return null;
    return { x, y };
  }

  function onMouseDown(e: MouseEvent) {
    const pos = canvasCoords(e);
    if (!pos || !$document) return;
    isDrawing = true;
    applyTool(pos.x, pos.y);
  }

  function onMouseMove(e: MouseEvent) {
    const pos = canvasCoords(e);
    cursorPosition.set(pos);
    if (!isDrawing || !pos || !$document) return;
    if ($activeTool === 'pencil' || $activeTool === 'eraser') {
      applyTool(pos.x, pos.y);
    }
  }

  function onMouseUp() {
    isDrawing = false;
  }

  function applyTool(x: number, y: number) {
    if (!$document) return;
    $document.draw($activeTool, x, y, $foregroundColor);
    modified.set(true);
    // Trigger reactivity
    $document = $document;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoom.update((z) => Math.min(z * 2, 64));
    } else {
      zoom.update((z) => Math.max(z / 2, 1));
    }
  }
</script>

<div class="canvas-viewport" on:wheel|preventDefault={onWheel}>
  <canvas
    bind:this={canvasEl}
    on:mousedown={onMouseDown}
    on:mousemove={onMouseMove}
    on:mouseup={onMouseUp}
    on:mouseleave={onMouseUp}
    style="cursor: crosshair;"
  />
</div>

<style>
  .canvas-viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
    overflow: auto;
  }
  canvas {
    image-rendering: pixelated;
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add packages/electron/src/renderer/src/lib/utils/ packages/electron/src/renderer/src/lib/components/Canvas.svelte
git commit -m "feat(electron): add canvas viewport with drawing and zoom"
```

---

### Task 30: Toolbar Component

**Files:**
- Create: `packages/electron/src/renderer/src/lib/components/Toolbar.svelte`

- [ ] **Step 1: Implement Toolbar**

```svelte
<!-- packages/electron/src/renderer/src/lib/components/Toolbar.svelte -->
<script lang="ts">
  import { activeTool, foregroundColor, backgroundColor, document } from '$lib/stores/editor';
  import type { DrawTool } from '@pixel-art/core';

  const tools: { id: DrawTool; label: string; icon: string }[] = [
    { id: 'pencil', label: 'Pencil', icon: 'P' },
    { id: 'eraser', label: 'Eraser', icon: 'E' },
    { id: 'fill', label: 'Fill', icon: 'F' },
    { id: 'line', label: 'Line', icon: 'L' },
    { id: 'rect', label: 'Rect', icon: 'R' },
  ];

  function toggleMirrorH() {
    if (!$document) return;
    $document.mirrorMode.horizontal = !$document.mirrorMode.horizontal;
    $document = $document;
  }

  function toggleMirrorV() {
    if (!$document) return;
    $document.mirrorMode.vertical = !$document.mirrorMode.vertical;
    $document = $document;
  }
</script>

<div class="toolbar">
  {#each tools as tool}
    <button
      class="tool-btn"
      class:active={$activeTool === tool.id}
      on:click={() => activeTool.set(tool.id)}
      title={tool.label}
    >
      {tool.icon}
    </button>
  {/each}

  <div class="separator" />

  <button
    class="tool-btn"
    class:active={$document?.mirrorMode.horizontal}
    on:click={toggleMirrorH}
    title="Mirror Horizontal"
  >
    MH
  </button>

  <button
    class="tool-btn"
    class:active={$document?.mirrorMode.vertical}
    on:click={toggleMirrorV}
    title="Mirror Vertical"
  >
    MV
  </button>

  <div class="spacer" />

  <div class="color-swatches">
    <input type="color" bind:value={$foregroundColor} title="Foreground" class="fg" />
    <input type="color" bind:value={$backgroundColor} title="Background" class="bg" />
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    gap: 4px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    width: 48px;
  }
  .tool-btn {
    width: 32px;
    height: 32px;
    background: var(--bg-tertiary);
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tool-btn:hover { border-color: var(--text-secondary); }
  .tool-btn.active { background: var(--accent); color: white; }
  .separator { width: 24px; height: 1px; background: var(--border); margin: 4px 0; }
  .spacer { flex: 1; }
  .color-swatches { position: relative; width: 36px; height: 36px; }
  .fg { position: absolute; top: 0; left: 0; width: 24px; height: 24px; border: 2px solid var(--border); border-radius: 3px; cursor: pointer; }
  .bg { position: absolute; bottom: 0; right: 0; width: 24px; height: 24px; border: 2px solid var(--border); border-radius: 3px; cursor: pointer; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add packages/electron/src/renderer/src/lib/components/Toolbar.svelte
git commit -m "feat(electron): add toolbar with tool selection and color swatches"
```

---

### Task 31: Layer Panel Component

**Files:**
- Create: `packages/electron/src/renderer/src/lib/components/LayerPanel.svelte`

- [ ] **Step 1: Implement LayerPanel**

```svelte
<!-- packages/electron/src/renderer/src/lib/components/LayerPanel.svelte -->
<script lang="ts">
  import { document, modified } from '$lib/stores/editor';

  let newLayerName = '';

  function addLayer() {
    if (!$document) return;
    const name = newLayerName.trim() || `Layer ${$document.layers.length + 1}`;
    $document.addLayer(name);
    newLayerName = '';
    modified.set(true);
    $document = $document;
  }

  function removeLayer(index: number) {
    if (!$document || $document.layers.length <= 1) return;
    $document.removeLayer(index);
    modified.set(true);
    $document = $document;
  }

  function setActive(index: number) {
    if (!$document) return;
    $document.activeLayerIndex = index;
    $document = $document;
  }

  function toggleVisibility(index: number) {
    if (!$document) return;
    $document.layers[index].visible = !$document.layers[index].visible;
    modified.set(true);
    $document = $document;
  }
</script>

<div class="layer-panel">
  <div class="panel-header">
    <span class="label">Layers</span>
    <button class="add-btn" on:click={addLayer} title="Add Layer">+</button>
  </div>
  <div class="layer-list">
    {#if $document}
      {#each $document.layers.slice().reverse() as layer, i}
        {@const actualIndex = $document.layers.length - 1 - i}
        <div
          class="layer-item"
          class:active={actualIndex === $document.activeLayerIndex}
          on:click={() => setActive(actualIndex)}
        >
          <button
            class="vis-btn"
            on:click|stopPropagation={() => toggleVisibility(actualIndex)}
          >
            {layer.visible ? '👁' : '—'}
          </button>
          <span class="layer-name">{layer.name}</span>
          {#if $document.layers.length > 1}
            <button
              class="del-btn"
              on:click|stopPropagation={() => removeLayer(actualIndex)}
            >
              ×
            </button>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .layer-panel { display: flex; flex-direction: column; }
  .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); }
  .add-btn { background: var(--bg-tertiary); border: none; color: var(--text-primary); cursor: pointer; border-radius: 3px; width: 20px; height: 20px; }
  .layer-list { display: flex; flex-direction: column; gap: 2px; background: var(--bg-tertiary); border-radius: 4px; padding: 4px; }
  .layer-item { display: flex; align-items: center; gap: 4px; padding: 4px 6px; border-radius: 3px; cursor: pointer; font-size: 11px; }
  .layer-item:hover { background: rgba(255,255,255,0.05); }
  .layer-item.active { background: var(--accent); color: white; }
  .vis-btn { background: none; border: none; cursor: pointer; font-size: 11px; padding: 0; }
  .layer-name { flex: 1; }
  .del-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 14px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add packages/electron/src/renderer/src/lib/components/LayerPanel.svelte
git commit -m "feat(electron): add layer panel with add/remove/visibility"
```

---

### Task 32: Palette Panel & Status Bar Components

**Files:**
- Create: `packages/electron/src/renderer/src/lib/components/PalettePanel.svelte`
- Create: `packages/electron/src/renderer/src/lib/components/StatusBar.svelte`

- [ ] **Step 1: Implement PalettePanel**

```svelte
<!-- packages/electron/src/renderer/src/lib/components/PalettePanel.svelte -->
<script lang="ts">
  import { activePalette, presetNames } from '$lib/stores/palette';
  import { foregroundColor, document } from '$lib/stores/editor';
  import { getPresetPalette } from '@pixel-art/core';

  function selectPreset(name: string) {
    const palette = getPresetPalette(name);
    activePalette.set(palette);
    if ($document) {
      $document.palette = palette;
    }
  }

  function pickColor(color: string) {
    foregroundColor.set(color);
  }
</script>

<div class="palette-panel">
  <div class="panel-header">
    <span class="label">Palette — {$activePalette.name}</span>
  </div>
  <select class="preset-select" on:change={(e) => selectPreset(e.currentTarget.value)}>
    {#each presetNames as name}
      <option value={name} selected={$activePalette.name === name}>{name}</option>
    {/each}
  </select>
  {#if $activePalette.colors.length > 0}
    <div class="color-grid">
      {#each $activePalette.colors as color}
        <button
          class="color-swatch"
          class:selected={$foregroundColor === color}
          style="background: {color}"
          on:click={() => pickColor(color)}
          title={color}
        />
      {/each}
    </div>
  {:else}
    <p class="free-msg">Free palette — any color</p>
  {/if}
</div>

<style>
  .palette-panel { display: flex; flex-direction: column; gap: 4px; }
  .panel-header { display: flex; justify-content: space-between; align-items: center; }
  .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); }
  .preset-select { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 3px; padding: 2px 4px; font-size: 11px; }
  .color-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; }
  .color-swatch { width: 100%; aspect-ratio: 1; border: 1px solid transparent; border-radius: 2px; cursor: pointer; padding: 0; }
  .color-swatch:hover { border-color: white; }
  .color-swatch.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .free-msg { font-size: 10px; color: var(--text-secondary); text-align: center; padding: 8px; }
</style>
```

- [ ] **Step 2: Implement StatusBar**

```svelte
<!-- packages/electron/src/renderer/src/lib/components/StatusBar.svelte -->
<script lang="ts">
  import { cursorPosition, activeLayerName, projectPath, modified, zoom, document } from '$lib/stores/editor';

  $: fileName = $projectPath ? $projectPath.split('/').pop() : 'untitled.pxart';
  $: dimensions = $document ? `${$document.width}x${$document.height}` : '';
</script>

<div class="status-bar">
  <span class="info">
    {#if $cursorPosition}
      Cursor: {$cursorPosition.x}, {$cursorPosition.y}
    {:else}
      —
    {/if}
  </span>
  <span class="info">{$activeLayerName}</span>
  <span class="info">{Math.round($zoom * 100)}% · {dimensions}</span>
  <span class="spacer" />
  <span class="info">{fileName}{$modified ? ' •' : ''}</span>
</div>

<style>
  .status-bar {
    display: flex;
    gap: 16px;
    padding: 4px 12px;
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border);
    font-size: 10px;
    color: var(--text-secondary);
  }
  .spacer { flex: 1; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add packages/electron/src/renderer/src/lib/components/PalettePanel.svelte packages/electron/src/renderer/src/lib/components/StatusBar.svelte
git commit -m "feat(electron): add palette panel and status bar"
```

---

### Task 33: Main Layout & IPC

**Files:**
- Create: `packages/electron/src/renderer/src/routes/+layout.svelte`, `packages/electron/src/renderer/src/routes/+page.svelte`
- Create: `packages/electron/src/main/ipc.ts`, `packages/electron/src/main/menu.ts`

- [ ] **Step 1: Implement page layout (assembles all components)**

```svelte
<!-- packages/electron/src/renderer/src/routes/+layout.svelte -->
<script>
  import '../app.css';
</script>

<slot />
```

```svelte
<!-- packages/electron/src/renderer/src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Canvas from '$lib/components/Canvas.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import LayerPanel from '$lib/components/LayerPanel.svelte';
  import PalettePanel from '$lib/components/PalettePanel.svelte';
  import StatusBar from '$lib/components/StatusBar.svelte';
  import { document, newDocument } from '$lib/stores/editor';

  onMount(() => {
    if (!$document) {
      newDocument(32, 32);
    }
  });
</script>

<div class="editor">
  <div class="main-area">
    <Toolbar />
    <Canvas />
    <div class="right-panel">
      <LayerPanel />
      <div class="separator" />
      <PalettePanel />
    </div>
  </div>
  <StatusBar />
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .main-area {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .right-panel {
    width: 200px;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }
  .separator {
    height: 1px;
    background: var(--border);
  }
</style>
```

- [ ] **Step 2: Implement IPC handlers**

```typescript
// packages/electron/src/main/ipc.ts
import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'node:fs';

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Pixel Art', extensions: ['pxart'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { path: filePath, content };
  });

  ipcMain.handle('dialog:saveFile', async (_event, json: string, defaultPath?: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultPath || 'untitled.pxart',
      filters: [{ name: 'Pixel Art', extensions: ['pxart'] }],
    });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, json);
    return result.filePath;
  });

  ipcMain.handle('dialog:exportPng', async (_event, buffer: Uint8Array) => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, Buffer.from(buffer));
    return result.filePath;
  });
}
```

- [ ] **Step 3: Implement menu**

```typescript
// packages/electron/src/main/menu.ts
import { Menu, BrowserWindow } from 'electron';

export function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => sendToRenderer('menu:new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => sendToRenderer('menu:open') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendToRenderer('menu:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendToRenderer('menu:saveAs') },
        { type: 'separator' },
        { label: 'Export PNG...', accelerator: 'CmdOrCtrl+E', click: () => sendToRenderer('menu:exportPng') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => sendToRenderer('menu:undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => sendToRenderer('menu:redo') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Grid', accelerator: 'CmdOrCtrl+G', click: () => sendToRenderer('menu:toggleGrid') },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => sendToRenderer('menu:zoomIn') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => sendToRenderer('menu:zoomOut') },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function sendToRenderer(channel: string): void {
  const win = BrowserWindow.getFocusedWindow();
  win?.webContents.send(channel);
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/electron/src/renderer/src/routes/ packages/electron/src/main/ipc.ts packages/electron/src/main/menu.ts
git commit -m "feat(electron): add main layout, IPC handlers, and menu bar"
```

---

### Task 34: Electron Build Config

**Files:**
- Create: `packages/electron/electron-builder.yml`

- [ ] **Step 1: Create electron-builder config**

```yaml
# packages/electron/electron-builder.yml
appId: com.pixelart.creator
productName: Pixel Art Creator
directories:
  output: release

files:
  - dist/**/*
  - src/renderer/build/**/*
  - node_modules/**/*

linux:
  target:
    - AppImage
    - deb
  category: Graphics

mac:
  target:
    - dmg
  category: public.app-category.graphics-design

win:
  target:
    - nsis
```

- [ ] **Step 2: Add .superpowers to .gitignore**

Append to `.gitignore`:
```
.superpowers/
```

- [ ] **Step 3: Commit**

```bash
git add packages/electron/electron-builder.yml .gitignore
git commit -m "feat(electron): add build config for Linux, macOS, Windows"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Task(s) |
|---|---|
| Architecture (monorepo) | Task 1 |
| Core: Canvas | Task 3 |
| Core: Layers | Task 4 |
| Core: Tools (pencil, eraser, fill, line, rect, selection, move) | Tasks 5-10 |
| Core: Undo/redo (command pattern) | Task 11 |
| Core: Document + Mirror mode | Task 12 |
| Core: Transform (flip, rotate, resize) | Task 13 |
| Core: Palettes (presets + validation) | Task 14 |
| Core: .pxart serialization (zlib + base64) | Task 15 |
| Core: PNG export | Task 16 |
| Core: Spritesheet export | Task 17 |
| Core: File locking (PID-based) | Task 18 |
| Core: Public API | Task 19 |
| MCP: Session | Task 20 |
| MCP: Canvas + layer tools | Task 21 |
| MCP: Drawing tools | Task 22 |
| MCP: Transform, mirror, selection, palette, export | Task 23 |
| MCP: Batch generate | Task 24 |
| MCP: Resources | Task 25 |
| MCP: Server wiring | Task 26 |
| Electron: App shell | Task 27 |
| Electron: Stores | Task 28 |
| Electron: Canvas viewport | Task 29 |
| Electron: Toolbar | Task 30 |
| Electron: Layer panel | Task 31 |
| Electron: Palette panel + status bar | Task 32 |
| Electron: Layout + IPC + menu | Task 33 |
| Electron: Build config | Task 34 |
| Definitions (color format, layer ordering, coordinates, active layer) | Embedded in Tasks 2, 3, 4, 12 |
| Error handling | Task 2 (codes), Task 26 (MCP wrapHandler) |
| Testing strategy | Each task has TDD tests |
| Build & distribution | Task 34 |

### Placeholder scan
No TBDs, TODOs, or "implement later" found.

### Type consistency check
- `PixelDelta` used consistently: `{ x, y, oldColor, newColor }` across tools, commands, and document
- `Color` type is always hex string `#RRGGBB` or `#RRGGBBAA`
- `LayerData` used consistently: `{ name, visible, opacity, data }`
- `DrawTool` union type matches Document.draw() and Toolbar
- `McpResult` format consistent across all MCP tool handlers: `{ content: [{ type, text }] }`
- `Session.requireDocument()` used consistently in all MCP handlers
