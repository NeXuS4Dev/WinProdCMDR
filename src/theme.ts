/**
 * WinProdCMDR — theming.
 * Bridges the classic Office 2016 palette into Fluent UI v8's theme engine so
 * built-in components (DetailsList, ContextualMenu, Dialog, MessageBar…)
 * automatically pick up the per-app Office color.
 */

import { createTheme, loadTheme } from '@fluentui/react';
import type { AppMeta, AppPalette } from '../shared/apps';

export const OFFICE_FONT_STACK =
  "'Segoe UI', 'Segoe UI Web (West European)', system-ui, 'Helvetica Neue', Arial, sans-serif";

/* ------------------------------ color helpers ------------------------ */

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((v) => Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, '0')).join('');
}

/** Mix a color towards white (t>0) or black (t<0). */
export function shade(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => (t >= 0 ? c + (255 - c) * t : c * (1 + t));
  return rgbToHex([f(r), f(g), f(b)]);
}

/** Blend two colors 50/50 (used to gray out inactive window chrome). */
export function blend(a: string, b: string): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex([(r1 + r2) / 2, (g1 + g2) / 2, (b1 + b2) / 2]);
}

/* ------------------------------ Fluent theme ------------------------- */

export function applyOfficeTheme(meta: AppMeta): void {
  const p: AppPalette = meta.palette;
  loadTheme(
    createTheme({
      palette: {
        themePrimary: p.primary,
        themeLighterAlt: shade(p.primary, 0.94),
        themeLighter: shade(p.primary, 0.86),
        themeLight: shade(p.primary, 0.72),
        themeTertiary: shade(p.primary, 0.46),
        themeSecondary: shade(p.primary, 0.22),
        themeDarkAlt: p.dark,
        themeDark: p.darker,
        themeDarker: shade(p.darker, -0.15),
        neutralDark: '#21201c',
        neutralPrimary: '#333333',
        neutralPrimaryAlt: '#3b3a39',
        neutralSecondary: '#605e5c',
        neutralSecondaryAlt: '#797775',
        neutralTertiary: '#a19f9d',
        neutralTertiaryAlt: '#c8c6c4',
        neutralQuaternary: '#d2d0ce',
        neutralQuaternaryAlt: '#e1dfdd',
        neutralLight: '#f3f2f1',
        neutralLighter: '#faf9f8',
        black: '#000000',
        white: '#ffffff',
      },
      defaultFontStyle: { fontFamily: OFFICE_FONT_STACK, fontSize: 12 },
    }),
  );
}
