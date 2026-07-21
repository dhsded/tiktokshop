import { app, BrowserWindow, shell, ipcMain, globalShortcut, session } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

let injectorWindow: BrowserWindow | null = null;
let spyWindow: BrowserWindow | null = null;
let pendingPromptsData: any = null;
let pendingSpyData: any = null;
let currentDownloadInfo: any = null;

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
    title: '🔍 Mapeador de Integrações',
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

// Salvar e carregar schemas aprendidos pelo Espião
ipcMain.handle('load-site-schema', async (_event, siteName: string) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const filename = `${siteName}_schema.json`;
    const filepath = path.join(app.getAppPath(), filename);
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Error loading site schema for ${siteName}:`, err);
  }
  return { siteName, configs: [], actions: [] };
});

ipcMain.handle('save-site-schema', async (_event, payload: any) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const { siteName, configs, actions } = payload;
    const filename = `${siteName}_schema.json`;
    const filepath = path.join(app.getAppPath(), filename);
    const data = { siteName, configs, actions };
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err: any) {
    console.error(`Error saving site schema:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('set-current-download-info', (_event, info: any) => {
  currentDownloadInfo = info;
  return true;
});

ipcMain.handle('upload-file-to-webview', async (_event, { webContentsId, projectIndex, imageName, sceneIndex, imageIndex, isFinal }) => {
  const { webContents } = require('electron');
  const path = require('path');
  const fs = require('fs');

  const targetWebContents = webContents.fromId(webContentsId);
  if (!targetWebContents) throw new Error("WebContents not found");

  const downloadsPath = app.getPath('downloads');
  let filePath = '';

  if (imageName) {
    filePath = path.join(downloadsPath, 'TikTok Shop', `produto${projectIndex}`, 'imagens_referencia', imageName);
  } else if (sceneIndex !== undefined && imageIndex !== undefined) {
    const imgDir = path.join(downloadsPath, 'TikTok Shop', `produto${projectIndex}`, 'imagens_referencia');
    if (!fs.existsSync(imgDir)) {
      console.warn(`[Electron Upload] Directory not found: ${imgDir}`);
      return { success: false, error: `Directory not found: ${imgDir}` };
    }

    const files = fs.readdirSync(imgDir);
    const sceneStr2 = String(sceneIndex).padStart(2, '0');
    const sceneStr = String(sceneIndex);

    // Padrões de busca por nome de arquivo (e.g. img1 cena01, img1-cena01, cena01_1, cena1_1)
    const targetPattern1 = `img${imageIndex} cena${sceneStr2}`;
    const targetPattern2 = `img${imageIndex}-cena${sceneStr2}`;
    const targetPattern3 = `cena${sceneStr2}_${imageIndex}`;
    const targetPattern4 = `cena${sceneStr}_${imageIndex}`;
    const targetPattern5 = `cena ${sceneStr2} - imagem ${imageIndex}`;
    const targetPattern6 = `cena ${sceneStr} - imagem ${imageIndex}`;

    let matchedFile = files.find(f => {
      const lf = f.toLowerCase();
      return lf.includes(targetPattern1.toLowerCase()) ||
             lf.includes(targetPattern2.toLowerCase()) ||
             lf.includes(targetPattern3.toLowerCase()) ||
             lf.includes(targetPattern4.toLowerCase()) ||
             lf.includes(targetPattern5.toLowerCase()) ||
             lf.includes(targetPattern6.toLowerCase());
    });

    if (!matchedFile) {
      matchedFile = files.find(f => {
        const lf = f.toLowerCase();
        return (lf.includes(`cena${sceneStr2}`) || lf.includes(`cena${sceneStr}`) || lf.includes(`cena ${sceneStr}`)) && 
               (lf.includes(`img${imageIndex}`) || lf.includes(`_${imageIndex}`) || lf.includes(`-${imageIndex}`) || lf.includes(` ${imageIndex}`) || lf.includes(`imagem ${imageIndex}`));
      });
    }

    if (!matchedFile) {
      matchedFile = files.find(f => {
        const lf = f.toLowerCase();
        return (lf.includes(`cena${sceneStr2}`) || lf.includes(`cena${sceneStr}`)) && lf.includes(String(imageIndex));
      });
    }

    if (!matchedFile) {
      console.warn(`[Electron Upload] No reference image found for scene ${sceneIndex}, image index ${imageIndex} in ${imgDir}`);
      return { success: false, error: `No reference image found for scene ${sceneIndex}, image index ${imageIndex}` };
    }

    filePath = path.join(imgDir, matchedFile);
  } else {
    return { success: false, error: "Neither imageName nor sceneIndex/imageIndex provided" };
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`[Electron Upload] File not found at path: ${filePath}`);
    return { success: false, error: `File not found: ${filePath}` };
  }

  // 1. Script para encontrar e retornar um seletor CSS único para o campo de upload (input[type="file"]) do "Inicial" ou "Final"
  const findInputSelectorScript = `
    (function() {
      const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
      if (inputs.length === 0) return null;
      
      function getUniqueSelector(el) {
        if (el.id) return '#' + el.id;
        let path = [];
        while (el && el.nodeType === Node.ELEMENT_NODE) {
          let selector = el.nodeName.toLowerCase();
          if (el.className) {
            const classes = el.className.split(/\\s+/).filter(c => c && !c.includes(':'));
            if (classes.length > 0) {
              selector += '.' + classes.join('.');
            }
          }
          let sibling = el.previousElementSibling;
          let nth = 1;
          while (sibling) {
            if (sibling.nodeName === el.nodeName) nth++;
            sibling = sibling.previousElementSibling;
          }
          selector += ':nth-of-type(' + nth + ')';
          path.unshift(selector);
          el = el.parentNode;
        }
        return path.join(' > ');
      }

      const targetLabel = ${isFinal ? '"Final"' : '"Inicial"'};
      for (const input of inputs) {
        let parent = input.parentElement;
        while (parent && parent !== document.body) {
          const text = (parent.textContent || '');
          if (text.includes(targetLabel) || text.includes('Start') || text.includes('First')) {
            return getUniqueSelector(input);
          }
          parent = parent.parentElement;
        }
      }
      
      const fallbackIndex = ${isFinal ? '1' : '0'};
      if (inputs[fallbackIndex]) {
        return getUniqueSelector(inputs[fallbackIndex]);
      }
      return getUniqueSelector(inputs[0]);
    })()
  `;

  try {
    const selector = await targetWebContents.executeJavaScript(findInputSelectorScript);
    if (!selector) {
      console.warn("[Electron Upload] No file input element found in Google Flow webview");
      return { success: false, error: "No file input element found" };
    }

    console.log(`[Electron Upload] Uploading ${filePath} to input: ${selector}`);

    // 2. Anexar o debugger do Chromium DevTools Protocol (CDP)
    try {
      if (!targetWebContents.debugger.isAttached()) {
        targetWebContents.debugger.attach('1.3');
      }
    } catch (err) {
      console.error("[Electron Upload] Failed to attach debugger:", err);
    }

    // 3. Obter o documento, localizar o nodeId e definir os arquivos no input
    const { root } = await targetWebContents.debugger.sendCommand('DOM.getDocument');
    const { nodeId } = await targetWebContents.debugger.sendCommand('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: selector
    });

    if (nodeId) {
      await targetWebContents.debugger.sendCommand('DOM.setFileInputFiles', {
        files: [filePath],
        nodeId: nodeId
      });

      // Disparar eventos DOM para garantir que a UI reativa do React do Flow capture o arquivo
      await targetWebContents.executeJavaScript(`
        (function() {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (el) {
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()
      `);

      return { success: true };
    } else {
      return { success: false, error: `NodeId not found for selector: ${selector}` };
    }
  } catch (err: any) {
    console.error("[Electron Upload] Failed to upload file via CDP:", err);
    return { success: false, error: err.message };
  } finally {
    try {
      targetWebContents.debugger.detach();
    } catch (e) {}
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

  // Interceptar downloads do Injetor para salvamento automatizado e numerado
  session.defaultSession.on('will-download', (event, item, webContents) => {
    if (currentDownloadInfo) {
      const fs = require('fs');
      const path = require('path');
      const downloadsPath = app.getPath('downloads');
      
      const folderName = `produto${currentDownloadInfo.projectIndex || 1}`;
      const targetDir = path.join(downloadsPath, 'TikTok Shop', folderName);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      const originalName = item.getFilename();
      const ext = path.extname(originalName) || '.mp4';
      
      // Nome formatado sequencial: cenaX_Y.mp4 (onde X é o sceneIndex e Y é o loop da variação)
      const fileName = `cena${currentDownloadInfo.sceneIndex || 0}_${currentDownloadInfo.generationLoop || 1}${ext}`;
      const filePath = path.join(targetDir, fileName);
      
      item.setSavePath(filePath);
      console.log(`[Electron Download Redirect] Direcionando arquivo para: ${filePath}`);
    }
  });

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
