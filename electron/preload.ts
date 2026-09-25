/**
 * WinProdCMDR — preload bridge.
 * Exposes a minimal, typed surface to the sandboxed renderer.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const api = {
  /** Invoke a data operation; returns an OpResult envelope. */
  invoke: (op: string, payload?: Record<string, unknown>) =>
    ipcRenderer.invoke('op', { op, ...(payload ?? {}) }),

  win: {
    minimize: () => ipcRenderer.invoke('win.min'),
    toggleMaximize: () => ipcRenderer.invoke('win.maxToggle'),
    close: () => ipcRenderer.invoke('win.close'),
    isMaximized: () => ipcRenderer.invoke('win.isMaximized'),
    onMaximized: (cb: (maximized: boolean) => void) => {
      const listener = (_e: IpcRendererEvent, maximized: boolean) => cb(maximized);
      ipcRenderer.on('win.maximized', listener);
      return () => ipcRenderer.removeListener('win.maximized', listener);
    },
  },
};

export type WinProdPreloadApi = typeof api;

contextBridge.exposeInMainWorld('winprod', api);
