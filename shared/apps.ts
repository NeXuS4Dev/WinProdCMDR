/**
 * WinProdCMDR — application registry shared by main & renderer.
 * Each management app carries its own classic Office 2016 theme color,
 * exactly like Word (blue), Excel (green) and PowerPoint (orange).
 */

export type AppId = 'tasks' | 'services' | 'sysinfo';

export interface AppPalette {
  /** Ribbon/title-bar/status-bar color, e.g. Excel green #217346. */
  primary: string;
  /** Darker shade (backstage selected, hover accents). */
  dark: string;
  /** Darkest shade (pressed states, backstage active item). */
  darker: string;
}

export interface AppMeta {
  id: AppId;
  name: string;
  short: string;
  tagline: string;
  description: string;
  /** Registered (SVG MDL2) icon name used on tiles & backstage. */
  icon: string;
  palette: AppPalette;
  window: {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
    title: string;
  };
}

export const SUITE_NAME = 'WinProdCMDR';
export const SUITE_LONG_NAME = 'Windows Production Commander';
export const SUITE_VERSION = '1.0.1';

export const APPS: Record<AppId, AppMeta> = {
  tasks: {
    id: 'tasks',
    name: 'Task Manager',
    short: 'Tasks',
    tagline: 'Processes & performance',
    description:
      'Monitor running processes, CPU and memory usage in real time. End unresponsive tasks, run new programs and watch live performance charts — all from a classic ribbon.',
    icon: 'TaskManager',
    palette: { primary: '#217346', dark: '#1b5e38', darker: '#154a2c' }, // Excel green
    window: {
      width: 1180,
      height: 760,
      minWidth: 960,
      minHeight: 620,
      title: 'Task Manager — WinProdCMDR',
    },
  },
  services: {
    id: 'services',
    name: 'Services Manager',
    short: 'Services',
    tagline: 'Control Windows services',
    description:
      'Start, stop and restart any Windows service, change startup types and inspect log-on accounts. The full services.msc experience, wrapped in a ribbon.',
    icon: 'Settings',
    palette: { primary: '#d24726', dark: '#b53a1d', darker: '#8f2f16' }, // PowerPoint orange
    window: {
      width: 1180,
      height: 740,
      minWidth: 960,
      minHeight: 620,
      title: 'Services — WinProdCMDR',
    },
  },
  sysinfo: {
    id: 'sysinfo',
    name: 'System Info',
    short: 'System',
    tagline: 'Hardware & OS report',
    description:
      'A complete system summary: OS edition and build, processor, memory, storage, network and graphics. Copy or export the report, and launch Windows tools from the ribbon.',
    icon: 'Info',
    palette: { primary: '#2b579a', dark: '#234a85', darker: '#1c3a67' }, // Word blue
    window: {
      width: 1180,
      height: 780,
      minWidth: 960,
      minHeight: 620,
      title: 'System Info — WinProdCMDR',
    },
  },
};

export const APP_LIST: AppMeta[] = [APPS.tasks, APPS.services, APPS.sysinfo];

export function isAppId(v: string | null | undefined): v is AppId {
  return v === 'tasks' || v === 'services' || v === 'sysinfo';
}
