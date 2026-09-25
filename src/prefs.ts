/**
 * WinProdCMDR — suite preferences store (Office "Options" backing store).
 *
 * `screentips` and `animations` persist in localStorage (like Office options);
 * `readOnly` is a session-only safety switch toggled from the Backstage Info
 * page that disables every action which modifies the system.
 */

import * as React from 'react';

export interface Prefs {
  screentips: boolean;
  animations: boolean;
  readOnly: boolean;
}

const KEY = 'winprod.prefs';

function loadPersisted(): Pick<Prefs, 'screentips' | 'animations'> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return {
        screentips: p.screentips !== false,
        animations: p.animations !== false,
      };
    }
  } catch {
    /* ignore */
  }
  return { screentips: true, animations: true };
}

let state: Prefs = { ...loadPersisted(), readOnly: false };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getPrefs(): Prefs {
  return state;
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  state = { ...state, [key]: value };
  if (key !== 'readOnly') {
    try {
      localStorage.setItem(KEY, JSON.stringify({ screentips: state.screentips, animations: state.animations }));
    } catch {
      /* ignore */
    }
  }
  emit();
}

export function usePrefs(): Prefs {
  return React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getPrefs,
    getPrefs,
  );
}
