/**
 * Smoke tests: window chrome controls (Electron transport), the full
 * Backstage view, read-only mode and ribbon display behavior.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

let TasksApp: (props: Record<string, never>) => JSX.Element;
let ServicesApp: (props: Record<string, never>) => JSX.Element;

/** Records winprod bridge calls made by the UI. */
const calls: string[] = [];

beforeAll(async () => {
  // Mock the preload API BEFORE importing the app (bridge is module-level).
  const mock = await import('../../shared/mock');
  (window as unknown as { winprod?: unknown }).winprod = {
    invoke: async (op: string) => {
      calls.push(op);
      if (op === 'win.isMaximized') return false;
      switch (op) {
        case 'proc.list':
          return mock.mockProcList();
        case 'svc.list':
          return mock.mockServiceList();
        case 'sys.info':
          return mock.mockSysInfo();
        default:
          return { ok: true, data: null };
      }
    },
    win: {
      minimize: () => calls.push('win.min'),
      toggleMaximize: () => calls.push('win.maxToggle'),
      close: () => calls.push('win.close'),
      isMaximized: () => Promise.resolve(false),
      onMaximized: () => () => undefined,
    },
  };
  ({ TasksApp } = await import('../apps/tasks/TasksApp'));
  ({ ServicesApp } = await import('../apps/services/ServicesApp'));
  const icons = await import('../icons');
  icons.registerOfficeIcons();
});

const present = (m: RegExp | string) => expect(screen.getAllByText(m).length).toBeGreaterThan(0);

describe('Window chrome controls (Electron bridge)', () => {
  it('minimize / maximize / close buttons reach the preload bridge', async () => {
    window.history.pushState({}, '', '/?app=tasks');
    render(<TasksApp />);
    await waitFor(() => present('Run new task'));

    const titlebar = document.querySelector('.ow-wc')!;
    const btns = titlebar.querySelectorAll('button');
    expect(btns.length).toBe(3);

    fireEvent.click(btns[0]); // minimize
    fireEvent.click(btns[1]); // maximize toggle
    fireEvent.click(btns[2]); // close
    expect(calls).toContain('win.min');
    expect(calls).toContain('win.maxToggle');
    expect(calls).toContain('win.close');
  }, 15000);

  it('renders the maximize glyph as an MDL2 2048-grid SVG (not the old 10px box)', async () => {
    window.history.pushState({}, '', '/?app=tasks');
    render(<TasksApp />);
    await waitFor(() => present('Run new task'));
    const holder = document.querySelector('.ow-wc i[data-icon-name="ChromeMaximize"]');
    expect(holder).not.toBeNull();
    const svg = holder!.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 2048 2048');
    expect(svg?.querySelector('path')?.getAttribute('d')).toContain('M1843 205v1638');
  }, 15000);
});

describe('Backstage view (Office 2016)', () => {
  it('opens from the File tab with nav, Properties and Recent activity columns', async () => {
    window.history.pushState({}, '', '/?app=tasks');
    render(<TasksApp />);
    await waitFor(() => present('Run new task'));

    screen.getByText('File').click();
    await waitFor(() => present('Properties'));
    present('Recent activity');
    present('Read-only mode');
    present('Refresh');
    // Nav items
    present('Open');
    present('Export');
    present('Account');
    present('Options');
    // Info page lists live properties
    present('Processes');
  }, 15000);

  it('Export page lists the app export; Options opens the dialog with toggles', async () => {
    window.history.pushState({}, '', '/?app=tasks');
    render(<TasksApp />);
    await waitFor(() => present('Run new task'));

    screen.getByText('File').click();
    await waitFor(() => present('Properties'));

    screen.getAllByText('Export')[0].closest('button')!.click();
    await waitFor(() => present('Export process list (CSV)'));

    screen.getAllByText('Options')[0].closest('button')!.click();
    await waitFor(() => present('Show ScreenTips on ribbon controls'));
    present('Enable animations');
  }, 15000);

  it('Read-only mode disables End task and shows the status chip', async () => {
    window.history.pushState({}, '', '/?app=services');
    render(<ServicesApp />);
    await waitFor(() => present('Windows Audio'));

    // Open backstage, toggle read-only
    screen.getByText('File').click();
    await waitFor(() => present('Read-only mode'));
    screen.getAllByText('Read-only mode')[0].closest('button')!.click();

    // Close backstage (Esc)
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryAllByText('Properties').length).toBe(0));

    await waitFor(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.className.includes('rb-lg-split') || b.className.includes('rbbtn-lg'),
      );
      expect(btn).not.toBeNull();
    });
    const anyLarge = Array.from(document.querySelectorAll('button.rbbtn-lg'));
    const stop = anyLarge.find((b) => b.textContent?.includes('Stop'));
    expect(stop).toBeDefined();
    expect((stop as HTMLButtonElement).disabled).toBe(true);
    present('Read-only'); // status bar chip
  }, 15000);
});

