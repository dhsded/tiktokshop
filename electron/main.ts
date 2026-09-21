import { app, BrowserWindow, shell, ipcMain, globalShortcut, session, protocol, dialog, net, nativeImage } from 'electron';
import { join } from 'path';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { pathToFileURL } from 'url';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

let mainWindow: BrowserWindow | null = null;
let injectorWindow: BrowserWindow | null = null;
let spyWindow: BrowserWindow | null = null;
let pendingPromptsData: any = null;
let pendingSpyData: any = null;
let currentDownloadInfo: any = null;

// ============================================================
// Servidor Local de Streaming de Mídia (HTTP 206 Range Stream)
// ============================================================
let localMediaPort = 0;

function startLocalMediaServer(): Promise<number> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      try {
        const reqUrl = new URL(req.url || '', `http://127.0.0.1:${localMediaPort || 8000}`);
        const filePathParam = reqUrl.searchParams.get('path');

        if (!filePathParam) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing file path');
          return;
        }

        const filePath = decodeURIComponent(filePathParam);

        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found');
          return;
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'video/mp4';
        if (ext === '.webm') contentType = 'video/webm';
        else if (ext === '.mov') contentType = 'video/quicktime';
        else if (ext === '.mkv') contentType = 'video/x-matroska';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = (end - start) + 1;

          const stream = fs.createReadStream(filePath, { start, end });
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': contentType
          });
          stream.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes'
          });
          fs.createReadStream(filePath).pipe(res);
        }
      } catch (err: any) {
        console.error('[Media Server Error]:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        localMediaPort = addr.port;
        console.log(`[Main] Servidor de mídia local rodando em http://127.0.0.1:${localMediaPort}`);
        resolve(localMediaPort);
      } else {
        resolve(0);
      }
    });
  });
}

function getLocalMediaUrl(filePath: string): string {
  if (localMediaPort > 0) {
    return `http://127.0.0.1:${localMediaPort}/video?path=${encodeURIComponent(filePath)}`;
  }
  return pathToFileURL(filePath).toString();
}

function getAppIconPath(): string {
  const isWindows = process.platform === 'win32';
  const iconFileName = isWindows ? 'icon.ico' : 'icon.png';
  return join(__dirname, '../../resources', iconFileName);
}

