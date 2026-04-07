# Pixel Art Creator — Design Spec

## Overview

Desktop platform for creating pixel art assets for games. Targets indie developers who need to create assets quickly. Includes an MCP server so AI agents can create, edit, view, and export assets programmatically.

## Architecture

Monorepo with 3 packages managed by pnpm workspaces:

```
pixel-art-creator/
├── packages/
│   ├── core/          # Pure TypeScript engine — zero UI deps
│   ├── electron/      # Desktop app: SvelteKit + Electron
│   └── mcp/           # Standalone MCP server (stdio/SSE)
├── docs/
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

### `@pixel-art/core`

All business logic lives here. No side-effects — receives state, returns new state.

- Canvas: grid of pixels, arbitrary user-defined dimensions (no fixed limit)
- Layer system: create, reorder, merge, visibility, opacity
- Tools: pencil, eraser, fill, line, rect, selection, move, mirror
- Color picker + palette system (presets + custom)
- Undo/redo via command pattern
- Serialization: `.pxart` project format and export (PNG, spritesheet + JSON atlas)

### `@pixel-art/electron`

Desktop app consuming the core library.

- SvelteKit running in Electron renderer process
- Canvas rendered via HTML5 Canvas 2D API
- Layout: classic (vertical toolbar left, canvas center, layers + palette panel right)
- Menu bar, status bar with cursor position and project info
- File system access via Electron APIs
- IPC bridge between renderer and main process

### `@pixel-art/mcp`

Standalone MCP server for AI agent access. Imports `@pixel-art/core` directly. Operates headless — no Electron dependency.

- Transport: stdio (default, for Claude Desktop) + SSE (for web integrations)

### Inter-package Communication

No direct communication between electron and mcp. Both consume core and operate on `.pxart` files on the filesystem. Simple file locking (`.lock` file) prevents write conflicts. Lock considered stale after 30 seconds.

## Data Model

### Canvas / Pixel Data

- Each layer is a `Uint8ClampedArray` (RGBA, 4 bytes per pixel)
- Coordinates: `(x, y)` → index `(y * width + x) * 4`
- Arbitrary dimensions defined by user

### Project Format (`.pxart`)

```json
{
  "version": 1,
  "width": 32,
  "height": 32,
  "layers": [
    {
      "name": "Background",
      "visible": true,
      "opacity": 1.0,
      "data": "<base64 encoded RGBA>"
    }
  ],
  "palette": {
    "name": "PICO-8",
    "colors": ["#000000", "#1D2B53", "..."]
  },
  "metadata": {
    "createdAt": "2026-04-07T00:00:00Z",
    "modifiedAt": "2026-04-07T00:00:00Z"
  }
}
```

Single JSON file. Pixel data per layer encoded as base64 (raw RGBA). Versioned for future migrations.

### Undo/Redo — Command Pattern

- Each action (draw, fill, layer change) is a `Command` with `execute()` and `undo()`
- Undo/redo stack on the `Document` (configurable limit, default 100)
- Commands store only the delta (changed pixels), not the full state

### Tools as Pure Functions

```typescript
pencil(canvas, x, y, color) → PixelDelta[]
fill(canvas, x, y, color) → PixelDelta[]
line(canvas, x0, y0, x1, y1, color) → PixelDelta[]
rect(canvas, x, y, w, h, color, filled?) → PixelDelta[]
```

Each tool returns the list of changed pixels. The caller decides whether to apply and create the Command.

## Editor Layout

Classic layout:

- **Menu bar** (top): File, Edit, View, Tools, Help
- **Toolbar** (left, vertical): pencil, eraser, fill, line, rect, selection, mirror, foreground/background color swatch
- **Canvas viewport** (center): checkerboard background, zoom/pan, grid overlay
- **Right panel**: Layers section, Palette section (with preset selector), 1x Preview
- **Status bar** (bottom): cursor coordinates, project filename, modified indicator

## MCP Server API

### Tools (state-modifying operations)

| Tool | Args | Description |
|------|------|-------------|
| `create_canvas` | `width, height, palette?` | Create new project |
| `draw_pixels` | `pixels: [{x, y, color}]` | Draw pixels at coordinates |
| `draw_line` | `x0, y0, x1, y1, color` | Line between two points |
| `draw_rect` | `x, y, w, h, color, filled?` | Rectangle |
| `fill` | `x, y, color` | Flood fill from point |
| `create_layer` | `name, position?` | Create layer |
| `merge_layers` | `indices[]` | Merge layers by index |
| `set_layer_visibility` | `index, visible` | Toggle layer visibility |
| `set_palette` | `name \| colors[]` | Set active palette |
| `transform` | `op: flip_h\|flip_v\|rotate\|resize, ...` | Transform canvas |
| `mirror_mode` | `horizontal?, vertical?` | Toggle mirror drawing |
| `export_png` | `path, layers?` | Export as PNG (flatten visible layers) |
| `export_spritesheet` | `projects[], output_dir` | Export atlas + JSON descriptor |
| `save_project` | `path` | Save as `.pxart` |
| `batch_generate` | `template, variations, export` | Execute operation sequence with variable substitution |

### Resources (read-only)

| Resource | Description |
|----------|-------------|
| `project://{path}` | Read `.pxart` metadata (dimensions, layers, palette) |
| `canvas://{path}` | Read pixel data as color grid |
| `palette://presets` | List available preset palettes |
| `palette://{name}` | Get colors for a specific palette |

