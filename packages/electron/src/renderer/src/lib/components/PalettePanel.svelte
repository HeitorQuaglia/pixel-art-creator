<script lang="ts">
  import { activePalette, presetNames } from '$lib/stores/palette';
  import { foregroundColor } from '$lib/stores/editor';
  import { getPresetPalette } from '@pixel-art/core';

  let selectedPreset = 'PICO-8';

  function onPresetChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    selectedPreset = select.value;
    activePalette.set(getPresetPalette(selectedPreset));
  }

  function pickColor(color: string) {
    foregroundColor.set(color);
  }
</script>

<div class="palette-panel">
  <div class="panel-header">
    <span class="panel-title">Palette</span>
    <select class="preset-select" value={selectedPreset} on:change={onPresetChange}>
      {#each presetNames as name}
        <option value={name}>{name}</option>
      {/each}
    </select>
  </div>

  <div class="color-grid">
    {#each $activePalette.colors as color}
      <button
        class="color-swatch"
        class:active={$foregroundColor === color}
        style="background: {color}"
        title={color}
        on:click={() => pickColor(color)}
      ></button>
    {/each}
    {#if $activePalette.colors.length === 0}
      <p class="empty-msg">No colors in palette</p>
    {/if}
  </div>
</div>

<style>
  .palette-panel {
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
  }
  .panel-title {
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
  }
  .preset-select {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 3px;
    cursor: pointer;
    max-width: 90px;
  }
  .color-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    padding: 8px;
    max-height: 180px;
    overflow-y: auto;
  }
  .color-swatch {
    aspect-ratio: 1;
    border: 1px solid rgba(0,0,0,0.3);
    border-radius: 2px;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    min-height: 18px;
  }
  .color-swatch:hover {
    transform: scale(1.1);
    box-shadow: 0 0 0 1px white;
    z-index: 1;
    position: relative;
  }
  .color-swatch.active {
    box-shadow: 0 0 0 2px white, 0 0 0 3px var(--accent);
  }
  .empty-msg {
    color: var(--text-secondary);
    font-size: 11px;
    grid-column: 1 / -1;
    text-align: center;
    padding: 8px;
  }
</style>
