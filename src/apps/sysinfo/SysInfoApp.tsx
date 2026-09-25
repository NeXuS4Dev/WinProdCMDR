/**
 * WinProdCMDR — System Info (Word blue #2b579a).
 * A full "document"-style system report: OS, CPU, memory, storage, network,
 * graphics — plus a Tools tab that launches real Windows utilities.
 */

import * as React from 'react';
import { Checkbox, DefaultButton, PrimaryButton } from '@fluentui/react';
import { APPS } from '../../../shared/apps';
import type { SystemInfoModel } from '../../../shared/types';
import { bridge, toolLabel } from '../../bridge';
import { logActivity } from '../../activity';
import { OfficeWindow } from '../../chrome/OfficeWindow';
import type { RibbonTabDef } from '../../chrome/ribbonTypes';
import { Bar, Busy, Card, KV, NoticeStack, useNotices, fmtGB, fmtUptime } from '../../components/Bits';
import { Icon } from '@fluentui/react';
import { OfficeDialog, DialogButtons } from '../../chrome/OfficeDialog';
import { SbButton, SbItem, SbSep } from '../../chrome/StatusBar';

const SECTIONS = [
  { key: 'os', label: 'Operating system' },
  { key: 'cpu', label: 'Processor' },
  { key: 'mem', label: 'Memory' },
  { key: 'drives', label: 'Storage' },
  { key: 'net', label: 'Network' },
  { key: 'gpu', label: 'Graphics' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

const TOOLS: { id: string; icon: string; label: string }[] = [
  { id: 'taskmgr', icon: 'TaskManager', label: 'Task Manager' },
  { id: 'msinfo32', icon: 'Info2', label: 'System Information' },
  { id: 'devmgmt', icon: 'Devices4', label: 'Device Manager' },
  { id: 'diskmgmt', icon: 'HardDrive', label: 'Disk Management' },
  { id: 'resmon', icon: 'SpeedHigh', label: 'Resource Monitor' },
  { id: 'dxdiag', icon: 'Diagnostic', label: 'DirectX Diagnostics' },
  { id: 'services', icon: 'Settings', label: 'Services' },
  { id: 'control', icon: 'Tiles', label: 'Control Panel' },
];

const MAINTENANCE: { id: string; icon: string; label: string }[] = [
  { id: 'winupdate', icon: 'Sync', label: 'Windows Update' },
  { id: 'cleanmgr', icon: 'Clear', label: 'Disk Cleanup' },
  { id: 'cmd', icon: 'Code', label: 'Command Prompt' },
];

function buildReport(info: SystemInfoModel, sections: Record<SectionKey, boolean>): string {
  const out: string[] = [];
  const memUsed = info.memTotalGB - info.memFreeGB;
  out.push(`# ${APPS.sysinfo.name} — WinProdCMDR report`);
  out.push('');
  out.push(`_Generated ${new Date().toLocaleString()} — ${info.demo ? 'demo data' : 'live data from Windows'}_`);
  out.push('');
  if (sections.os) {
    out.push('## Operating system');
    out.push(`- **Edition:** ${info.osName}`);
    out.push(`- **Version:** ${info.osVersion}`);
    out.push(`- **Build:** ${info.osBuild}`);
    out.push(`- **Architecture:** ${info.arch}`);
    out.push(`- **Computer name:** ${info.computerName}`);
    if (info.userName) out.push(`- **User:** ${info.userName}`);
    if (info.installDate) out.push(`- **Installed:** ${info.installDate}`);
    out.push(`- **Last boot:** ${info.lastBoot ?? '—'}`);
    out.push(`- **Uptime:** ${fmtUptime(info.uptimeSec)}`);
    out.push('');
  }
  if (sections.cpu) {
    out.push('## Processor');
    out.push(`- **Model:** ${info.cpuName}`);
    out.push(`- **Cores / Threads:** ${info.cpuCores} / ${info.cpuThreads}`);
    out.push(`- **Current load:** ${info.cpuLoad}%`);
    if (info.cpuClockMHz) out.push(`- **Max clock:** ${(info.cpuClockMHz / 1000).toFixed(2)} GHz`);
    out.push('');
  }
  if (sections.mem) {
    out.push('## Memory');
    out.push(`- **Total:** ${fmtGB(info.memTotalGB)}`);
    out.push(`- **Free:** ${fmtGB(info.memFreeGB)}`);
    out.push(`- **In use:** ${fmtGB(memUsed)} (${((memUsed / info.memTotalGB) * 100).toFixed(0)}%)`);
    if (info.pageTotalGB) out.push(`- **Page file:** ${fmtGB(info.pageTotalGB)}`);
    out.push('');
  }
  if (sections.drives && info.drives.length) {
    out.push('## Storage');
    for (const d of info.drives) {
      out.push(
        `- **${d.letter} ${d.label ?? ''}** (${d.type}${d.fs ? `, ${d.fs}` : ''}): ${fmtGB(d.freeGB)} free of ${fmtGB(d.totalGB)} (${(((d.totalGB - d.freeGB) / d.totalGB) * 100).toFixed(0)}% used)`,
      );
    }
    out.push('');
  }
  if (sections.net && info.adapters.length) {
    out.push('## Network');
    for (const a of info.adapters) {
      out.push(`- **${a.name}**${a.mac ? ` [${a.mac}]` : ''}: ${(a.ips ?? []).join(', ') || 'no address'}`);
    }
    out.push('');
  }
  if (sections.gpu && info.gpus.length) {
    out.push('## Graphics');
    for (const g of info.gpus) out.push(`- ${g}`);
    out.push('');
  }
  return out.join('\n');
}

function buildSummary(info: SystemInfoModel): string {
  const memUsed = info.memTotalGB - info.memFreeGB;
  return [
    `${info.osName} (build ${info.osBuild}, ${info.arch})`,
    `${info.cpuName} — ${info.cpuCores}C/${info.cpuThreads}T @ ${info.cpuLoad}%`,
    `Memory: ${fmtGB(memUsed)} of ${fmtGB(info.memTotalGB)} in use`,
    `Uptime: ${fmtUptime(info.uptimeSec)}`,
    `Drives: ${info.drives.map((d) => `${d.letter} ${fmtGB(d.freeGB)} free`).join('; ')}`,
  ].join('\n');
}

export function SysInfoApp() {
  const meta = APPS.sysinfo;
  const [info, setInfo] = React.useState<SystemInfoModel | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [auto, setAuto] = React.useState(false);
  const [sections, setSections] = React.useState<Record<SectionKey, boolean>>({
    os: true,
    cpu: true,
    mem: true,
    drives: true,
    net: true,
    gpu: true,
  });
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const { notices, push, dismiss } = useNotices();

  const refresh = React.useCallback(async () => {
    const res = await bridge.getSystemInfo();
    if (!res.ok) {
      setError(res.error ?? 'Failed to read system information.');
      return;
    }
    setError(null);
    setLoading(false);
    setInfo(res.data ?? null);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(id);
  }, [auto, refresh]);

  const openTool = React.useCallback(
    async (tool: string) => {
      const res = await bridge.openTool(tool);
      if (res.demo) push('info', `Demo mode — Windows would open ${toolLabel(tool)}.`, 4200);
      else if (!res.ok) push('error', `Could not open ${toolLabel(tool)}: ${res.error}`);
    },
    [push],
  );

  const copySummary = React.useCallback(async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(buildSummary(info));
      push('success', 'Summary copied to the clipboard.', 3000);
      logActivity('Copied system summary to the clipboard');
    } catch (err) {
      push('error', `Clipboard unavailable: ${String(err)}`);
    }
  }, [info, push]);

  const exportReport = React.useCallback(async () => {
    if (!info) return;
    const fileName = `SystemReport-${new Date().toISOString().slice(0, 10)}.md`;
    const res = await bridge.exportReport(fileName, buildReport(info, sections));
    if (res.ok && res.data?.path) {
      push('success', `Report saved to ${res.data.path}`, 5000);
      logActivity(`Exported system report (${fileName})`);
    } else if (res.ok) push('info', 'Export canceled.', 2500);
    else push('error', `Export failed: ${res.error}`);
  }, [info, sections, push]);

  /* ----------------------------- ribbon ----------------------------- */

  const tabs: RibbonTabDef[] = [
    {
      key: 'home',
      title: 'Home',
      groups: [
        {
          key: 'report',
          title: 'Report',
          columns: [
            {
              kind: 'large',
              key: 'refresh',
              item: {
                kind: 'large',
                key: 'refresh',
                icon: 'Refresh',
                label: 'Refresh',
                onClick: () => void refresh(),
                tip: { title: 'Refresh', body: 'Re-reads all system facts from Windows (WMI).' },
              },
            },
            {
              kind: 'large',
              key: 'copy',
              item: {
                kind: 'large',
                key: 'copy',
                icon: 'Copy',
                label: 'Copy summary',
                onClick: () => void copySummary(),
                tip: { title: 'Copy summary', body: 'Copies a compact text summary of this report to the clipboard.' },
              },
            },
            {
              kind: 'large',
              key: 'export',
              item: {
                kind: 'large',
                key: 'export',
                icon: 'Save',
                label: 'Export',
                onClick: () => void exportReport(),
                tip: { title: 'Export', body: 'Saves the full report as a Markdown file (choose the location in the save dialog).' },
              },
            },
          ],
        },
        {
          key: 'data',
          title: 'Data',
          columns: [
            {
              kind: 'smalls',
              key: 'data',
              items: [
                {
                  kind: 'toggle',
                  key: 'auto',
                  icon: 'Sync',
                  label: 'Auto-refresh (10s)',
                  checked: auto,
                  onToggle: () => setAuto((a) => !a),
                  tip: { title: 'Auto-refresh', body: 'Keeps the report updated every 10 seconds — handy while monitoring.' },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      key: 'view',
      title: 'View',
      groups: [
        {
          key: 'sections',
          title: 'Sections',
          columns: [
            {
              kind: 'smalls',
              key: 'sections',
              items: SECTIONS.map((s) => ({
                kind: 'checkbox' as const,
                key: s.key,
                label: s.label,
                checked: sections[s.key],
                onToggle: () => setSections((v) => ({ ...v, [s.key]: !v[s.key] })),
              })),
            },
          ],
          dialogLauncher: {
            tip: { title: 'Report options', body: 'Choose which sections are shown on the page and included in exports.' },
            onClick: () => setOptionsOpen(true),
          },
        },
      ],
    },
    {
      key: 'tools',
      title: 'Tools',
      groups: [
        {
          key: 'winTools',
          title: 'Windows tools',
          columns: [
            {
              kind: 'smalls',
              key: 't1',
              items: TOOLS.slice(0, 4).map((t) => ({
                kind: 'small' as const,
                key: t.id,
                icon: t.icon,
                label: t.label,
                onClick: () => void openTool(t.id),
                tip: { title: t.label, body: `Launches ${toolLabel(t.id)} directly from the suite.` },
              })),
            },
            {
              kind: 'smalls',
              key: 't2',
              items: TOOLS.slice(4).map((t) => ({
                kind: 'small' as const,
                key: t.id,
                icon: t.icon,
                label: t.label,
                onClick: () => void openTool(t.id),
              })),
            },
          ],
        },
        {
          key: 'maintenance',
          title: 'Maintenance',
          columns: [
            {
              kind: 'smalls',
              key: 'maint',
              items: MAINTENANCE.map((t) => ({
                kind: 'small' as const,
                key: t.id,
                icon: t.icon,
                label: t.label,
                onClick: () => void openTool(t.id),
                tip: { title: t.label, body: `Launches ${toolLabel(t.id)}.` },
              })),
            },
          ],
        },
      ],
    },
  ];

  const memUsed = info ? info.memTotalGB - info.memFreeGB : 0;

  const statusLeft = info ? (
    <>
      <SbItem>
        {info.osName} • {info.arch}
      </SbItem>
      <SbSep />
      <SbItem>Up {fmtUptime(info.uptimeSec)}</SbItem>
      {info.demo ? (
        <>
          <SbSep />
          <SbItem style={{ color: '#ffe9b3' }}>Demo data</SbItem>
        </>
      ) : null}
    </>
  ) : (
    <SbItem>Reading system information…</SbItem>
  );

  return (
    <OfficeWindow
      meta={meta}
      tabs={tabs}
      qat={{
        save: { onClick: () => void exportReport(), tip: 'Export — save the full system report' },
        refresh: { onClick: () => void refresh(), tip: 'Refresh system facts' },
      }}
      onRefresh={() => void refresh()}
      backstageExtras={{
        refresh: () => void refresh(),
        properties: info
          ? [
              { k: 'Edition', v: info.osName },
              { k: 'Build', v: info.osBuild },
              { k: 'Processor', v: info.cpuName, },
              { k: 'Cores / Threads', v: `${info.cpuCores} / ${info.cpuThreads}` },
              { k: 'Memory in use', v: `${fmtGB(info.memTotalGB - info.memFreeGB)} of ${fmtGB(info.memTotalGB)}` },
              { k: 'Uptime', v: fmtUptime(info.uptimeSec) },
              { k: 'Drives', v: info.drives.length },
              { k: 'Mode', v: info.demo ? 'Demo data' : 'Live Windows data' },
            ]
          : [{ k: 'Reading', v: '…' }],
        exportItems: [
          {
            key: 'md',
            label: 'Export report (Markdown)',
            desc: 'Saves the full report with the sections selected on the View tab.',
            icon: 'ReportDocument',
            onClick: () => void exportReport(),
          },
          {
            key: 'copy',
            label: 'Copy summary to clipboard',
            desc: 'A compact plain-text overview of this machine.',
            icon: 'Copy',
            onClick: () => void copySummary(),
          },
        ],
      }}
      statusLeft={statusLeft}
      statusRight={<SbButton icon="Refresh" onClick={() => void refresh()} title="Refresh" />}
    >
      <NoticeStack notices={notices} onDismiss={dismiss} />
      {error ? <NoticeStack notices={[{ key: -1, kind: 'error', text: error }]} onDismiss={() => setError(null)} /> : null}

      {loading ? (
        <Busy label="Reading system information…" />
      ) : info ? (
        <div className="report">
          <div className="report-head">
            <h1>System Summary</h1>
            <span className="meta">
              {info.computerName} • generated {new Date().toLocaleTimeString()} •{' '}
              {info.demo ? 'demo data' : 'live data from Windows'}
              {info.isAdmin ? ' • administrator' : ''}
            </span>
          </div>

          <div className="report-sections">
            {sections.os ? (
              <Card title="Operating system">
                <KV k="Edition" v={info.osName} />
                <KV k="Version" v={info.osVersion} />
                <KV k="Build" v={info.osBuild} />
                <KV k="Architecture" v={info.arch} />
                <KV k="Computer name" v={info.computerName} />
                <KV k="User" v={info.userName ?? '—'} />
                <KV k="Installed" v={info.installDate ?? '—'} />
                <KV k="Uptime" v={fmtUptime(info.uptimeSec)} />
              </Card>
            ) : null}

            {sections.cpu ? (
              <Card title="Processor">
                <KV k="Model" v={info.cpuName} title={info.cpuName} />
                <KV k="Cores / Threads" v={`${info.cpuCores} / ${info.cpuThreads}`} />
                <KV k="Max clock" v={info.cpuClockMHz ? `${(info.cpuClockMHz / 1000).toFixed(2)} GHz` : '—'} />
                <div style={{ margin: '8px 0 4px', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#605e5c' }}>
                  <span>Current load</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{info.cpuLoad}%</span>
                </div>
                <Bar pct={info.cpuLoad} />
              </Card>
            ) : null}

            {sections.mem ? (
              <Card title="Memory">
                <KV k="Total" v={fmtGB(info.memTotalGB)} />
                <KV k="In use" v={fmtGB(memUsed)} />
                <KV k="Free" v={fmtGB(info.memFreeGB)} />
                <KV k="Page file" v={info.pageTotalGB ? fmtGB(info.pageTotalGB) : '—'} />
                <div style={{ marginTop: 8 }}>
                  <Bar pct={(memUsed / info.memTotalGB) * 100} label="Memory in use" />
                </div>
              </Card>
            ) : null}

            {sections.drives ? (
              <Card title={`Storage (${info.drives.length})`}>
                {info.drives.map((d) => (
                  <div className="drive-row" key={d.letter}>
                    <div className="drive-top">
                      <span className="lbl">
                        <b>{d.letter}</b> {d.label ?? ''} {d.fs ? <span style={{ color: '#a19f9d' }}>({d.fs})</span> : null}
                      </span>
                      <span className="vals">
                        {fmtGB(d.freeGB)} free of {fmtGB(d.totalGB)}
                      </span>
                    </div>
                    <Bar pct={((d.totalGB - d.freeGB) / d.totalGB) * 100} label={`${d.letter} used`} />
                  </div>
                ))}
                {!info.drives.length ? <div className="cell-muted">No drives detected.</div> : null}
              </Card>
            ) : null}

            {sections.net ? (
              <Card title={`Network (${info.adapters.length})`}>
                {info.adapters.map((a, i) => (
                  <div key={i} style={{ padding: '4px 0' }}>
                    <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon iconName="Globe" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    </div>
                    <div style={{ margin: '3px 0 5px' }}>
                      {(a.ips ?? []).map((ip) => (
                        <span className="ip-chip" key={ip}>
                          {ip}
                        </span>
                      ))}
                      {!a.ips?.length ? <span className="cell-muted">No address</span> : null}
                      {a.mac ? <span style={{ fontSize: 11, color: '#797775', marginLeft: 4 }}>{a.mac}</span> : null}
                    </div>
                  </div>
                ))}
                {!info.adapters.length ? <div className="cell-muted">No active adapters.</div> : null}
              </Card>
            ) : null}

            {sections.gpu ? (
              <Card title={`Graphics (${info.gpus.length})`}>
                {info.gpus.map((g, i) => (
                  <div className="gpu-line" key={i}>
                    <Icon iconName="Devices4" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{g}</span>
                  </div>
                ))}
                {!info.gpus.length ? <div className="cell-muted">No adapters detected.</div> : null}
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      <OfficeDialog open={optionsOpen} title="Report options" onClose={() => setOptionsOpen(false)} maxWidth={460}>
        <div className="hint">Choose which sections are shown on the page and included in exported reports.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
          {SECTIONS.map((s) => (
            <Checkbox
              key={s.key}
              label={s.label}
              checked={sections[s.key]}
              onChange={() => setSections((v) => ({ ...v, [s.key]: !v[s.key] }))}
              styles={{ root: { fontSize: 12 } }}
            />
          ))}
        </div>
        <DialogButtons>
          <DefaultButton
            onClick={() => {
              const all = SECTIONS.every((s) => sections[s.key]);
              setSections(
                Object.fromEntries(SECTIONS.map((s) => [s.key, !all])) as Record<SectionKey, boolean>,
              );
            }}
          >
            Toggle all
          </DefaultButton>
          <PrimaryButton onClick={() => setOptionsOpen(false)}>Close</PrimaryButton>
        </DialogButtons>
      </OfficeDialog>
    </OfficeWindow>
  );
}
