import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openInjectorWindow: (data: any) => ipcRenderer.send('open-injector-window', data),
  injectorReady: () => ipcRenderer.send('injector-ready'),
  onLoadPrompts: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('load-prompts', subscription);
    return () => {
      ipcRenderer.removeListener('load-prompts', subscription);
    };
  },
  // Espião de Ações — Auto-Detect
  openSpyWindow: (data?: any) => ipcRenderer.send('open-spy-window', data),
  spyReady: () => ipcRenderer.send('spy-ready'),
  onSpyData: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('spy-load-data', subscription);
    return () => {
      ipcRenderer.removeListener('spy-load-data', subscription);
    };
  },
  writeSpyScanResults: (data: any) => ipcRenderer.send('spy-write-results', data),
  saveProjectAssets: (payload: any) => ipcRenderer.invoke('save-project-assets', payload),
  loadSiteSchema: (siteName: string) => ipcRenderer.invoke('load-site-schema', siteName),
  saveSiteSchema: (payload: any) => ipcRenderer.invoke('save-site-schema', payload),
  setCurrentDownloadInfo: (info: any) => ipcRenderer.invoke('set-current-download-info', info),
  uploadFileToWebview: (payload: { webContentsId: number, projectIndex: number, imageName?: string, sceneIndex?: number, imageIndex?: number, isFinal?: boolean }) => ipcRenderer.invoke('upload-file-to-webview', payload),
});
