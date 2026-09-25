/**
 * WinProdCMDR — shared data types between the Electron main process and the renderer.
 */

export interface ProcessInfo {
  pid: number;
  name: string;
  status: string; // 'Running' | 'Not responding' | ...
  /** Cumulative CPU seconds (real mode) or instantaneous % (mock). */
  cpu: number;
  /** Instantaneous CPU load %, computed by the main process. */
  cpuPercent: number;
  /** Working set in MB. */
  mem: number;
  title?: string;
  description?: string;
  company?: string;
  username?: string;
}

export type ServiceStartupType =
  | 'Automatic'
  | 'Automatic (Delayed)'
  | 'Manual'
  | 'Disabled'
  | string;

export interface ServiceInfo {
  name: string;
  displayName: string;
  status: string; // Running | Stopped | Paused | Start Pending | Stop Pending ...
  startupType: ServiceStartupType;
  account?: string;
  description?: string;
  processId?: number;
}

export interface DriveInfo {
  letter: string;
  label?: string;
  fs?: string;
  type: string;
  totalGB: number;
  freeGB: number;
}

export interface AdapterInfo {
  name: string;
  mac?: string;
  ips: string[];
}

export interface SystemInfoModel {
  demo: boolean;
  isAdmin?: boolean;
  computerName: string;
  userName?: string;
  osName: string;
  osVersion: string;
  osBuild: string;
  arch: string;
  installDate?: string;
  lastBoot?: string;
  uptimeSec: number;
  cpuName: string;
  cpuCores: number;
  cpuThreads: number;
  cpuLoad: number;
  cpuClockMHz?: number;
  memTotalGB: number;
  memFreeGB: number;
  pageTotalGB?: number;
  drives: DriveInfo[];
  adapters: AdapterInfo[];
  gpus: string[];
  procCount?: number;
  svcCount?: number;
}

/** Standard operation result envelope for every IPC call. */
export interface OpResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  /** True when data is simulated (non-Windows dev machine / browser preview). */
  demo?: boolean;
}

export type ServiceAction = 'start' | 'stop' | 'restart';
