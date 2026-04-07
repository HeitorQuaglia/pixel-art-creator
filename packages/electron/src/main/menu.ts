import { Menu, BrowserWindow, app } from 'electron';

export function buildMenu(win: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => win.webContents.send('menu:newFile'),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => win.webContents.send('menu:openFile'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('menu:saveFile'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => win.webContents.send('menu:saveFileAs'),
        },
        { type: 'separator' },
        {
          label: 'Export PNG...',
          accelerator: 'CmdOrCtrl+E',
          click: () => win.webContents.send('menu:exportPng'),
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => win.webContents.send('menu:undo'),
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => win.webContents.send('menu:redo'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Grid',
          accelerator: 'CmdOrCtrl+G',
          click: () => win.webContents.send('menu:toggleGrid'),
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Equal',
          click: () => win.webContents.send('menu:zoomIn'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+Minus',
          click: () => win.webContents.send('menu:zoomOut'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => win.webContents.toggleDevTools(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
