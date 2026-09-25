/**
 * WinProdCMDR — IPC operation dispatcher.
 *
 * On Windows every operation is executed with real PowerShell (Get-Process,
 * Get-CimInstance, Start/Stop-Service, Set-Service...). Elsewhere the suite
 * falls back to the built-in simulation so the UI stays fully explorable.
 */

import os from 'node:os';
import { BrowserWindow, dialog } from 'electron';
import * as fs from 'node:fs/promises';
import * as mock from '../shared/mock';
import type {
  OpResult,
  ProcessInfo,
  ServiceAction,
  ServiceStartupType,
  SystemInfoModel,
} from '../shared/types';
import { isWindows, runPS } from './ps';

const demo = <T>(data: T): OpResult<T> => ({ ok: true, data, demo: true });

/* ------------------------------------------------------------------ */
/* Processes                                                           */
/* ------------------------------------------------------------------ */

const lastCpu = new Map<number, { sec: number; t: number }>();
let lastTick = 0;

async function realProcList(): Promise<OpResult<ProcessInfo[]>> {
  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$items = Get-Process | ForEach-Object {
  [pscustomobject]@{
    pid  = $_.Id
    name = $_.ProcessName
    status = $(if ($_.Responding) { 'Running' } else { 'Not responding' })
    cpu  = $(if ($_.CPU -ge 0) { [math]::Round($_.CPU, 2) } else { 0 })
    mem  = [math]::Round($_.WorkingSet64 / 1MB, 1)
    title = $_.MainWindowTitle
    description = $_.Description
    company = $_.Company
  }
}
ConvertTo-Json -InputObject @($items) -Compress -Depth 3
`.trim();

  const res = await runPS(script, {}, 20_000);
  if (!res.ok) return { ok: false, error: res.error };
  const rows = (res.data as Array<Record<string, unknown>>) ?? [];
  const now = Date.now();
  const dt = lastTick ? Math.max(0.5, (now - lastTick) / 1000) : 1.5;
  const cores = Math.max(1, os.cpus().length);
  lastTick = now;

  const list: ProcessInfo[] = rows.map((r) => {
    const pid = Number(r.pid ?? -1);
    const sec = Number(r.cpu ?? 0);
    const prev = lastCpu.get(pid);
    lastCpu.set(pid, { sec, t: now });
    const cpuPercent = prev ? Math.max(0, Math.min(100 * cores, ((sec - prev.sec) / dt / cores) * 100)) : 0;
    return {
      pid,
      name: String(r.name ?? ''),
      status: String(r.status ?? 'Running'),
      cpu: sec,
      cpuPercent: Math.round(cpuPercent * 10) / 10,
      mem: Number(r.mem ?? 0),
      title: r.title ? String(r.title) : undefined,
      description: r.description ? String(r.description) : undefined,
      company: r.company ? String(r.company) : undefined,
    };
  });
  return { ok: true, data: list };
}

async function realProcEnd(pid: number): Promise<OpResult<null>> {
  if (!Number.isInteger(pid) || pid <= 0 || pid === 4) {
    return { ok: false, error: 'Access is denied. Critical system processes cannot be ended.' };
  }
  const res = await runPS(
    `try { Stop-Process -Id $env:WP_PID -Force -ErrorAction Stop; 'ok' } catch { Write-Error $_; exit 1 }`,
    { WP_PID: String(pid) },
    15_000,
  );
  return res.ok ? { ok: true, data: null } : { ok: false, error: res.error };
}

async function realProcRun(file: string, args?: string): Promise<OpResult<null>> {
  const env: Record<string, string> = { WP_FILE: file };
  if (args) env.WP_ARGS = args;
  const scriptNoArgs = `try { Start-Process -FilePath $env:WP_FILE -ErrorAction Stop; 'ok' } catch { Write-Error $_; exit 1 }`;
  const scriptWithArgs = `try { Start-Process -FilePath $env:WP_FILE -ArgumentList $env:WP_ARGS -ErrorAction Stop; 'ok' } catch { Write-Error $_; exit 1 }`;
  const res = await runPS(args ? scriptWithArgs : scriptNoArgs, env, 15_000);
  return res.ok ? { ok: true, data: null } : { ok: false, error: res.error };
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

async function realServiceList(): Promise<OpResult<unknown>> {
  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$delayed = @{}
Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services' | ForEach-Object {
  $p = Get-ItemProperty -Path $_.PSPath -Name DelayedAutostart -ErrorAction SilentlyContinue
  if ($p -and $p.DelayedAutostart -eq 1) { $delayed[$_.PSChildName] = $true }
}
$items = Get-CimInstance Win32_Service | ForEach-Object {
  $st = [string]$_.StartMode
  if ($st -eq 'Auto' -and $delayed[$_.Name]) { $st = 'Automatic (Delayed)' }
  elseif ($st -eq 'Auto') { $st = 'Automatic' }
  [pscustomobject]@{
    name        = $_.Name
    displayName = $_.DisplayName
    status      = $_.State
    startupType = $st
    account     = $_.StartName
    description = $_.Description
    processId   = $_.ProcessId
  }
}
ConvertTo-Json -InputObject @($items) -Compress -Depth 3
`.trim();

  const res = await runPS(script, {}, 30_000);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, data: res.data };
}

