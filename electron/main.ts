import { app, BrowserWindow, shell, ipcMain, globalShortcut, session, protocol } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

let mainWindow: BrowserWindow | null = null;
let injectorWindow: BrowserWindow | null = null;
let spyWindow: BrowserWindow | null = null;
let pendingPromptsData: any = null;
let pendingSpyData: any = null;
let currentDownloadInfo: any = null;

function createWindow(): void {
  console.log('[Main] Creating main window...');
  const iconPath = join(__dirname, '../../resources/icon.png');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: true,
    autoHideMenuBar: false,
    icon: iconPath,
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
    console.log('[Main] Window ready-to-show fired');
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] webContents finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Main] webContents failed load:', errorCode, errorDescription);
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const rawUrl = details.url || '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      shell.openExternal(rawUrl);
    }
    return { action: 'deny' };
  });

  // In development load from Vite dev server, in production load the built file
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    console.log('[Main] Loading URL:', process.env['ELECTRON_RENDERER_URL']);
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    console.log('[Main] Loading File:', join(__dirname, '../renderer/index.html'));
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

// Download de imagem externa e conversão para base64 (sem restrições de CORS)
ipcMain.handle('fetch-image-as-base64', async (_event, imageUrl: string) => {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Referer': 'https://shop.tiktok.com/'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return {
      success: true,
      dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
      mimeType,
      size: buffer.length
    };
  } catch (err: any) {
    console.error(`[Electron] Error fetching image ${imageUrl}:`, err);
    return { success: false, error: err.message || String(err) };
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
    let imgDir = path.join(downloadsPath, 'TikTok Shop', `produto${projectIndex}`, 'imagens_referencia');
    if (!fs.existsSync(imgDir)) {
      imgDir = path.join(downloadsPath, 'TikTok Shop', `produto${String(projectIndex).padStart(2, '0')}`, 'imagens_referencia');
    }
    if (!fs.existsSync(imgDir)) {
      imgDir = path.join(downloadsPath, 'TikTok Shop', `produto${projectIndex}`);
    }
    if (!fs.existsSync(imgDir)) {
      const baseDir = path.join(downloadsPath, 'TikTok Shop');
      if (fs.existsSync(baseDir)) {
        const subdirs = fs.readdirSync(baseDir).filter((d: string) => {
          try { return fs.statSync(path.join(baseDir, d)).isDirectory(); } catch (e) { return false; }
        });
        for (const sub of subdirs) {
          const candidate = path.join(baseDir, sub, 'imagens_referencia');
          if (fs.existsSync(candidate)) {
            imgDir = candidate;
            break;
          }
        }
      }
    }

    if (!fs.existsSync(imgDir)) {
      console.warn(`[Electron Upload] Directory not found: ${imgDir}`);
      return { success: false, error: `Directory not found: ${imgDir}` };
    }

    const files = fs.readdirSync(imgDir);
    const imageFiles = files.filter((f: string) => /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f));
    const sceneStr2 = String(sceneIndex).padStart(2, '0');
    const sceneStr = String(sceneIndex);
    const projStr2 = String(projectIndex).padStart(2, '0');
    const letter = String.fromCharCode(96 + imageIndex); // 1->'a', 2->'b', 3->'c'...

    // Padrões de busca por nome de arquivo (produto01a, produto1a, img1 cena01, cena01_1, etc.)
    const prodPattern1 = `produto${projStr2}${letter}`;
    const prodPattern2 = `produto${projectIndex}${letter}`;
    const prodPattern3 = `produto${projStr2}_${letter}`;
    const prodPattern4 = `produto${projectIndex}_${letter}`;
    const prodPattern5 = `produto${projStr2}_${imageIndex}`;
    const prodPattern6 = `produto${projectIndex}_${imageIndex}`;
    const targetPattern1 = `img${imageIndex} cena${sceneStr2}`;
    const targetPattern2 = `img${imageIndex}-cena${sceneStr2}`;
    const targetPattern3 = `cena${sceneStr2}_${imageIndex}`;
    const targetPattern4 = `cena${sceneStr}_${imageIndex}`;

    let matchedFile = imageFiles.find(f => {
      const lf = f.toLowerCase();
      return lf.includes(prodPattern1.toLowerCase()) ||
             lf.includes(prodPattern2.toLowerCase()) ||
             lf.includes(prodPattern3.toLowerCase()) ||
             lf.includes(prodPattern4.toLowerCase()) ||
             lf.includes(prodPattern5.toLowerCase()) ||
             lf.includes(prodPattern6.toLowerCase()) ||
             lf.includes(targetPattern1.toLowerCase()) ||
             lf.includes(targetPattern2.toLowerCase()) ||
             lf.includes(targetPattern3.toLowerCase()) ||
             lf.includes(targetPattern4.toLowerCase());
    });

    if (!matchedFile) {
      matchedFile = imageFiles.find(f => {
        const lf = f.toLowerCase();
        return (lf.includes(`cena${sceneStr2}`) || lf.includes(`cena${sceneStr}`) || lf.includes(`produto`)) && 
               (lf.includes(`img${imageIndex}`) || lf.includes(`_${imageIndex}`) || lf.includes(`-${imageIndex}`) || lf.includes(` ${imageIndex}`) || lf.includes(letter));
      });
    }

    if (!matchedFile) {
      matchedFile = imageFiles.find(f => {
        const lf = f.toLowerCase();
        return lf.includes(String(imageIndex)) || lf.includes(letter);
      });
    }

    // Fallback N-ésimo arquivo de imagem se disponível na pasta
    if (!matchedFile && imageFiles.length > 0) {
      matchedFile = imageFiles[imageIndex - 1] || imageFiles[0];
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
    let attached = false;
    try {
      if (!targetWebContents.debugger.isAttached()) {
        targetWebContents.debugger.attach('1.3');
        attached = true;
      }

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
    } finally {
      if (attached && targetWebContents.debugger.isAttached()) {
        try {
          targetWebContents.debugger.detach();
        } catch (detachErr) {
          console.warn("[Electron Upload] Debugger detach warning:", detachErr);
        }
      }
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
// App Lifecycle & Single Instance Lock
// ============================================================
app.commandLine.appendSwitch('disable-gpu-cache');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.tiktokshop.gerador');

    const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

    // Interceptar e registrar protocolos proprietários do TikTok para NUNCA abrir o popup do Windows
    const blockedSchemes = ['bytedance', 'tiktok', 'snssdk1128', 'snssdk1233', 'snssdk', 'intent'];
    for (const scheme of blockedSchemes) {
      try {
        protocol.handle(scheme, () => new Response('', { status: 204 }));
      } catch (err) {
        console.log(`[Main] Protocolo ${scheme} ignorado ou já tratado:`, err);
      }
    }

    // Configurar a sessão isolada do TikTok Shop com User-Agent genuíno e filtros
    const tiktokSession = session.fromPartition('persist:tiktok_shop');
    tiktokSession.setUserAgent(CHROME_USER_AGENT);

    tiktokSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const requestHeaders = { ...details.requestHeaders };
      requestHeaders['User-Agent'] = CHROME_USER_AGENT;
      delete requestHeaders['X-Electron'];
      callback({ requestHeaders });
    });

    tiktokSession.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url.toLowerCase();
      if (
        url.startsWith('bytedance:') ||
        url.startsWith('tiktok:') ||
        url.startsWith('snssdk') ||
        url.startsWith('intent:')
      ) {
        console.log('[Main] Bloqueado deep-link do TikTok:', details.url);
        callback({ cancel: true });
        return;
      }
      callback({ cancel: false });
    });

    // Proteger todas as webContents criadas (inclusive <webview> e janelas filhas)
    app.on('web-contents-created', (_event, contents) => {
      contents.setWindowOpenHandler((details) => {
        const rawUrl = details.url || '';
        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
          shell.openExternal(rawUrl);
        } else {
          console.log('[Main] Bloqueado window.open não-web:', rawUrl);
        }
        return { action: 'deny' };
      });

      contents.on('will-navigate', (event, navigationUrl) => {
        if (!navigationUrl.startsWith('http://') && !navigationUrl.startsWith('https://')) {
          event.preventDefault();
          console.log('[Main] Bloqueada navegação will-navigate não-web:', navigationUrl);
        }
      });

      contents.on('will-redirect', (event, navigationUrl) => {
        if (!navigationUrl.startsWith('http://') && !navigationUrl.startsWith('https://')) {
          event.preventDefault();
          console.log('[Main] Bloqueado redirecionamento will-redirect não-web:', navigationUrl);
        }
      });
    });

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    createWindow();

  // Interceptar e monitorar downloads do Injetor para salvamento automatizado e registro no Espião
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const fs = require('fs');
    const path = require('path');
    const downloadsPath = app.getPath('downloads');

    let filePath = '';
    let fileName = item.getFilename();

    if (currentDownloadInfo) {
      const folderName = `produto${currentDownloadInfo.projectIndex || 1}`;
      const targetDir = path.join(downloadsPath, 'TikTok Shop', folderName);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      const originalName = item.getFilename();
      const ext = path.extname(originalName) || '.mp4';
      
      const baseName = currentDownloadInfo.customFileName || `cena${currentDownloadInfo.sceneIndex || 0}_${currentDownloadInfo.generationLoop || 1}`;
      fileName = `${baseName}${ext}`;
      filePath = path.join(targetDir, fileName);
      
      item.setSavePath(filePath);
      console.log(`[Electron Download Redirect] Direcionando arquivo para: ${filePath}`);
    } else {
      filePath = item.getSavePath() || path.join(downloadsPath, fileName);
    }

    const broadcastDownloadEvent = (eventType: string, details: any) => {
      const payload = { type: eventType, filename: fileName, savePath: filePath, ...details };
      
      // Notificar todas as janelas ativas (Injector, Spy, Main)
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('download-event', payload);
        }
      });
      
      // Persistir registro detalhado no spy_last_scan.json
      try {
        const spyPath = path.join(app.getAppPath(), 'spy_last_scan.json');
        let currentSpyData: any = {};
        if (fs.existsSync(spyPath)) {
          try {
            currentSpyData = JSON.parse(fs.readFileSync(spyPath, 'utf-8'));
          } catch(e) {}
        }
        if (!currentSpyData.downloads) currentSpyData.downloads = [];
        currentSpyData.downloads.unshift(payload);
        currentSpyData.downloads = currentSpyData.downloads.slice(0, 200);
        fs.writeFileSync(spyPath, JSON.stringify(currentSpyData, null, 2), 'utf-8');
      } catch (err) {
        console.error('Error writing download event to spy_last_scan.json:', err);
      }
    };

    broadcastDownloadEvent('download-started', {
      url: item.getURL(),
      mimeType: item.getMimeType(),
      totalBytes: item.getTotalBytes(),
      timestamp: Date.now()
    });

    item.on('updated', (_evt, state) => {
      if (state === 'interrupted') {
        broadcastDownloadEvent('download-interrupted', { timestamp: Date.now() });
      }
    });

    item.once('done', (_evt, state) => {
      let fileSize = 0;
      try {
        if (fs.existsSync(filePath)) {
          fileSize = fs.statSync(filePath).size;
        }
      } catch(e) {}

      if (state === 'completed') {
        broadcastDownloadEvent('download-completed', {
          sizeBytes: fileSize,
          status: 'completed',
          timestamp: Date.now()
        });
      } else {
        broadcastDownloadEvent('download-failed', {
          status: state,
          timestamp: Date.now()
        });
      }
    });
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
}
