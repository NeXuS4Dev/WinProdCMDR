/**
 * WinProdCMDR — renderer data bridge.
 *
 * One interface, two transports:
 *  - Electron: through the contextBridge preload API (real PowerShell ops),
 *  - Browser preview (`npm run web`): the built-in simulation, plus URL-based
 *    app navigation so the whole UI is explorable without Electron.
 */

import * as mock from '../shared/mock';
import type { AppId } from '../shared/apps';
import type {
  OpResult,
  ProcessInfo,
  ServiceAction,
  ServiceInfo,
  ServiceStartupType,
  SystemInfoModel,
} from '../shared/types';

export interface WindowControls {
  minimize(): void;
  toggleMaximize(): void;
  close(): void;
  isMaximized(): Promise<boolean>;
  onMaximized(cb: (maximized: boolean) => void): () => void;
}

export interface Bridge {
  mode: 'electron' | 'browser';
  listProcesses(): Promise<OpResult<ProcessInfo[]>>;
  endTask(pid: number): Promise<OpResult<null>>;
  runTask(file: string, args?: string): Promise<OpResult<null>>;
  listServices(): Promise<OpResult<ServiceInfo[]>>;
  serviceControl(name: string, action: ServiceAction): Promise<OpResult<null>>;
  setServiceStartup(name: string, startupType: ServiceStartupType): Promise<OpResult<null>>;
  getSystemInfo(): Promise<OpResult<SystemInfoModel>>;
  exportReport(fileName: string, content: string): Promise<OpResult<{ path: string }>>;
  openTool(tool: string): Promise<OpResult<null>>;
  openApp(appId: AppId): void;
  goHome(): void;
  window: WindowControls | null;
}

/* --------------------------- Electron transport ---------------------- */

interface WinProdPreload {
  invoke(op: string, payload?: Record<string, unknown>): Promise<OpResult>;
  win: WindowControls;
}

declare global {
  interface Window {
    winprod?: WinProdPreload;
  }
}

function electronBridge(api: WinProdPreload): Bridge {
  return {
    mode: 'electron',
    listProcesses: () => api.invoke('proc.list') as Promise<OpResult<ProcessInfo[]>>,
    endTask: (pid) => api.invoke('proc.end', { pid }) as Promise<OpResult<null>>,
    runTask: (file, args) => api.invoke('proc.run', { file, args }) as Promise<OpResult<null>>,
    listServices: () => api.invoke('svc.list') as Promise<OpResult<ServiceInfo[]>>,
    serviceControl: (name, action) => api.invoke('svc.control', { name, action }) as Promise<OpResult<null>>,
    setServiceStartup: (name, startupType) => api.invoke('svc.startup', { name, startupType }) as Promise<OpResult<null>>,
    getSystemInfo: () => api.invoke('sys.info') as Promise<OpResult<SystemInfoModel>>,
    exportReport: (fileName, content) =>
      api.invoke('report.export', { fileName, content }) as Promise<OpResult<{ path: string }>>,
    openTool: (tool) => api.invoke('tool.open', { tool }) as Promise<OpResult<null>>,
    openApp: (appId) => void api.invoke('app.open', { appId }),
    goHome: () => void api.invoke('app.home'),
    window: api.win,
  };
}

/* --------------------------- Browser transport ----------------------- */

const TOOL_LABELS: Record<string, string> = {
  taskmgr: 'Task Manager (taskmgr.exe)',
  services: 'Services (services.msc)',
  msinfo32: 'System Information (msinfo32.exe)',
  devmgmt: 'Device Manager (devmgmt.msc)',
  diskmgmt: 'Disk Management (diskmgmt.msc)',
  resmon: 'Resource Monitor (resmon.exe)',
  dxdiag: 'DirectX Diagnostics (dxdiag.exe)',
  control: 'Control Panel (control.exe)',
  cleanmgr: 'Disk Cleanup (cleanmgr.exe)',
  regedit: 'Registry Editor (regedit.exe)',
  cmd: 'Command Prompt (cmd.exe)',
  winupdate: 'Windows Update (ms-settings:windowsupdate)',
};

function browserBridge(): Bridge {
  return {
    mode: 'browser',
    listProcesses: async () => mock.mockProcList(),
    endTask: async (pid) => mock.mockProcEnd(pid),
    runTask: async (file) => mock.mockProcRun(file),
    listServices: async () => mock.mockServiceList(),
    serviceControl: async (name, action) => mock.mockServiceControl(name, action),
    setServiceStartup: async (name, startupType) => mock.mockServiceStartup(name, startupType),
    getSystemInfo: async () => mock.mockSysInfo(),
    exportReport: async (fileName, content) => {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return { ok: true, data: { path: fileName }, demo: true };
    },
    openTool: async (tool) => ({ ok: true, data: null, demo: true }),
    openApp: (appId) => {
      location.href = `${location.pathname}?app=${appId}`;
    },
    goHome: () => {
      location.href = location.pathname;
    },
    window: null,
  };
}

export const bridge: Bridge = window.winprod ? electronBridge(window.winprod) : browserBridge();

/** Human label for a tool id (used in demo-mode notices). */
export function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? tool;
}
