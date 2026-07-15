import { app, BrowserWindow, shell, ipcMain, globalShortcut } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

let injectorWindow: BrowserWindow | null = null;
let spyWindow: BrowserWindow | null = null;
let pendingPromptsData: any = null;
let pendingSpyData: any = null;

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

  if (spyWindow) {
    spyWindow.focus();
    return;
  }

  spyWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: '\uD83D\uDD0D Espião Auto-Detect',
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

ipcMain.on('open-spy-window', (_event, data?: any) => {
  if (data) pendingSpyData = data;
  createSpyWindow();
});

// Espião: enviar dados gerados (prompts/cenas/ângulos) para a janela do espião
ipcMain.on('spy-send-data', (_event, data: any) => {
  pendingSpyData = data;
  if (spyWindow) {
    spyWindow.webContents.send('spy-load-data', pendingSpyData);
  }
});

ipcMain.on('spy-ready', () => {
  if (spyWindow && pendingSpyData) {
    spyWindow.webContents.send('spy-load-data', pendingSpyData);
  }
});

// Salvar resultados do scan para que o agente de IA possa inspecionar e verificar
ipcMain.on('spy-write-results', (_event, data: any) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const filepath = path.join(app.getAppPath(), 'spy_last_scan.json');
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing spy results:', err);
  }
});

// Salvar assets do projeto estruturado diretamente em Downloads/TikTok Shop/produtoN/
ipcMain.handle('save-project-assets', async (_event, payload: any) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const { projectIndex, campaignTitle, txtContent, htmlContent, pdfBase64, images } = payload;
    const downloadsPath = app.getPath('downloads');
    const folderName = `produto${projectIndex || 1}`;
    const targetDir = path.join(downloadsPath, 'TikTok Shop', folderName);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const cleanTitle = (campaignTitle || 'roteiro').replace(/[^a-zA-Z0-9]/g, '_');
    
    // 1. Salvar Roteiro em TXT
    fs.writeFileSync(path.join(targetDir, `${cleanTitle}.txt`), txtContent, 'utf-8');
    
    // 2. Salvar Documento em DOC (HTML formatado)
    fs.writeFileSync(path.join(targetDir, `${cleanTitle}.doc`), htmlContent, 'utf-8');
    
    // 3. Salvar PDF (se fornecido)
    if (pdfBase64) {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      fs.writeFileSync(path.join(targetDir, `${cleanTitle}.pdf`), pdfBuffer);
    }
    
    // 4. Salvar Imagens de referência (se fornecidas)
    if (images && images.length > 0) {
      const imgDir = path.join(targetDir, 'imagens_referencia');
      if (!fs.existsSync(imgDir)) {
        fs.mkdirSync(imgDir, { recursive: true });
      }
      for (const img of images) {
        if (img.base64) {
          const imgBuffer = Buffer.from(img.base64, 'base64');
          fs.writeFileSync(path.join(imgDir, img.name), imgBuffer);
        }
      }
    }
    
    return { success: true, path: targetDir };
  } catch (err: any) {
    return { success: false, error: err.message };
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
