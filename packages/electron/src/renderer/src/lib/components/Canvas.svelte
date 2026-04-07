<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { document, activeTool, foregroundColor, zoom, gridVisible, cursorPosition, modified } from '$lib/stores/editor';
  import { renderDocument } from '$lib/utils/canvas-renderer';

  let canvasEl: HTMLCanvasElement;
  let isDrawing = false;
  let lastX = -1;
  let lastY = -1;
  let lineStartX = -1;
  let lineStartY = -1;

  function getPixelCoords(e: MouseEvent): { x: number; y: number } | null {
    const doc = get(document);
    const z = get(zoom);
    if (!doc || !canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / z);
    const y = Math.floor((e.clientY - rect.top) / z);
    if (x < 0 || x >= doc.width || y < 0 || y >= doc.height) return null;
    return { x, y };
  }

  function render() {
    const doc = get(document);
    const z = get(zoom);
    const gv = get(gridVisible);
    if (!doc || !canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    renderDocument(ctx, doc, z, gv);
  }

  function handleMouseDown(e: MouseEvent) {
    const coords = getPixelCoords(e);
    if (!coords) return;
    isDrawing = true;
    const doc = get(document);
    const tool = get(activeTool);
    const color = get(foregroundColor);
    if (!doc) return;

    if (tool === 'line' || tool === 'rect') {
      lineStartX = coords.x;
      lineStartY = coords.y;
    } else {
      doc.draw(tool, coords.x, coords.y, color);
      modified.set(true);
      document.set(doc);
      render();
    }
    lastX = coords.x;
    lastY = coords.y;
  }

  function handleMouseMove(e: MouseEvent) {
    const coords = getPixelCoords(e);
    if (coords) {
      cursorPosition.set(coords);
    } else {
      cursorPosition.set(null);
    }

    if (!isDrawing || !coords) return;
    if (coords.x === lastX && coords.y === lastY) return;

    const doc = get(document);
    const tool = get(activeTool);
    const color = get(foregroundColor);
    if (!doc) return;

    if (tool === 'pencil' || tool === 'eraser') {
      doc.draw(tool, coords.x, coords.y, color);
      modified.set(true);
      document.set(doc);
      render();
    }

    lastX = coords.x;
    lastY = coords.y;
  }

  function handleMouseUp(e: MouseEvent) {
    if (!isDrawing) return;
    isDrawing = false;

    const coords = getPixelCoords(e);
    const doc = get(document);
    const tool = get(activeTool);
    const color = get(foregroundColor);
    if (!doc) return;

    if ((tool === 'line' || tool === 'rect') && lineStartX >= 0) {
      const endX = coords ? coords.x : lastX;
      const endY = coords ? coords.y : lastY;
      if (tool === 'line') {
        doc.draw('line', lineStartX, lineStartY, color, endX, endY);
      } else {
        doc.draw('rect', lineStartX, lineStartY, color, endX, endY, false);
      }
      modified.set(true);
      document.set(doc);
      render();
      lineStartX = -1;
      lineStartY = -1;
    } else if (tool === 'fill') {
      if (coords) {
        doc.draw('fill', coords.x, coords.y, color);
        modified.set(true);
        document.set(doc);
        render();
      }
    }

    lastX = -1;
    lastY = -1;
  }

  function handleMouseLeave() {
    cursorPosition.set(null);
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    zoom.update((z) => {
      const delta = e.deltaY < 0 ? 1 : -1;
      return Math.max(1, Math.min(32, z + delta));
    });
  }

  const unsubscribers: Array<() => void> = [];

  onMount(() => {
    unsubscribers.push(
      document.subscribe(() => render()),
      zoom.subscribe(() => render()),
      gridVisible.subscribe(() => render()),
    );
  });

  onDestroy(() => {
    unsubscribers.forEach((u) => u());
  });
</script>

<div class="canvas-viewport">
  <div class="canvas-scroll">
    <canvas
      bind:this={canvasEl}
      on:mousedown={handleMouseDown}
      on:mousemove={handleMouseMove}
      on:mouseup={handleMouseUp}
      on:mouseleave={handleMouseLeave}
      on:wheel={handleWheel}
      style="cursor: crosshair;"
    ></canvas>
  </div>
</div>

<style>
  .canvas-viewport {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
    min-width: 0;
  }
  .canvas-scroll {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  canvas {
    display: block;
    image-rendering: pixelated;
    box-shadow: 0 0 0 1px var(--border), 0 4px 24px rgba(0,0,0,0.5);
  }
</style>