async function realServiceControl(name: string, action: ServiceAction): Promise<OpResult<null>> {
  if (!name || !/^[A-Za-z0-9_.\- ]{1,80}$/.test(name)) {
    return { ok: false, error: 'Invalid service name.' };
  }
  const cmd = action === 'start' ? 'Start-Service' : action === 'stop' ? 'Stop-Service -Force' : 'Restart-Service -Force';
  const script = `try { ${cmd} -Name $env:WP_NAME -ErrorAction Stop; 'ok' } catch { Write-Error $_; exit 1 }`;
  const res = await runPS(script, { WP_NAME: name }, 30_000);
  return res.ok ? { ok: true, data: null } : { ok: false, error: res.error };
}

async function realServiceStartup(name: string, startupType: ServiceStartupType): Promise<OpResult<null>> {
  if (!name || !/^[A-Za-z0-9_.\- ]{1,80}$/.test(name)) {
    return { ok: false, error: 'Invalid service name.' };
  }
  const map: Record<string, string> = {
    Automatic: 'Automatic',
    'Automatic (Delayed)': 'Automatic',
    Manual: 'Manual',
    Disabled: 'Disabled',
  };
  const target = map[String(startupType)];
  if (!target) return { ok: false, error: `Unsupported startup type "${String(startupType)}".` };
  const script = `try { Set-Service -Name $env:WP_NAME -StartupType $env:WP_START -ErrorAction Stop; 'ok' } catch { Write-Error $_; exit 1 }`;
  const res = await runPS(script, { WP_NAME: name, WP_START: target }, 20_000);
  if (!res.ok) return { ok: false, error: res.error };
  // Delayed-start flag needs a registry write; Set-Service cannot set it.
  if (String(startupType) === 'Automatic (Delayed)') {
    await runPS(
      `try { Set-ItemProperty -Path ('HKLM:\\SYSTEM\\CurrentControlSet\\Services\\' + $env:WP_NAME) -Name DelayedAutostart -Value 1 -Type DWord; 'ok' } catch { Write-Error $_; exit 1 }`,
      { WP_NAME: name },
      15_000,
    );
  }
  return { ok: true, data: null };
}

/* ------------------------------------------------------------------ */
/* System info                                                         */
/* ------------------------------------------------------------------ */

