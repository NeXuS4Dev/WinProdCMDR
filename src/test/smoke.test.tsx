/**
 * Smoke tests: every screen of the suite mounts and shows its core chrome,
 * using the browser (demo data) transport.
 */

import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import '../icons';
import { StartScreen } from '../start/StartScreen';
import { TasksApp } from '../apps/tasks/TasksApp';
import { ServicesApp } from '../apps/services/ServicesApp';
import { SysInfoApp } from '../apps/sysinfo/SysInfoApp';

function setup(url: string) {
  window.history.pushState({}, '', url);
}

const present = (m: RegExp | string) => expect(screen.getAllByText(m).length).toBeGreaterThan(0);

describe('App Browser (start screen)', () => {
  it('renders the launcher with the three app tiles', async () => {
    setup('/');
    render(<StartScreen />);
    await waitFor(() => present(/System snapshot/));
    present('Task Manager');
    present('Services Manager');
    present('System Info');
    present(/Demo data/);
    present(/Version 1\.\d+\.\d+/);
  });
});

describe('Task Manager', () => {
  it('renders ribbon chrome and the live process list', async () => {
    setup('/?app=tasks');
    render(<TasksApp />);
    // Office chrome
    present('File');
    present('Home');
    present('View');
    // Ribbon controls
    await waitFor(() => present('Run new task'));
    present(/Update speed/);
    // Data arrives (demo process list)
    await waitFor(() => present('chrome'), { timeout: 5000 });
    present(/Processes:/);
  }, 15000);

  it('opens the Performance view', async () => {
    setup('/?app=tasks');
    render(<TasksApp />);
    await waitFor(() => present(/Performance view/));
    screen.getAllByText(/Performance view/i)[0].closest('button')!.click();
    await waitFor(() => present('Utilization over 2 minutes'));
    present(/Top processes/);
  }, 15000);
});

describe('Services Manager', () => {
  it('renders the service list with live demo services', async () => {
    setup('/?app=services');
    render(<ServicesApp />);
    present('File');
    await waitFor(() => present(/Startup type/));
    // Demo services arrive
    await waitFor(() => present('Windows Audio'));
    present(/Services:/);
    present(/Running:/);
  }, 15000);
});

describe('System Info', () => {
  it('renders the report page with sections and the Tools tab', async () => {
    setup('/?app=sysinfo');
    render(<SysInfoApp />);
    await waitFor(() => present('System Summary'));
    present('Processor');
    present(/DESKTOP-W7PRDC/i);
    // Tools tab exists in the tab strip; activating it shows its groups
    present('Tools');
    screen.getByText('Tools').click();
    await waitFor(() => present('Windows tools'));
    present('Disk Management');
    present('Disk Cleanup');
  }, 15000);
});
