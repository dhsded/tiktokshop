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
  // Espião de Ações — Dev Mode
  openSpyWindow: () => ipcRenderer.send('open-spy-window'),
  saveMacro: (data: any) => ipcRenderer.invoke('spy-save-macro', data),
  listMacros: () => ipcRenderer.invoke('spy-list-macros'),
});
