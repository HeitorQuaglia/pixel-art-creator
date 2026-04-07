import { ipcMain, dialog, BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'fs';

export function registerIpcHandlers(win: BrowserWindow): void {
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Open Pixel Art Project',
      filters: [
        { name: 'Pixel Art Project', extensions: ['pixelart'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const content = readFileSync(filePath, 'utf-8');
    return { filePath, content };
  });

  ipcMain.handle('dialog:saveFile', async (_event, { content, defaultPath }: { content: string; defaultPath?: string }) => {
    let filePath = defaultPath;
    if (!filePath) {
      const result = await dialog.showSaveDialog(win, {
        title: 'Save Pixel Art Project',
        defaultPath: 'untitled.pixelart',
        filters: [
          { name: 'Pixel Art Project', extensions: ['pixelart'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (result.canceled || !result.filePath) return null;
      filePath = result.filePath;
    }
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
  });

  ipcMain.handle('dialog:exportPng', async (_event, { buffer }: { buffer: ArrayBuffer }) => {
    const result = await dialog.showSaveDialog(win, {
      title: 'Export as PNG',
      defaultPath: 'pixel-art.png',
      filters: [
        { name: 'PNG Image', extensions: ['png'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    writeFileSync(result.filePath, Buffer.from(buffer));
    return result.filePath;
  });
}