async function realSysInfo(): Promise<OpResult<SystemInfoModel>> {
  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = ([Security.Principal.WindowsPrincipal]$id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$disks = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 -or $_.DriveType -eq 2 } | ForEach-Object {
  [pscustomobject]@{
    letter  = $_.DeviceID
    label   = $_.VolumeName
    fs      = $_.FileSystem
    type    = $(if ($_.DriveType -eq 3) { 'Fixed' } else { 'Removable' })
    totalGB = [math]::Round($_.Size / 1GB, 1)
    freeGB  = [math]::Round($_.FreeSpace / 1GB, 1)
  }
}
$nics = Get-CimInstance Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=True' | ForEach-Object {
  [pscustomobject]@{
    name = $_.Description
    mac  = $_.MACAddress
    ips  = @($_.IPAddress)
  }
}
$gpus = @(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name)
[pscustomobject]@{
  demo        = $false
  isAdmin     = $isAdmin
  computerName= $env:COMPUTERNAME
  userName    = $cs.UserName
  osName      = $os.Caption
  osVersion   = $os.Version
  osBuild     = $os.BuildNumber
  arch        = $os.OSArchitecture
  installDate = $(if ($os.InstallDate) { $os.InstallDate.ToString('yyyy-MM-dd') } else { $null })
  lastBoot    = $(if ($os.LastBootUpTime) { $os.LastBootUpTime.ToString('yyyy-MM-dd HH:mm') } else { $null })
  uptimeSec   = [long](((Get-Date) - $os.LastBootUpTime).TotalSeconds)
  cpuName     = $(if ($cpu.Name) { $cpu.Name.Trim() } else { '' })
  cpuCores    = $(if ($cpu.NumberOfCores) { [int]$cpu.NumberOfCores } else { 0 })
  cpuThreads  = $(if ($cpu.NumberOfLogicalProcessors) { [int]$cpu.NumberOfLogicalProcessors } else { 0 })
  cpuLoad     = $(if ($cpu.LoadPercentage) { [int]$cpu.LoadPercentage } else { 0 })
  cpuClockMHz = $(if ($cpu.MaxClockSpeed) { [int]$cpu.MaxClockSpeed } else { 0 })
  memTotalGB  = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
  memFreeGB   = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
  pageTotalGB = [math]::Round($os.SizeStoredInPagingFiles / 1MB, 2)
  drives      = @($disks)
  adapters    = @($nics)
  gpus        = $gpus
  procCount   = (Get-Process).Count
  svcCount    = (Get-Service).Count
} | ConvertTo-Json -Compress -Depth 4
`.trim();

  const res = await runPS(script, {}, 30_000);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, data: res.data as SystemInfoModel };
}

/* ------------------------------------------------------------------ */
/* External tools (whitelisted)                                        */
/* ------------------------------------------------------------------ */

const TOOLS: Record<string, string> = {
  taskmgr: 'taskmgr.exe',
  services: 'services.msc',
  msinfo32: 'msinfo32.exe',
  devmgmt: 'devmgmt.msc',
  diskmgmt: 'diskmgmt.msc',
  resmon: 'resmon.exe',
  dxdiag: 'dxdiag.exe',
  control: 'control.exe',
  cleanmgr: 'cleanmgr.exe',
  regedit: 'regedit.exe',
  cmd: 'cmd.exe',
  winupdate: 'ms-settings:windowsupdate',
};

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export type OpPayload = { op: string } & Record<string, unknown>;

export async function handleOp(payload: OpPayload): Promise<OpResult> {
  const live = isWindows();
  try {
    switch (payload.op) {
      case 'proc.list':
        return live ? await realProcList() : demo(mock.mockProcList().data ?? []);

      case 'proc.end':
        return live ? await realProcEnd(Number(payload.pid)) : mock.mockProcEnd(Number(payload.pid));

      case 'proc.run':
        return live
          ? await realProcRun(String(payload.file ?? ''), payload.args ? String(payload.args) : undefined)
          : mock.mockProcRun(String(payload.file ?? ''));

      case 'svc.list':
        return live ? await realServiceList() : demo(mock.mockServiceList().data ?? []);

      case 'svc.control':
        return live
          ? await realServiceControl(String(payload.name ?? ''), String(payload.action ?? '') as ServiceAction)
          : mock.mockServiceControl(String(payload.name ?? ''), String(payload.action ?? '') as ServiceAction);

      case 'svc.startup':
        return live
          ? await realServiceStartup(String(payload.name ?? ''), String(payload.startupType ?? ''))
          : mock.mockServiceStartup(String(payload.name ?? ''), String(payload.startupType ?? ''));

      case 'sys.info':
        return live ? await realSysInfo() : mock.mockSysInfo();

      case 'tool.open': {
        const tool = String(payload.tool ?? '');
        const target = TOOLS[tool];
        if (!target) return { ok: false, error: `Unknown tool "${tool}".` };
        if (!live) return demo(null);
        const res = await runPS(
          `try { Start-Process -FilePath $env:WP_TOOL -ErrorAction Stop; 'ok' } catch { Write-Error $_; exit 1 }`,
          { WP_TOOL: target },
          15_000,
        );
        return res.ok ? { ok: true, data: null } : { ok: false, error: res.error };
      }

      default:
        return { ok: false, error: `Unknown operation "${payload.op}".` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Report export (save dialog + file write)                            */
/* ------------------------------------------------------------------ */

export async function exportReport(
  event: Electron.IpcMainInvokeEvent,
  fileName: string,
  content: string,
): Promise<OpResult<{ path: string }>> {
  const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_') || 'report.txt';
  const result = await dialog.showSaveDialog(win!, {
    title: 'Export report',
    defaultPath: safeName,
    buttonLabel: 'Save',
  });
  if (result.canceled || !result.filePath) return { ok: true, data: { path: '' } }; // canceled, not an error
  try {
    await fs.writeFile(result.filePath, content, 'utf8');
    return { ok: true, data: { path: result.filePath } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
