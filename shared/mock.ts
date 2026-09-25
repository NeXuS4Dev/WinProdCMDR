/**
 * WinProdCMDR — simulated Windows data engine.
 *
 * Pure TypeScript with zero Electron imports so it can be used in three places:
 *  - the Electron main process when PowerShell is unavailable (non-Windows dev),
 *  - the browser preview (`npm run web`),
 *  - anywhere a safe fallback is required.
 *
 * Data is deliberately realistic: real process/service names, plausible
 * values with random walks so live views feel alive.
 */

import type {
  OpResult,
  ProcessInfo,
  ServiceAction,
  ServiceInfo,
  SystemInfoModel,
} from './types';

const ok = <T>(data: T): OpResult<T> => ({ ok: true, data, demo: true });
const fail = (error: string): OpResult<never> => ({ ok: false, error, demo: true });

/* ------------------------------------------------------------------ */
/* Processes                                                           */
/* ------------------------------------------------------------------ */

interface ProcSeed {
  name: string;
  mem: number;
  cpu?: number;
  company?: string;
  desc?: string;
  title?: string;
  count?: number;
  user?: string;
}

const PROC_SEEDS: ProcSeed[] = [
  { name: 'System', mem: 0.1, company: 'Microsoft', desc: 'Windows kernel', user: 'SYSTEM' },
  { name: 'Registry', mem: 24, company: 'Microsoft', user: 'SYSTEM' },
  { name: 'csrss.exe', mem: 4.6, company: 'Microsoft', desc: 'Client Server Runtime Process', user: 'SYSTEM' },
  { name: 'dwm.exe', mem: 96, company: 'Microsoft', desc: 'Desktop Window Manager', user: 'DWM-1' },
  { name: 'svchost.exe', mem: 18, company: 'Microsoft', desc: 'Host Process for Windows Services', count: 14, user: 'SYSTEM' },
  { name: 'svchost.exe', mem: 62, company: 'Microsoft', desc: 'Host Process for Windows Services', count: 3, user: 'NETWORK' },
  { name: 'explorer.exe', mem: 84, cpu: 0.4, company: 'Microsoft', desc: 'Windows Explorer', title: 'File Explorer', user: 'shay' },
  { name: 'RuntimeBroker.exe', mem: 12, company: 'Microsoft', count: 2, user: 'shay' },
  { name: 'SearchApp.exe', mem: 58, company: 'Microsoft', title: 'Search', user: 'shay' },
  { name: 'ShellExperienceHost.exe', mem: 44, company: 'Microsoft', title: 'Start', user: 'shay' },
  { name: 'chrome.exe', mem: 312, cpu: 2.1, company: 'Google', desc: 'Google Chrome', title: 'WinProdCMDR — Chrome', count: 6, user: 'shay' },
  { name: 'msedge.exe', mem: 188, cpu: 0.9, company: 'Microsoft', desc: 'Microsoft Edge', count: 4, user: 'shay' },
  { name: 'Code.exe', mem: 402, cpu: 1.4, company: 'Microsoft', desc: 'Visual Studio Code', title: 'ribbon.tsx — WinProdCMDR', count: 3, user: 'shay' },
  { name: 'WindowsTerminal.exe', mem: 64, company: 'Microsoft', title: 'Developer Command Prompt', user: 'shay' },
  { name: 'OUTLOOK.EXE', mem: 224, cpu: 0.7, company: 'Microsoft', desc: 'Microsoft Outlook', title: 'Inbox — outlook', user: 'shay' },
  { name: 'EXCEL.EXE', mem: 148, cpu: 0.3, company: 'Microsoft', desc: 'Microsoft Excel', title: 'Book1 — Excel', user: 'shay' },
  { name: 'WINWORD.EXE', mem: 132, company: 'Microsoft', desc: 'Microsoft Word', title: 'Document1 — Word', user: 'shay' },
  { name: 'POWERPNT.EXE', mem: 96, company: 'Microsoft', desc: 'Microsoft PowerPoint', user: 'shay' },
  { name: 'Teams.exe', mem: 356, cpu: 1.1, company: 'Microsoft', desc: 'Microsoft Teams', count: 2, user: 'shay' },
  { name: 'Discord.exe', mem: 210, cpu: 0.6, company: 'Discord Inc.', count: 2, user: 'shay' },
  { name: 'Spotify.exe', mem: 176, cpu: 0.5, company: 'Spotify AB', user: 'shay' },
  { name: 'steam.exe', mem: 92, company: 'Valve', title: 'Steam', user: 'shay' },
  { name: 'steamwebhelper.exe', mem: 264, company: 'Valve', count: 3, user: 'shay' },
  { name: 'audiodg.exe', mem: 8.4, company: 'Microsoft', desc: 'Windows Audio Device Graph', user: 'LOCAL' },
  { name: 'fontdrvhost.exe', mem: 2.2, company: 'Microsoft', count: 2, user: 'SYSTEM' },
  { name: 'lsass.exe', mem: 14, company: 'Microsoft', desc: 'Local Security Authority Process', user: 'SYSTEM' },
  { name: 'services.exe', mem: 9.1, company: 'Microsoft', user: 'SYSTEM' },
  { name: 'smss.exe', mem: 1.1, company: 'Microsoft', user: 'SYSTEM' },
  { name: 'wininit.exe', mem: 2.4, company: 'Microsoft', user: 'SYSTEM' },
  { name: 'winlogon.exe', mem: 6.8, company: 'Microsoft', user: 'SYSTEM' },
  { name: 'taskhostw.exe', mem: 11, company: 'Microsoft', user: 'shay' },
  { name: 'ctfmon.exe', mem: 8.9, company: 'Microsoft', user: 'shay' },
  { name: 'sihost.exe', mem: 16, company: 'Microsoft', user: 'shay' },
  { name: 'WUDFHost.exe', mem: 6.2, company: 'Microsoft', count: 2, user: 'SYSTEM' },
  { name: 'MsMpEng.exe', mem: 168, cpu: 1.8, company: 'Microsoft', desc: 'Antimalware Service Executable', user: 'SYSTEM' },
  { name: 'SecurityHealthService.exe', mem: 12, company: 'Microsoft', user: 'SYSTEM' },
  { name: 'OneDrive.exe', mem: 88, cpu: 0.2, company: 'Microsoft', title: 'Microsoft OneDrive', user: 'shay' },
  { name: 'WidgetService.exe', mem: 26, company: 'Microsoft', user: 'shay' },
  { name: 'phoneExperienceHost.exe', mem: 74, company: 'Microsoft', title: 'Phone Link', user: 'shay' },
  { name: 'GameBar.exe', mem: 52, company: 'Microsoft', user: 'shay' },
  { name: 'legacyupdate.exe', mem: 34, cpu: 0.1, title: 'Legacy Updater (Not Responding)', user: 'shay' },
  { name: 'conhost.exe', mem: 5.6, company: 'Microsoft', count: 2, user: 'shay' },
  { name: 'sqlservr.exe', mem: 512, cpu: 0.9, company: 'Microsoft', desc: 'SQL Server', user: 'SYSTEM' },
  { name: 'docker-desktop.exe', mem: 148, company: 'Docker Inc.', user: 'shay' },
];

