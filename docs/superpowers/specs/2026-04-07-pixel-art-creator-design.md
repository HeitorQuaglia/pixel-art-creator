# Pixel Art Creator — Design Spec

## Overview

Desktop platform for creating pixel art assets for games. Targets indie developers who need to create assets quickly. Includes an MCP server so AI agents can create, edit, view, and export assets programmatically.

## Definitions

- **Color format:** Canonical representation is hex string. `#RRGGBB` for opaque colors, `#RRGGBBAA` for colors with alpha. All core functions, MCP tools, and project files use this format exclusively.
- **Layer ordering:** Index 0 is the bottom-most layer (rendered first). Higher indices are rendered on top.
- **Coordinate origin:** `(0, 0)` is the top-left pixel of the canvas. X increases rightward, Y increases downward.
- **Active layer:** Both Electron and MCP maintain an active layer index. All drawing operations target the active layer unless a `layer` parameter is explicitly provided.

## Architecture

Monorepo with 3 packages managed by pnpm workspaces:

```
pixel-art-creator/
├── packages/
│   ├── core/          # Pure TypeScript engine — minimal deps
│   ├── electron/      # Desktop app: SvelteKit + Electron
│   └── mcp/           # Standalone MCP server (stdio/SSE)
├── docs/
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

### `@pixel-art/core`

All business logic lives here. No side-effects — receives state, returns new state.

- Canvas: grid of pixels, user-defined dimensions (recommended max 1024x1024, hard limit 4096x4096 to prevent OOM — a 4096x4096 layer is 64MB)
- Layer system: create, reorder, merge, visibility, opacity
- Tools: pencil, eraser, fill, line, rect, selection, move, mirror
- Color picker + palette system (presets + custom)
- Undo/redo via command pattern
- Serialization: `.pxart` project format and export (PNG, spritesheet + JSON atlas)

### `@pixel-art/electron`

Desktop app consuming the core library.

- SvelteKit running in Electron renderer process (adapter-static, served via `file://` protocol in production; local dev server with HMR in development)
- Canvas rendered via HTML5 Canvas 2D API
- Layout: classic (vertical toolbar left, canvas center, layers + palette panel right)
- Menu bar, status bar with cursor position and project info
- File system access via Electron APIs
- IPC bridge between renderer and main process

### `@pixel-art/mcp`

Standalone MCP server for AI agent access. Imports `@pixel-art/core` directly. Operates headless — no Electron dependency.

- Transport: stdio (default, for Claude Desktop) + SSE (for web integrations)
- Maintains an in-memory `Document` per session with an active layer index
- Projects are loaded from and saved to `.pxart` files on disk

### Inter-package Communication

No direct communication between electron and mcp. Both consume core and operate on `.pxart` files on the filesystem.

**File locking:** Advisory lock via `.lock` file alongside the `.pxart` file. The lock file contains the PID of the locking process and a timestamp. Staleness detection: if the PID is no longer running, the lock is immediately reclaimed (no timeout needed). Fallback: if PID check is unavailable (cross-platform edge case), lock is considered stale after 30 seconds. On Windows, uses the same file-based approach — PID check works cross-platform via `process.kill(pid, 0)`.

## Data Model

### Canvas / Pixel Data