describe('Ribbon animations (Office 2016 motion)', () => {
  it('collapses by animating the wrapper height, re-expands pinned', async () => {
    window.history.pushState({}, '', '/?app=tasks');
    render(<TasksApp />);
    await waitFor(() => present('Run new task'));

    // pinned ribbon mounted inside the height-animated wrapper
    const wrap = () => document.querySelector('.ow-ribbonwrap');
    expect(wrap()).not.toBeNull();

    // click active tab -> height 96 -> 0 animation, then unmount
    const tab = document.querySelector('.ow-tabs button.ow-tab.active') as HTMLButtonElement;
    expect(tab?.textContent).toBe('Home');
    fireEvent.click(tab);
    await waitFor(() => expect(document.querySelector('.ow-ribbonwrap.closing')).not.toBeNull());
    await waitFor(() => expect(wrap()).toBeNull(), { timeout: 3000 });

    // double-click a tab pins the ribbon again -> height 0 -> 96 animation
    const homeTab = Array.from(document.querySelectorAll('.ow-tabs button.ow-tab')).find(
      (b) => b.textContent === 'Home',
    ) as HTMLButtonElement;
    fireEvent.doubleClick(homeTab);
    await waitFor(() => expect(document.querySelector('.ow-ribbonwrap.opening')).not.toBeNull());
    await waitFor(() => {
      const w = wrap();
      expect(w).not.toBeNull();
      expect(w!.className).not.toContain('opening');
      expect(w!.className).not.toContain('closing');
    });
  }, 15000);

  it('auto-hide mode hides the tab strip and reveals it from the top hotzone', async () => {
    window.history.pushState({}, '', '/?app=tasks');
    render(<TasksApp />);
    await waitFor(() => present('Run new task'));

    // Ribbon Display Options -> Auto-hide
    // (the QAT customize menu stays mounted but hidden, so pick the item
    // from the menu that was just opened — the last one in the DOM)
    fireEvent.click(document.querySelector('.rbdisp') as HTMLButtonElement);
    const items = await waitFor(() => screen.getAllByText('Auto-hide the Ribbon'));
    fireEvent.click(items[items.length - 1]);
    await waitFor(() =>
      expect(document.querySelector('.ow')!.className).toContain('mode-autohide'),
    );

    // tab strip collapsed, hotzone present
    expect(document.querySelector('.ow-tabs')!.className).not.toContain('revealed');
    const hotzone = document.querySelector('.ohotzone');
    expect(hotzone).not.toBeNull();

    // moving the mouse to the top reveals tabs + drops the overlay ribbon
    fireEvent.mouseEnter(hotzone!);
    await waitFor(() =>
      expect(document.querySelector('.ow-tabs')!.className).toContain('revealed'),
    );
    await waitFor(() => expect(document.querySelector('.ow-ribbon.overlay')).not.toBeNull());

    // clicking in the content hides it again
    fireEvent.mouseDown(document.querySelector('.ow-content')!);
    await waitFor(() => expect(document.querySelector('.ow-ribbon.overlay')).toBeNull(), {
      timeout: 3000,
    });
  }, 15000);
});
