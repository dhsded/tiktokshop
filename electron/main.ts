import { app, BrowserWindow, shell, ipcMain, globalShortcut } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

let injectorWindow: BrowserWindow | null = null;
let spyWindow: BrowserWindow | null = null;
let pendingPromptsData: any = null;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.ico'),
    title: 'Gerador TikTok Shop',
    backgroundColor: '#0a0a0b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // In development load from Vite dev server, in production load the built file
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ============================================================
// Configurações e IPCs para o Injetor de Prompts
// ============================================================
ipcMain.on('open-injector-window', (_event, data) => {
  pendingPromptsData = data;
  
  if (injectorWindow) {
    injectorWindow.focus();
    injectorWindow.webContents.send('load-prompts', pendingPromptsData);
    return;
  }
  
  injectorWindow = new BrowserWindow({
    width: 1450,
    height: 850,
    minWidth: 1000,
    minHeight: 600,
    title: 'Injetor de Prompts - Digen & Google Labs Flow',
    backgroundColor: '#0a0a0b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    }
  });

  injectorWindow.on('closed', () => {
    injectorWindow = null;
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    injectorWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?window=injector`);
  } else {
    injectorWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { window: 'injector' }
    });
  }
});

ipcMain.on('injector-ready', () => {
  if (injectorWindow && pendingPromptsData) {
    injectorWindow.webContents.send('load-prompts', pendingPromptsData);
  }
});

// ============================================================
// Espião de Ações — Janela de Desenvolvimento
// ============================================================
function createSpyWindow(): void {
  if (!is.dev) return; // Bloqueado em produção

  if (spyWindow) {
    spyWindow.focus();
    return;
  }

  spyWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: '\uD83D\uDD0D Espião de Ações — Dev Mode',
    backgroundColor: '#0a0a0b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  spyWindow.on('closed', () => {
    spyWindow = null;
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    spyWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?window=spy`);
  } else {
    spyWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { window: 'spy' }
    });
  }
}

ipcMain.on('open-spy-window', () => {
  createSpyWindow();
});

// Salvar macro gravado em disco
ipcMain.handle('spy-save-macro', async (_event, macroData: any) => {
  try {
    const macrosDir = join(app.getPath('userData'), 'dev-macros');
    if (!existsSync(macrosDir)) mkdirSync(macrosDir, { recursive: true });
    const filename = `${macroData.macro_id || 'macro'}_${Date.now()}.json`;
    const filepath = join(macrosDir, filename);
    writeFileSync(filepath, JSON.stringify(macroData, null, 2), 'utf-8');
    return { success: true, path: filepath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Listar macros salvos
ipcMain.handle('spy-list-macros', async () => {
  try {
    const macrosDir = join(app.getPath('userData'), 'dev-macros');
    if (!existsSync(macrosDir)) return [];
    return readdirSync(macrosDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          return JSON.parse(readFileSync(join(macrosDir, f), 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
});

// ============================================================
// App Lifecycle
// ============================================================
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tiktokshop.gerador');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  // Atalho global para abrir o espião (apenas em dev)
  if (is.dev) {
    globalShortcut.register('CommandOrControl+Shift+S', () => {
      createSpyWindow();
    });
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Liberar atalhos globais ao sair
  globalShortcut.unregisterAll();
});
