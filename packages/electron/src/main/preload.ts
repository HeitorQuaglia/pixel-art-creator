import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (args: { content: string; defaultPath?: string }) => ipcRenderer.invoke('dialog:saveFile', args),
  exportPng: (args: { buffer: ArrayBuffer }) => ipcRenderer.invoke('dialog:exportPng', args),

  // Menu event listeners
  onNewFile: (cb: () => void) => ipcRenderer.on('menu:newFile', () => cb()),
  onOpenFile: (cb: () => void) => ipcRenderer.on('menu:openFile', () => cb()),
  onSaveFile: (cb: () => void) => ipcRenderer.on('menu:saveFile', () => cb()),
  onSaveFileAs: (cb: () => void) => ipcRenderer.on('menu:saveFileAs', () => cb()),
  onExportPng: (cb: () => void) => ipcRenderer.on('menu:exportPng', () => cb()),
  onUndo: (cb: () => void) => ipcRenderer.on('menu:undo', () => cb()),
  onRedo: (cb: () => void) => ipcRenderer.on('menu:redo', () => cb()),
  onToggleGrid: (cb: () => void) => ipcRenderer.on('menu:toggleGrid', () => cb()),
  onZoomIn: (cb: () => void) => ipcRenderer.on('menu:zoomIn', () => cb()),
  onZoomOut: (cb: () => void) => ipcRenderer.on('menu:zoomOut', () => cb()),
});
