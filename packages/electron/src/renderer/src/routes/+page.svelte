<script lang="ts">
  import { onMount } from 'svelte';
  import Canvas from '$lib/components/Canvas.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import LayerPanel from '$lib/components/LayerPanel.svelte';
  import PalettePanel from '$lib/components/PalettePanel.svelte';
  import StatusBar from '$lib/components/StatusBar.svelte';
  import { document, newDocument, zoom, gridVisible } from '$lib/stores/editor';

  onMount(() => {
    if (!$document) newDocument(32, 32);

    // Listen for IPC events from main process (if in Electron)
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;

      api.onNewFile(() => {
        newDocument(32, 32);
      });

      api.onZoomIn(() => {
        zoom.update((z) => Math.min(32, z + 1));
      });

      api.onZoomOut(() => {
        zoom.update((z) => Math.max(1, z - 1));
      });

      api.onToggleGrid(() => {
        gridVisible.update((v) => !v);
      });
    }
  });
</script>

<div class="editor">
  <div class="main-area">
    <Toolbar />
    <Canvas />
    <div class="right-panel">
      <LayerPanel />
      <div class="separator"></div>
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
    width: 100vw;
    overflow: hidden;
  }
  .main-area {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .right-panel {
    width: 200px;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex-shrink: 0;
  }
  .separator {
    height: 1px;
    background: var(--border);
    flex-shrink: 0;
  }
</style>