- Each layer is a `Uint8ClampedArray` (RGBA, 4 bytes per pixel)
- Coordinates: `(x, y)` → index `(y * width + x) * 4`
- User-defined dimensions, hard limit 4096x4096

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
      "data": "<zlib-compressed RGBA, then base64 encoded>"
    }
  ],
  "palette": {
    "name": "PICO-8",
    "colors": ["#000000", "#1D2B53", "#7E2553"]
  },
  "metadata": {
    "createdAt": "2026-04-07T00:00:00Z",
    "modifiedAt": "2026-04-07T00:00:00Z"
  }
}
```

Single JSON file. Pixel data per layer is zlib-compressed before base64 encoding (reduces a 128x128 layer from ~87KB to ~5-15KB depending on content). Versioned for future migrations.

**Version migration:** On load, the core checks `version` and runs sequential migration functions (`v1_to_v2`, `v2_to_v3`, etc.) if needed. The file is not rewritten automatically — migration happens in memory, and a save writes the latest version.

### Undo/Redo — Command Pattern

- Each action (draw, fill, layer change) is a `Command` with `execute()` and `undo()`
- Undo/redo stack on the `Document` (configurable limit, default 100)
- Commands store only the delta (changed pixels), not the full state

### Tools as Pure Functions

```typescript
pencil(layer, x, y, color) → PixelDelta[]
eraser(layer, x, y) → PixelDelta[]           // sets pixel to transparent (#00000000)
fill(layer, x, y, color) → PixelDelta[]
line(layer, x0, y0, x1, y1, color) → PixelDelta[]
rect(layer, x, y, w, h, color, filled?) → PixelDelta[]
select(layer, x, y, w, h) → Selection         // rectangular selection, returns pixel data + bounds
move(layer, selection, dx, dy) → PixelDelta[]  // move selection content by offset
```

Each tool returns the list of changed pixels. The caller decides whether to apply and create the Command.

**Mirror mode** is modal state on the `Document`, not a standalone tool. When enabled (horizontal, vertical, or both), drawing tools automatically produce mirrored `PixelDelta[]` in addition to the primary stroke. The tool functions themselves are unaware of mirroring — the `Document` layer handles duplication.

## Editor Layout

Classic layout:

- **Menu bar** (top): File, Edit, View, Tools, Help
- **Toolbar** (left, vertical): pencil, eraser, fill, line, rect, selection, move, mirror toggle, foreground/background color swatch
- **Canvas viewport** (center): checkerboard background, zoom/pan, grid overlay
- **Right panel**: Layers section, Palette section (with preset selector), 1x Preview
- **Status bar** (bottom): cursor coordinates, active layer name, project filename, modified indicator

## MCP Server API

### Tools (state-modifying operations)

All drawing tools target the active layer by default. Pass `layer?` (index) to target a specific layer.

| Tool | Args | Description |
|------|------|-------------|
| `create_canvas` | `width, height, palette?` | Create new project. Default palette: Free (no restriction) |
| `open_project` | `path` | Load a `.pxart` file into the session |
| `set_active_layer` | `index` | Set which layer receives drawing operations |
| `draw_pixels` | `pixels: [{x, y, color}], layer?` | Draw pixels at coordinates |
| `draw_line` | `x0, y0, x1, y1, color, layer?` | Line between two points |
| `draw_rect` | `x, y, w, h, color, filled?, layer?` | Rectangle |
| `fill` | `x, y, color, layer?` | Flood fill from point |
| `erase` | `pixels: [{x, y}], layer?` | Set pixels to transparent |
| `select_and_move` | `x, y, w, h, dx, dy, layer?` | Select rectangle and move contents by offset |
| `create_layer` | `name, position?` | Create layer (position: index, default on top) |
| `delete_layer` | `index` | Delete layer by index |
| `reorder_layer` | `from, to` | Move layer from one index to another |
| `merge_layers` | `indices[]` | Merge layers by index (result at lowest index) |
| `set_layer_visibility` | `index, visible` | Toggle layer visibility |
| `set_layer_opacity` | `index, opacity` | Set layer opacity (0.0 to 1.0) |
| `set_palette` | `name \| colors[]` | Set active palette (preset name or array of hex colors) |
| `transform` | `op, ...args` | See Transform operations below |
| `mirror_mode` | `horizontal?, vertical?` | Toggle mirror drawing mode |
| `export_png` | `path, layers?` | Export as PNG. `layers`: array of layer indices to include (default: all visible) |
| `export_spritesheet` | `projects[], output_dir` | Export multiple `.pxart` files as atlas + JSON descriptor |
| `save_project` | `path` | Save current session as `.pxart` |
| `batch_generate` | `template, variations, export` | Execute operation sequence with variable substitution |

**Transform operations:**

| Op | Args | Description |
|----|------|-------------|
| `flip_h` | — | Flip horizontally |
| `flip_v` | — | Flip vertically |
| `rotate` | `degrees: 90 \| 180 \| 270` | Rotate in 90-degree increments only |
| `resize` | `width, height` | Resize canvas. Nearest-neighbor interpolation. Existing pixel data is anchored at top-left |

### Resources (read-only)

| Resource | Response | Description |
|----------|----------|-------------|
| `project://{path}` | `{ version, width, height, layers: [{ name, visible, opacity }], palette }` | Project metadata. Excludes pixel data |
| `canvas://{path}` | `{ width, height, layers: [{ name, pixels: string[][] }] }` | Pixel data as 2D array of hex color strings per layer. For canvases > 128x128, returns the flattened composite only. Pass `?layer=N` to get a specific layer |
| `palette://presets` | `{ palettes: [{ name, count }] }` | List available preset palettes |
| `palette://{name}` | `{ name, colors: string[] }` | Get hex colors for a specific palette |

