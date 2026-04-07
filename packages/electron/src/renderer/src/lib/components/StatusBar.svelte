<script lang="ts">
  import { document, cursorPosition, zoom, activeLayerName, projectPath, modified } from '$lib/stores/editor';

  $: filename = $projectPath ? $projectPath.split('/').pop() : 'Untitled';
  $: dimensions = $document ? `${$document.width}×${$document.height}` : '—';
  $: cursor = $cursorPosition ? `${$cursorPosition.x}, ${$cursorPosition.y}` : '—';
</script>

<div class="status-bar">
  <span class="status-item">
    {filename}{$modified ? ' *' : ''}
  </span>
  <span class="status-sep">|</span>
  <span class="status-item" title="Canvas dimensions">{dimensions}</span>
  <span class="status-sep">|</span>
  <span class="status-item" title="Zoom level">{$zoom * 100}%</span>
  <span class="status-sep">|</span>
  <span class="status-item" title="Active layer">{$activeLayerName}</span>
  <span class="status-sep">|</span>
  <span class="status-item" title="Cursor position">
    {cursor}
  </span>
</div>

<style>
  .status-bar {
    height: 24px;
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 0;
    flex-shrink: 0;
    overflow: hidden;
  }
  .status-item {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    padding: 0 8px;
  }
  .status-sep {
    color: var(--border);
    font-size: 11px;
  }
</style>