interface MockProc extends ProcessInfo {
  _seed?: ProcSeed;
}

let procs: MockProc[] | null = null;
let nextPid = 1000;

function initProcs(): MockProc[] {
  const list: MockProc[] = [];
  for (const seed of PROC_SEEDS) {
    const n = seed.count ?? 1;
    for (let i = 0; i < n; i++) {
      list.push({
        pid: nextPid++,
        name: seed.name,
        status: seed.name === 'legacyupdate.exe' ? 'Not responding' : 'Running',
        cpu: seed.cpu ?? 0,
        cpuPercent: seed.cpu ?? 0,
        mem: Math.max(0.4, seed.mem * (0.75 + Math.random() * 0.5)),
        title: i === 0 ? seed.title : undefined,
        description: seed.desc,
        company: seed.company,
        username: seed.user,
        _seed: seed,
      });
    }
  }
  return list;
}

function tickProcs() {
  for (const p of procs!) {
    const base = p._seed?.cpu ?? 0;
    // Random walk that is pulled back towards the seed baseline.
    p.cpuPercent = Math.max(0, Math.min(38, p.cpuPercent + (Math.random() - 0.5) * 3 + (base - p.cpuPercent) * 0.12));
    p.cpu = p.cpuPercent; // mock exposes instantaneous %
    p.mem = Math.max(0.4, p.mem * (1 + (Math.random() - 0.5) * 0.04));
  }
}

