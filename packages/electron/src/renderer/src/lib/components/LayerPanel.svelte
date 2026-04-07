<script lang="ts">
  import { document, modified } from '$lib/stores/editor';

  let layerNameInput = '';

  function addLayer() {
    document.update((doc) => {
      if (!doc) return doc;
      const newName = `Layer ${doc.layers.length + 1}`;
      doc.addLayer(newName);
      doc.activeLayerIndex = doc.layers.length - 1;
      modified.set(true);
      return doc;
    });
  }

  function removeLayer(index: number) {
    document.update((doc) => {
      if (!doc) return doc;
      try {
        doc.removeLayer(index);
        modified.set(true);
      } catch {
        // Cannot remove last layer
      }
      return doc;
    });
  }

  function setActiveLayer(index: number) {
    document.update((doc) => {
      if (!doc) return doc;
      doc.activeLayerIndex = index;
      return doc;
    });
  }

  function toggleVisibility(index: number) {
    document.update((doc) => {
      if (!doc) return doc;
      doc.layers[index].visible = !doc.layers[index].visible;
      modified.set(true);
      return doc;
    });
  }

  // Layers are shown in reverse order (top layer first)
  $: reversedLayers = $document ? [...$document.layers].reverse() : [];
  $: activeIndex = $document?.activeLayerIndex ?? 0;
  $: layerCount = $document?.layers.length ?? 0;
</script>

<div class="layer-panel">
  <div class="panel-header">
    <span class="panel-title">Layers</span>
    <button class="icon-btn" title="Add Layer" on:click={addLayer}>+</button>
  </div>

  <div class="layer-list">
    {#each reversedLayers as layer, reversedIdx}
      {@const realIndex = layerCount - 1 - reversedIdx}
      <div
        class="layer-item"
        class:active={realIndex === activeIndex}
        on:click={() => setActiveLayer(realIndex)}
        on:keydown
        role="button"
        tabindex="0"
      >
        <button
          class="vis-btn"
          title={layer.visible ? 'Hide layer' : 'Show layer'}
          on:click|stopPropagation={() => toggleVisibility(realIndex)}
        >
          {layer.visible ? '👁' : '—'}
        </button>
        <span class="layer-name" class:hidden={!layer.visible}>{layer.name}</span>
        {#if layerCount > 1}
          <button
            class="del-btn"
            title="Delete layer"
            on:click|stopPropagation={() => removeLayer(realIndex)}
          >
            ×
          </button>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .layer-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background: var(--bg-secondary);
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .panel-title {
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
  }
  .icon-btn {
    background: var(--accent);
    border: none;
    border-radius: 3px;
    color: white;
    width: 20px;
    height: 20px;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .icon-btn:hover {
    opacity: 0.8;
  }
  .layer-list {
    overflow-y: auto;
    flex: 1;
  }
  .layer-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    transition: background 0.1s;
  }
  .layer-item:hover {
    background: rgba(255,255,255,0.05);
  }
  .layer-item.active {
    background: rgba(233, 69, 96, 0.2);
    border-left: 2px solid var(--accent);
  }
  .vis-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-secondary);
    padding: 0;
    width: 16px;
    flex-shrink: 0;
  }
  .vis-btn:hover {
    color: var(--text-primary);
  }
  .layer-name {
    flex: 1;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .layer-name.hidden {
    opacity: 0.4;
  }
  .del-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 14px;
    padding: 0 2px;
    flex-shrink: 0;
    line-height: 1;
  }
  .del-btn:hover {
    color: var(--accent);
  }
</style>
