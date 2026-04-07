<script lang="ts">
  import { activeTool, foregroundColor, backgroundColor, document, modified } from '$lib/stores/editor';
  import type { DrawTool } from '@pixel-art/core';

  const tools: { id: DrawTool; label: string; title: string }[] = [
    { id: 'pencil', label: 'P', title: 'Pencil' },
    { id: 'eraser', label: 'E', title: 'Eraser' },
    { id: 'fill',   label: 'F', title: 'Fill' },
    { id: 'line',   label: 'L', title: 'Line' },
    { id: 'rect',   label: 'R', title: 'Rectangle' },
  ];

  function setTool(tool: DrawTool) {
    activeTool.set(tool);
  }

  function toggleMirrorH() {
    document.update((doc) => {
      if (doc) {
        doc.mirrorMode = { ...doc.mirrorMode, horizontal: !doc.mirrorMode.horizontal };
        modified.set(true);
      }
      return doc;
    });
  }

  function toggleMirrorV() {
    document.update((doc) => {
      if (doc) {
        doc.mirrorMode = { ...doc.mirrorMode, vertical: !doc.mirrorMode.vertical };
        modified.set(true);
      }
      return doc;
    });
  }

  function swapColors() {
    foregroundColor.update((fg) => {
      backgroundColor.update((bg) => {
        foregroundColor.set(bg);
        return fg;
      });
      return fg;
    });
  }

  $: mirrorH = $document?.mirrorMode?.horizontal ?? false;
  $: mirrorV = $document?.mirrorMode?.vertical ?? false;
</script>

<div class="toolbar">
  <div class="tool-group">
    {#each tools as tool}
      <button
        class="tool-btn"
        class:active={$activeTool === tool.id}
        title={tool.title}
        on:click={() => setTool(tool.id)}
      >
        {tool.label}
      </button>
    {/each}
  </div>

  <div class="separator"></div>

  <div class="tool-group">
    <button
      class="tool-btn"
      class:active={mirrorH}
      title="Mirror Horizontal"
      on:click={toggleMirrorH}
    >
      MH
    </button>
    <button
      class="tool-btn"
      class:active={mirrorV}
      title="Mirror Vertical"
      on:click={toggleMirrorV}
    >
      MV
    </button>
  </div>

  <div class="separator"></div>

  <div class="color-section">
    <div class="color-stack" title="Click to swap colors" on:click={swapColors} on:keydown role="button" tabindex="0">
      <div class="color-swatch bg-swatch" style="background: {$backgroundColor}"></div>
      <div class="color-swatch fg-swatch" style="background: {$foregroundColor}"></div>
    </div>
    <div class="color-inputs">
      <label class="color-label" title="Foreground">
        <span>FG</span>
        <input type="color" bind:value={$foregroundColor} />
      </label>
      <label class="color-label" title="Background">
        <span>BG</span>
        <input type="color" bind:value={$backgroundColor} />
      </label>
    </div>
  </div>
</div>

<style>
  .toolbar {
    width: 48px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px;
    gap: 4px;
    overflow-y: auto;
    flex-shrink: 0;
  }
  .tool-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
  }
  .tool-btn {
    width: 36px;
    height: 32px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tool-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border);
  }
  .tool-btn.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .separator {
    width: 80%;
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }
  .color-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
  }
  .color-stack {
    position: relative;
    width: 32px;
    height: 32px;
    cursor: pointer;
  }
  .color-swatch {
    position: absolute;
    width: 22px;
    height: 22px;
    border: 1px solid var(--border);
    border-radius: 2px;
  }
  .bg-swatch {
    bottom: 0;
    right: 0;
  }
  .fg-swatch {
    top: 0;
    left: 0;
  }
  .color-inputs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    align-items: center;
  }
  .color-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 9px;
    color: var(--text-secondary);
    cursor: pointer;
  }
  .color-label input[type="color"] {
    width: 28px;
    height: 20px;
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 0;
    cursor: pointer;
    background: none;
  }
</style>