export function mockProcList(): OpResult<ProcessInfo[]> {
  if (!procs) procs = initProcs();
  tickProcs();
  return ok(procs.map(({ _seed, ...p }) => p));
}

export function mockProcEnd(pid: number): OpResult<null> {
  if (pid === 0 || pid === 4) return fail(`Access is denied. (pid ${pid})`);
  if (!procs) procs = initProcs();
  const idx = procs.findIndex((p) => p.pid === pid);
  if (idx === -1) return fail(`No process is running with the id ${pid}.`);
  procs.splice(idx, 1);
  return ok(null);
}

export function mockProcRun(file: string): OpResult<null> {
  if (!procs) procs = initProcs();
  const base = file.replace(/^.*[\\/]/, '').replace(/\.exe$/i, '');
  const p: MockProc = {
    pid: nextPid++,
    name: base ? `${base}.exe` : file,
    status: 'Running',
    cpu: 0.2,
    cpuPercent: 0.2,
    mem: 12 + Math.random() * 30,
    username: 'shay',
  };
  procs.push(p);
  return ok(null);
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

type SvcSeed = [name: string, display: string, status: string, start: ServiceInfo['startupType'], account?: string, desc?: string];

const SVC_SEEDS: SvcSeed[] = [
  ['Audiosrv', 'Windows Audio', 'Running', 'Automatic', 'LocalSystem', 'Manages audio for Windows-based programs.'],
  ['AudioEndpointBuilder', 'Windows Audio Endpoint Builder', 'Running', 'Automatic', 'LocalSystem'],
  ['BFE', 'Base Filtering Engine', 'Running', 'Automatic', 'LocalSystem', 'The BFE service is a service that manages firewall and Internet Protocol security (IPsec) policies.'],
  ['BITS', 'Background Intelligent Transfer Service', 'Stopped', 'Manual', 'LocalSystem', 'Transfers files in the background using idle network bandwidth.'],
  ['BrokerInfrastructure', 'Background Tasks Infrastructure Service', 'Running', 'Automatic', 'LocalSystem'],
  ['CDPUserSvc', 'CDP User Service', 'Running', 'Automatic (Delayed)', 'LocalSystem'],
  ['CryptSvc', 'Cryptographic Services', 'Running', 'Automatic', 'LocalSystem'],
  ['DcomLaunch', 'DCOM Server Process Launcher', 'Running', 'Automatic', 'LocalSystem'],
  ['Dhcp', 'DHCP Client', 'Running', 'Automatic', 'LocalService'],
  ['Dnscache', 'DNS Client', 'Running', 'Automatic', 'NetworkService'],
  ['DoSvc', 'Delivery Optimization', 'Running', 'Automatic (Delayed)', 'LocalSystem'],
  ['DPS', 'Diagnostic Policy Service', 'Running', 'Automatic', 'LocalService'],
  ['DsmSvc', 'Device Setup Manager', 'Stopped', 'Manual', 'LocalSystem'],
  ['EventLog', 'Windows Event Log', 'Running', 'Automatic', 'LocalService'],
  ['EventSystem', 'COM+ Event System', 'Running', 'Automatic', 'LocalService'],
  ['FontCache', 'Windows Font Cache Service', 'Running', 'Automatic', 'LOCAL SERVICE'],
  ['hidserv', 'Human Interface Device Service', 'Running', 'Manual', 'LocalSystem'],
  ['iphlpsvc', 'IP Helper', 'Running', 'Automatic', 'LocalSystem'],
  ['KeyIso', 'CNG Key Isolation', 'Running', 'Manual', 'LocalSystem'],
  ['LanmanServer', 'Server', 'Running', 'Automatic', 'LocalSystem'],
  ['LanmanWorkstation', 'Workstation', 'Running', 'Automatic', 'LocalService'],
  ['lfsvc', 'Geolocation Service', 'Stopped', 'Manual', 'LocalSystem'],
  ['MSiSCSI', 'Microsoft iSCSI Initiator Service', 'Stopped', 'Manual', 'LocalSystem'],
  ['NcaSvc', 'Network Connectivity Assistant', 'Stopped', 'Manual', 'LocalSystem'],
  ['NcbService', 'Network Connection Broker', 'Running', 'Manual', 'LocalSystem'],
  ['NlaSvc', 'Network Location Awareness', 'Running', 'Automatic', 'NetworkService'],
  ['nsi', 'Network Store Interface Service', 'Running', 'Automatic', 'LocalService'],
  ['p2pimsvc', 'Peer Networking Identity Manager', 'Stopped', 'Manual', 'LocalService'],
  ['pla', 'Performance Logs & Alerts', 'Stopped', 'Manual', 'LocalService'],
  ['PlugPlay', 'Plug and Play', 'Running', 'Manual', 'DWM-1'],
  ['PolicyAgent', 'IPsec Policy Agent', 'Running', 'Manual', 'NetworkService'],
  ['Power', 'Power', 'Running', 'Automatic', 'LocalSystem'],
  ['PrintNotify', 'Printer Extensions and Notifications', 'Stopped', 'Manual', 'LocalSystem'],
  ['ProfSvc', 'User Profile Service', 'Running', 'Automatic', 'LocalSystem'],
  ['RasMan', 'Remote Access Connection Manager', 'Stopped', 'Manual', 'LocalSystem'],
  ['RemoteRegistry', 'Remote Registry', 'Disabled', 'Disabled', 'localService'],
  ['RetailDemo', 'Retail Demo Service', 'Stopped', 'Manual', 'LocalSystem'],
  ['RmSvc', 'Radio Management Service', 'Running', 'Manual', 'LocalSystem'],
  ['RpcSs', 'Remote Procedure Call (RPC)', 'Running', 'Automatic', 'NetworkService'],
  ['SamSs', 'Security Accounts Manager', 'Running', 'Automatic', 'LocalSystem'],
  ['Schedule', 'Task Scheduler', 'Running', 'Automatic', 'LocalSystem'],
  ['SECURITYHealthService', 'Windows Security Health Service', 'Running', 'Automatic', 'LocalSystem'],
  ['SENS', 'System Event Notification Service', 'Running', 'Automatic', 'LocalService'],
  ['SessionEnv', 'Remote Desktop Configuration', 'Stopped', 'Manual', 'LocalSystem'],
  ['Spooler', 'Print Spooler', 'Running', 'Automatic', 'LocalSystem', 'Loads files to memory for later printing.'],
  ['SSDPSRV', 'SSDP Discovery', 'Stopped', 'Manual', 'LocalService'],
  ['StateRepository', 'State Repository Service', 'Running', 'Automatic', 'LocalSystem'],
  ['StorSvc', 'Storage Service', 'Running', 'Automatic (Delayed)', 'LocalSystem'],
  ['SysMain', 'SysMain', 'Running', 'Automatic', 'LocalSystem'],
  ['SystemEventsBroker', 'System Events Broker', 'Running', 'Automatic', 'LocalSystem'],
  ['TabletInputService', 'Touch Keyboard and Handwriting Panel Service', 'Stopped', 'Manual', 'LocalSystem'],
  ['Themes', 'Themes', 'Running', 'Automatic', 'LocalSystem'],
  ['TieringEngineService', 'Storage Spaces Tiering Engine Service', 'Stopped', 'Manual', 'LocalSystem'],
  ['TimeBrokerSvc', 'Time Broker', 'Running', 'Manual', 'LocalService'],
  ['TokensBroker', 'Tokens Broker', 'Stopped', 'Manual', 'LocalSystem'],
  ['TrkWks', 'Distributed Link Tracking Client', 'Running', 'Automatic', 'LocalSystem'],
  ['tzautoupdate', 'Auto Time Zone Updater', 'Disabled', 'Disabled', 'LOCAL SERVICE'],
  ['UdkUserSvc', 'UDK User Service', 'Running', 'Automatic', ' APPLICATION'],
  ['UmRdpService', 'Remote Desktop Services UserMode Port Redirector', 'Stopped', 'Manual', 'LocalSystem'],
  ['UserManager', 'User Manager', 'Running', 'Automatic', 'LocalSystem'],
  ['UsoSvc', 'Update Orchestrator Service', 'Running', 'Automatic', 'LocalSystem'],
  ['VaultSvc', 'Credential Manager', 'Running', 'Manual', 'LocalSystem'],
  ['W32Time', 'Windows Time', 'Stopped', 'Manual', 'NT AUTHORITY\\LocalService'],
  ['WaaSMedicSvc', 'Windows Update Medic Service', 'Running', 'Manual', 'LocalSystem'],
  ['WalletService', 'Wallet Service', 'Stopped', 'Manual', 'LocalSystem'],
  ['WarpJITSvc', 'WARP JIT Service', 'Stopped', 'Manual', 'LocalSystem'],
  ['WbioSrvc', 'Windows Biometric Service', 'Stopped', 'Manual', 'LocalSystem'],
  ['WdiServiceHost', 'Diagnostic Service Host', 'Stopped', 'Manual', 'LocalService'],
  ['WdiSystemHost', 'Diagnostic System Host', 'Stopped', 'Manual', 'LocalSystem'],
  ['WdNisSvc', 'Microsoft Defender Antivirus Network Inspection Service', 'Running', 'Automatic', 'LocalSystem'],
  ['WebClient', 'WebClient', 'Stopped', 'Manual', 'LocalService'],
  ['Wecsvc', 'Windows Event Collector', 'Stopped', 'Manual', 'NetworkService'],
  ['WEPHOSTSVC', 'Windows Encryption Provider Host Service', 'Stopped', 'Manual', 'LocalSystem'],
  ['wfasm', 'Windows Firewall', 'Running', 'Automatic', 'LocalSystem'],
  ['WinDefend', 'Microsoft Defender Antivirus Service', 'Running', 'Automatic', 'LocalSystem'],
  ['WinHttpAutoProxySvc', 'WinHTTP Web Proxy Auto-Discovery Service', 'Running', 'Manual', 'NetworkService'],
  ['Winmgmt', 'Windows Management Instrumentation', 'Running', 'Automatic', 'localSystem'],
  ['WlanSvc', 'WLAN AutoConfig', 'Running', 'Automatic', 'LocalSystem'],
  ['wlidsvc', 'Microsoft Account Sign-in Assistant', 'Stopped', 'Manual', 'LocalSystem'],
  ['wscsvc', 'Security Center', 'Running', 'Automatic (Delayed)', 'LocalService'],
  ['WSearch', 'Windows Search', 'Running', 'Automatic (Delayed)', 'LocalSystem'],
  ['wuauserv', 'Windows Update', 'Stopped', 'Manual', 'LocalSystem', 'Enables the detection, download, and installation of updates for Windows.'],
  ['WudfPf', 'Windows Driver Foundation - User-mode Driver Framework Reflector', 'Running', 'Automatic', 'LocalSystem'],
  ['XblAuthManager', 'Xbox Live Auth Manager', 'Stopped', 'Manual', 'LocalSystem'],
  ['XblGameSave', 'Xbox Live Game Save', 'Stopped', 'Manual', 'LocalSystem'],
  ['zipfldr', 'Compressed Folders (Zip)', 'Stopped', 'Manual', 'LocalSystem'],
];

let services: ServiceInfo[] | null = null;

function initServices(): ServiceInfo[] {
  return SVC_SEEDS.map(([name, display, status, start, account, desc]) => ({
    name,
    displayName: display,
    status,
    startupType: start,
    account: account ?? 'LocalSystem',
    description: desc,
    processId: status === 'Running' ? nextPid++ : 0,
  }));
}

export function mockServiceList(): OpResult<ServiceInfo[]> {
  if (!services) services = initServices();
  return ok(services);
}

export function mockServiceControl(name: string, action: ServiceAction): OpResult<null> {
  if (!services) services = initServices();
  const svc = services.find((s) => s.name === name);
  if (!svc) return fail(`The service "${name}" was not found.`);
  if (svc.startupType === 'Disabled' && action === 'start')
    return fail(`Cannot start service ${name} on computer '.' — it is disabled.`);
  if (action === 'start') svc.status = 'Running';
  if (action === 'stop') svc.status = 'Stopped';
  if (action === 'restart') svc.status = 'Running';
  return ok(null);
}

export function mockServiceStartup(name: string, startType: string): OpResult<null> {
  if (!services) services = initServices();
  const svc = services.find((s) => s.name === name);
  if (!svc) return fail(`The service "${name}" was not found.`);
  svc.startupType = startType;
  if (startType === 'Disabled' && svc.status !== 'Stopped') svc.status = 'Stopped';
  return ok(null);
}

/* ------------------------------------------------------------------ */
/* System info                                                         */
/* ------------------------------------------------------------------ */

let bootMonotonic = Date.now() - Math.floor(5 + Math.random() * 30) * 3600_000 - Math.floor(Math.random() * 3500_000);

export function mockSysInfo(): OpResult<SystemInfoModel> {
  if (!procs) procs = initProcs();
  if (!services) services = initServices();
  const uptimeSec = Math.max(60, Math.floor((Date.now() - bootMonotonic) / 1000));
  const memTotalGB = 15.9;
  const memFreeGB = +(memTotalGB * (0.32 + Math.random() * 0.18)).toFixed(2);
  return ok({
    demo: true,
    isAdmin: false,
    computerName: 'DESKTOP-W7PRDC',
    userName: 'DESKTOP-W7PRDC\\shay',
    osName: 'Windows 11 Pro',
    osVersion: '10.0.22631',
    osBuild: '22631.4317',
    arch: '64-bit',
    installDate: '2025-03-14',
    lastBoot: new Date(bootMonotonic).toISOString(),
    uptimeSec,
    cpuName: 'Intel(R) Core(TM) i7-11700 @ 2.50GHz',
    cpuCores: 8,
    cpuThreads: 16,
    cpuLoad: Math.round(6 + Math.random() * 22),
    cpuClockMHz: 4800,
    memTotalGB,
    memFreeGB,
    pageTotalGB: 9.25,
    drives: [
      { letter: 'C:', label: 'Windows', fs: 'NTFS', type: 'Fixed', totalGB: 476.9, freeGB: 89.4 },
      { letter: 'D:', label: 'Data', fs: 'NTFS', type: 'Fixed', totalGB: 931.5, freeGB: 612.8 },
      { letter: 'E:', label: 'BACKUP', fs: 'exFAT', type: 'Removable', totalGB: 57.3, freeGB: 22.1 },
    ],
    adapters: [
      { name: 'Intel(R) Ethernet Connection I219-V', mac: 'A4-BB-6D-3E-11-7C', ips: ['192.168.1.50', 'fe80::a1c2:3d4e:5f60:7a8b'] },
      { name: 'Intel(R) Wi-Fi 6 AX201 160MHz', mac: '8C-55-4A-B2-9D-01', ips: ['192.168.1.64'] },
    ],
    gpus: ['NVIDIA GeForce RTX 3060', 'Intel(R) UHD Graphics 750'],
    procCount: procs.length,
    svcCount: services.length,
  });
}
