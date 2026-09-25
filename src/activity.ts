/**
 * WinProdCMDR — session activity log.
 * Powers the "Recent activity" column on the Backstage Info page, exactly
 * where Office 2016 lists recent documents / recent activity.
 */

import * as React from 'react';

export interface ActivityEntry {
  id: number;
  time: number;
  text: string;
}

const MAX = 60;
let entries: ActivityEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

export function logActivity(text: string): void {
  entries = [...entries.slice(-(MAX - 1)), { id: nextId++, time: Date.now(), text }];
  for (const l of listeners) l();
}

function getSnapshot(): ActivityEntry[] {
  return entries;
}

export function useActivity(): ActivityEntry[] {
  return React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot,
    getSnapshot,
  );
}

export function formatActivityTime(t: number): string {
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