### Batch Generate

Receives an operation template with `$variable` placeholders, plus a list of variations. Variables are substituted by exact key match at the top level of each `args` object — no nesting, no cross-references between variables. Type must match: if the template expects an array, the variation must provide an array.

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
  "export": {"tool": "export_png", "args": {"path": "./output/$index.png"}}
}
```

The `export` field calls an existing export tool per variation. `$index` (0-based) is automatically available.

### Error Handling

All MCP tools return structured errors:

```json
{
  "error": {
    "code": "OUT_OF_BOUNDS",
    "message": "Pixel (35, 10) is outside canvas bounds (32, 32)"
  }
}
```

Error codes: `OUT_OF_BOUNDS`, `INVALID_LAYER_INDEX`, `INVALID_COLOR_FORMAT`, `FILE_NOT_FOUND`, `FILE_LOCKED`, `CANVAS_TOO_LARGE`, `INVALID_ARGS`.

Core functions throw typed errors (`PixelArtError` with `code` and `message`). The MCP server catches and maps them to the structured response format. The Electron app catches and shows user-facing error dialogs.

## Export Formats

### PNG

- Flatten all visible layers (respecting opacity)
- 1:1 scale (pixel = pixel, no upscale)
- RGBA transparency preserved

### Spritesheet

- Input: list of `.pxart` project file paths
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

- Packing: simple row-based in v1 (bin-packing planned for v2)

### Out of Scope for v1

- **Animation / frames:** No frame timeline, onion skinning, or frame-based export. Spritesheets are composed from separate `.pxart` files. Animation support is planned for v2.

## Palettes

Preset palettes included:

- PICO-8 (16 colors)
- GameBoy (4 colors)
- NES (54 colors)
- Endesga 32
- Endesga 64
- Free palette (no restriction) — this is the default when no palette is specified

Users can create, save, and import custom palettes. Custom palettes are stored as JSON files in a `palettes/` directory inside the user's app data folder (`electron.app.getPath('userData')/palettes/`). Format:

```json
{
  "name": "My Palette",
  "colors": ["#1a1c2c", "#5d275d", "#b13e53"]
}
```

The MCP server reads custom palettes from a configurable `--palettes-dir` path (defaults to `./palettes/` relative to the working directory).

## Tech Stack

### Monorepo

- pnpm workspaces
- TypeScript 5.x with shared `tsconfig.base.json`
- Vitest for tests across all packages
- ESLint + Prettier

### `@pixel-art/core`

- Minimal runtime dependencies (pure TS)
- `pngjs` for PNG encode/decode
- `pako` (or Node.js `zlib`) for zlib compression of pixel data

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

## Testing Strategy

### `@pixel-art/core`

Unit tests for every tool function (pencil, eraser, fill, line, rect, select, move) — verify returned `PixelDelta[]` for known inputs. Unit tests for undo/redo (apply command, undo, verify state restored). Unit tests for serialization (save `.pxart`, load, compare). Unit tests for PNG export (flatten layers, verify output). Unit tests for palette management.

### `@pixel-art/mcp`

Integration tests: spin up MCP server in-process, call each tool via the SDK, verify responses. Test error cases: out of bounds, invalid args, file not found. Test batch_generate with a small template.

### `@pixel-art/electron`

Component tests for Svelte UI components (toolbar, layer panel, palette panel) using `@testing-library/svelte`. E2E tests deferred to v2.

## Build and Distribution

Target platforms: Linux, macOS, Windows.

`electron-builder` configuration:

- **Linux:** AppImage + .deb
- **macOS:** .dmg (code signing and notarization deferred to v2)
- **Windows:** NSIS installer (code signing deferred to v2)

Auto-update deferred to v2.