### Batch Generate

Receives an operation template + variable parameters:

```json
{
  "template": [
    {"tool": "create_canvas", "args": {"width": 16, "height": 16}},
    {"tool": "set_palette", "args": {"name": "$palette"}},
    {"tool": "draw_pixels", "args": {"pixels": "$pixels"}}
  ],
  "variations": [
    {"$palette": "pico-8", "$pixels": [{"x":0,"y":0,"color":"#ff0000"}]},
    {"$palette": "gameboy", "$pixels": [{"x":0,"y":0,"color":"#00ff00"}]}
  ],
  "export": {"format": "png", "output_dir": "./output"}
}
```

## Export Formats

### PNG

- Flatten all visible layers (respecting opacity)
- 1:1 scale (pixel = pixel, no upscale)
- RGBA transparency preserved

### Spritesheet

- Input: list of `.pxart` projects or multiple frames
- Output: PNG atlas + JSON descriptor
- JSON format:

```json
{
  "frames": {
    "player_idle.png": {
      "frame": {"x": 0, "y": 0, "w": 16, "h": 16},
      "sourceSize": {"w": 16, "h": 16}
    }
  },
  "meta": {
    "size": {"w": 32, "h": 16},
    "format": "RGBA8888"
  }
}
```

- Packing: simple row-based in v1

## Palettes

Preset palettes included:

- PICO-8 (16 colors)
- GameBoy (4 colors)
- NES (54 colors)
- Endesga 32
- Endesga 64
- Free palette (no restriction)

Users can also create, save, and import custom palettes.

## Tech Stack

### Monorepo

- pnpm workspaces
- TypeScript 5.x with shared `tsconfig.base.json`
- Vitest for tests across all packages
- ESLint + Prettier

### `@pixel-art/core`

- Zero runtime dependencies (pure TS)
- `pngjs` for PNG encode/decode (only dep)

### `@pixel-art/electron`

- SvelteKit (adapter-static, renders in Electron)
- Electron (latest stable)
- `electron-builder` for packaging/distribution
- HTML5 Canvas 2D API for rendering
- Svelte stores for reactive state

### `@pixel-art/mcp`

- `@modelcontextprotocol/sdk` for MCP server
- Transport: stdio (default) + SSE
- Imports `@pixel-art/core` as workspace dependency
