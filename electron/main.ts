/**
 * WinProdCMDR — Electron main process.
 *
 * Window management (App Browser launcher + one window per suite app),
 * IPC dispatch, and the real/mock Windows data bridge.
 */

import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'node:path';
import { APPS, isAppId, type AppId } from '../shared/apps';
import { handleOp } from './ops';

const DEV_SERVER = process.env.VITE_DEV_SERVER_URL ?? '';

let launcher: BrowserWindow | null = null;
let cascade = 0;

/* ------------------------------------------------------------------ */
/* Page loading                                                        */
/* ------------------------------------------------------------------ */

function loadPage(win: BrowserWindow, params: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  if (DEV_SERVER) {
    void win.loadURL(`${DEV_SERVER}/index.html?${search}`);
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { search: `?${search}` });
  }
}

/* ------------------------------------------------------------------ */
/* Window creation                                                     */
/* ------------------------------------------------------------------ */

function baseWebPreferences() {
  return {
    preload: path.join(__dirname, 'preload.cjs'),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    spellcheck: false,
  };
}

function createLauncher(): BrowserWindow {
  if (launcher && !launcher.isDestroyed()) {
    launcher.show();
    launcher.focus();
    return launcher;
  }
  launcher = new BrowserWindow({
    width: 1060,
    height: 680,
    minWidth: 920,
    minHeight: 600,
    title: 'WinProdCMDR',
    backgroundColor: '#1b1b1b',
    show: false,
    frame: false,
    webPreferences: baseWebPreferences(),
  });
  launcher.once('ready-to-show', () => launcher?.show());
  launcher.on('closed', () => (launcher = null));
  loadPage(launcher, {});
  return launcher;
}

function createAppWindow(appId: AppId): BrowserWindow {
  const meta = APPS[appId];
  const offset = (cascade++ % 6) * 26;
  const win = new BrowserWindow({
    width: meta.window.width,
    height: meta.window.height,
    minWidth: meta.window.minWidth,
    minHeight: meta.window.minHeight,
    x: undefined,
    y: undefined,
    title: meta.window.title,
    backgroundColor: meta.palette.primary,
    show: false,
    frame: false,
    webPreferences: baseWebPreferences(),
  });
  // Cascade new windows slightly so stacked windows feel like an Office suite.
  const [x, y] = win.getPosition();
  win.setPosition(x + offset, Math.max(0, y + offset));
  win.once('ready-to-show', () => win.show());
  wireMaximizeEvents(win);
  loadPage(win, { app: appId });
  return win;
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

function registerIpc() {
  ipcMain.handle('op', async (event, payload: { op: string } & Record<string, unknown>) => {
    try {
      if (!payload || typeof payload.op !== 'string') {
        return { ok: false, error: 'Malformed request.' };
      }
      switch (payload.op) {
        case 'app.open': {
          const id = String(payload.appId ?? '');
          if (isAppId(id)) createAppWindow(id);
          return { ok: true };
        }
        case 'app.home': {
          createLauncher();
          return { ok: true };
        }
        case 'report.export': {
          const { exportReport } = await import('./ops');
          return exportReport(event, String(payload.fileName ?? 'report.txt'), String(payload.content ?? ''));
        }
        default:
          return handleOp(payload as never);
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // Window chrome controls -------------------------------------------------
  // NOTE: the preload uses ipcRenderer.invoke, so these MUST be handle()
  // (an ipcMain.on() channel is invisible to invoke and the call rejects).
  ipcMain.handle('win.min', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.minimize();
  });
  ipcMain.handle('win.maxToggle', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  ipcMain.handle('win.close', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.close();
  });
  ipcMain.handle('win.isMaximized', (e) => BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false);
}

/** Wire per-window maximize/unmaximize broadcasts (called at creation). */
function wireMaximizeEvents(win: BrowserWindow) {
  win.on('maximize', () => win.webContents.send('win.maximized', true));
  win.on('unmaximize', () => win.webContents.send('win.maximized', false));
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => createLauncher());

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null); // the suite draws its own Office chrome
    registerIpc();
    createLauncher();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