function createWindow(): void {
  console.log('[Main] Creating main window...');
  const iconPath = getAppIconPath();
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
    icon: getAppIconPath(),
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
    icon: getAppIconPath(),
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

try {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'local-video',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: true,
        corsEnabled: true
      }
    }
  ]);
} catch (e) {
  console.warn('[Main] registerSchemesAsPrivileged local-video:', e);
}

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

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.tiktokshop.gerador');

    // Inicializar servidor de mídia local (HTTP 206 Range Stream nativo)
    try {
      await startLocalMediaServer();
    } catch (e) {
      console.warn('[Main] Falha ao iniciar media server local:', e);
    }

    // Registrar streaming de vídeos locais seguros para o Estúdio de Curadoria com suporte a Range Requests (HTTP 206)
    try {
      protocol.handle('local-video', async (request) => {
        const fs = require('fs');
        const path = require('path');

        try {
          let rawPath = request.url.replace(/^local-video:\/\//i, '');
          if (rawPath.startsWith('/') && process.platform === 'win32') {
            rawPath = rawPath.slice(1);
          }
          rawPath = decodeURIComponent(rawPath);

          if (!fs.existsSync(rawPath)) {
            console.warn('[local-video] Arquivo não encontrado:', rawPath);
            return new Response('Video not found', { status: 404 });
          }

          const stat = fs.statSync(rawPath);
          const fileSize = stat.size;
          const rangeHeader = request.headers.get('range');

          const ext = path.extname(rawPath).toLowerCase();
          let mimeType = 'video/mp4';
          if (ext === '.webm') mimeType = 'video/webm';
          else if (ext === '.mov') mimeType = 'video/quicktime';
          else if (ext === '.mkv') mimeType = 'video/x-matroska';

          if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            const fileStream = fs.createReadStream(rawPath, { start, end });
            const readable = new ReadableStream({
              start(controller) {
                fileStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
                fileStream.on('end', () => controller.close());
                fileStream.on('error', (err: any) => controller.error(err));
              }
            });

            return new Response(readable, {
              status: 206,
              headers: {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': String(chunkSize),
                'Content-Type': mimeType,
                'Access-Control-Allow-Origin': '*'
              }
            });
          } else {
            const fileStream = fs.createReadStream(rawPath);
            const readable = new ReadableStream({
              start(controller) {
                fileStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
                fileStream.on('end', () => controller.close());
                fileStream.on('error', (err: any) => controller.error(err));
              }
            });

            return new Response(readable, {
              status: 200,
              headers: {
                'Content-Length': String(fileSize),
                'Content-Type': mimeType,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
        } catch (err: any) {
          console.error('[local-video handler error]:', err);
          return new Response('Error loading video', { status: 500 });
        }
      });
    } catch (err) {
      console.warn('[Main] protocol.handle local-video error:', err);
    }

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

    // Configurar a sessão 100% anônima e deslogada para o Buscador de Virais
    const viralsSession = session.fromPartition('virals_search_anonymous');
    viralsSession.setUserAgent(CHROME_USER_AGENT);

    viralsSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const requestHeaders = { ...details.requestHeaders };
      requestHeaders['User-Agent'] = CHROME_USER_AGENT;
      delete requestHeaders['X-Electron'];
      callback({ requestHeaders });
    });

    viralsSession.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url.toLowerCase();
      if (
        url.startsWith('bytedance:') ||
        url.startsWith('tiktok:') ||
        url.startsWith('snssdk') ||
        url.startsWith('intent:')
      ) {
        callback({ cancel: true });
        return;
      }
      callback({ cancel: false });
    });

    ipcMain.handle('virals:clear-session', async () => {
      try {
        console.log('[Main] Limpando dados da sessão anônima de virais...');
        await viralsSession.clearStorageData();
        return { success: true };
      } catch (err: any) {
        console.error('[Main] Erro ao limpar sessão de virais:', err);
        return { success: false, error: err.message };
      }
    });

    // ============================================================
    // Estúdio de Curadoria & Melhores Vídeos (Smart Video Curator)
    // ============================================================
    ipcMain.handle('curator:scan-folder', async (_event, customFolderPath?: string) => {
      const fs = require('fs');
      const path = require('path');
      const downloadsPath = app.getPath('downloads');
      let targetDir = customFolderPath;

      if (!targetDir) {
        const baseTikTokDir = path.join(downloadsPath, 'TikTok Shop');
        if (fs.existsSync(baseTikTokDir)) {
          const subdirs = fs.readdirSync(baseTikTokDir).filter((d: string) => {
            try {
              const full = path.join(baseTikTokDir, d);
              return fs.statSync(full).isDirectory() && !d.toLowerCase().includes('corte_final');
            } catch (e) { return false; }
          });
          if (subdirs.length > 0) {
            targetDir = path.join(baseTikTokDir, subdirs[subdirs.length - 1]);
          } else {
            targetDir = baseTikTokDir;
          }
        } else {
          targetDir = downloadsPath;
        }
      }

      if (!fs.existsSync(targetDir)) {
        return { success: false, folderPath: targetDir, files: [], error: 'Diretório não encontrado' };
      }

      const validVideoExts = ['.mp4', '.webm', '.mov', '.mkv', '.avi'];
      const allFiles: Array<{ name: string; fullPath: string; url: string; thumbnailUrl: string; sizeBytes: number; modifiedAt: number }> = [];

      try {
        const items = fs.readdirSync(targetDir);
        for (const item of items) {
          if (item.startsWith('.')) continue;
          const full = path.join(targetDir, item);
          try {
            const stat = fs.statSync(full);
            // Escanear arquivos diretos de vídeo da pasta selecionada (sem misturar outras pastas)
            if (!stat.isDirectory() && validVideoExts.includes(path.extname(item).toLowerCase())) {
              let thumbUrl = '';
              try {
                const thumbImage = await nativeImage.createThumbnailFromPath(full, { width: 360, height: 640 });
                thumbUrl = thumbImage.toDataURL();
              } catch (thErr) {
                console.warn('[curator] Falha ao gerar thumbnail nativo:', thErr);
              }

              allFiles.push({
                name: item,
                fullPath: full,
                url: getLocalMediaUrl(full),
                thumbnailUrl: thumbUrl,
                sizeBytes: stat.size,
                modifiedAt: stat.mtimeMs
              });
            }
          } catch (e) {}
        }
      } catch (err: any) {
        console.error('[curator:scan-folder error]:', err);
      }

      // Ordenar por data de modificação decrescente (mais recentes no topo)
      allFiles.sort((a, b) => b.modifiedAt - a.modifiedAt);

      return { success: true, folderPath: targetDir, files: allFiles };
    });

    ipcMain.handle('curator:get-thumbnail', async (_event, filePath: string) => {
      try {
        const thumbImage = await nativeImage.createThumbnailFromPath(filePath, { width: 360, height: 640 });
        return thumbImage.toDataURL();
      } catch (e) {
        return '';
      }
    });

    ipcMain.handle('curator:get-media-url', (_event, filePath: string) => {
      return getLocalMediaUrl(filePath);
    });

    ipcMain.handle('curator:select-folder', async () => {
      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        properties: ['openDirectory'],
        title: 'Selecione a Pasta de Vídeos Gerados'
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
      }
      return { canceled: false, folderPath: result.filePaths[0] };
    });

    ipcMain.handle('curator:export-final-cut', async (_event, payload: {
      targetFolder?: string;
      projectName?: string;
      selectedTakes: Array<{
        sceneIndex: number;
        sceneTitle: string;
        sourcePath: string;
        duration?: string;
        narration?: string;
        score?: number;
        voiceMatch?: string;
      }>;
    }) => {
      const fs = require('fs');
      const path = require('path');
      const downloadsPath = app.getPath('downloads');
      
      try {
        let baseDir = payload.targetFolder;
        if (!baseDir) {
          baseDir = path.join(downloadsPath, 'TikTok Shop', 'Corte_Final');
        } else {
          baseDir = path.join(baseDir, 'Corte_Final');
        }

        if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
        }

        const exportedFiles: string[] = [];
        let reportContent = `=====================================================\n`;
        reportContent += `ESTÚDIO DE CURADORIA - RELATÓRIO DO CORTE FINAL\n`;
        reportContent += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
        reportContent += `Projeto: ${payload.projectName || 'TikTok Shop Campanha'}\n`;
        reportContent += `Total de Cenas Montadas: ${payload.selectedTakes?.length || 0}\n`;
        reportContent += `=====================================================\n\n`;

        if (payload.selectedTakes && payload.selectedTakes.length > 0) {
          for (let i = 0; i < payload.selectedTakes.length; i++) {
            const take = payload.selectedTakes[i];
            const ext = path.extname(take.sourcePath) || '.mp4';
            const cleanSceneTitle = (take.sceneTitle || `Cena_${take.sceneIndex || i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
            const orderPrefix = String(i + 1).padStart(2, '0');
            const outFileName = `${orderPrefix}_${cleanSceneTitle}${ext}`;
            const destPath = path.join(baseDir, outFileName);

            if (fs.existsSync(take.sourcePath)) {
              fs.copyFileSync(take.sourcePath, destPath);
              exportedFiles.push(destPath);
            }

            reportContent += `[CENA ${i + 1}] ${take.sceneTitle || 'Sem título'}\n`;
            reportContent += `Arquivo Final: ${outFileName}\n`;
            reportContent += `Arquivo Original: ${path.basename(take.sourcePath)}\n`;
            if (take.duration) reportContent += `Duração Estimada: ${take.duration}\n`;
            if (take.score) reportContent += `Qualidade Técnica: ${take.score}/100\n`;
            if (take.voiceMatch) reportContent += `Coerência de Voz: ${take.voiceMatch}\n`;
            if (take.narration) reportContent += `Narração da Cena: "${take.narration}"\n`;
            reportContent += `-----------------------------------------------------\n\n`;
          }
        }

        // Salvar relatório em TXT
        const reportPath = path.join(baseDir, 'ordem_montagem_corte_final.txt');
        fs.writeFileSync(reportPath, reportContent, 'utf-8');

        // Abrir pasta no Windows Explorer
        shell.openPath(baseDir);

        return {
          success: true,
          destFolder: baseDir,
          exportedFilesCount: exportedFiles.length,
          reportPath
        };
      } catch (err: any) {
        console.error('[Curator Export Error]:', err);
        return { success: false, error: err.message };
      }
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
