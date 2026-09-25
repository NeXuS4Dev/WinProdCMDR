/**
 * WinProdCMDR — Services Manager (PowerPoint orange #d24726).
 * Full services.msc experience in a ribbon: start/stop/restart, startup types,
 * status filtering, descriptions and log-on accounts.
 */

import * as React from 'react';
import {
  ContextualMenu,
  DetailsList,
  Selection,
  SelectionMode,
  Checkbox,
  PrimaryButton,
  type IColumn,
} from '@fluentui/react';
import { APPS } from '../../../shared/apps';
import type { ServiceInfo, ServiceStartupType } from '../../../shared/types';
import { bridge, toolLabel } from '../../bridge';
import { OfficeWindow } from '../../chrome/OfficeWindow';
import type { RibbonTabDef } from '../../chrome/ribbonTypes';
import { Busy, NoticeStack, StatusDot, useNotices } from '../../components/Bits';
import { OfficeDialog, DialogButtons } from '../../chrome/OfficeDialog';
import { SbButton, SbItem, SbSep } from '../../chrome/StatusBar';

const STARTUP_TYPES: ServiceStartupType[] = ['Automatic', 'Automatic (Delayed)', 'Manual', 'Disabled'];

export function ServicesApp() {
  const meta = APPS.services;
  const [rows, setRows] = React.useState<ServiceInfo[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'running' | 'stopped'>('all');
  const [colVis, setColVis] = React.useState({ description: true, account: false, pid: false });
  const [selected, setSelected] = React.useState<ServiceInfo[]>([]);
  const [sort, setSort] = React.useState<{ key: string; desc: boolean }>({ key: 'name', desc: false });
  const [busyNames, setBusyNames] = React.useState<Set<string>>(new Set());
  const [colsOpen, setColsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const { notices, push, dismiss } = useNotices();

  const refresh = React.useCallback(async () => {
    const res = await bridge.listServices();
    if (!res.ok) {
      setError(res.error ?? 'Failed to list services.');
      return;
    }
    setError(null);
    setLoading(false);
    setRows(res.data ?? []);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectionRef = React.useRef<Selection | null>(null);
  if (!selectionRef.current) {
    selectionRef.current = new Selection({
      getKey: (s) => String((s as unknown as ServiceInfo).name),
      onSelectionChanged: () => setSelected(selectionRef.current!.getSelection() as unknown as ServiceInfo[]),
    });
  }
  const selection = selectionRef.current;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = rows;
    if (q) {
      base = base.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.displayName.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q),
      );
    }
    if (statusFilter === 'running') base = base.filter((s) => s.status === 'Running');
    if (statusFilter === 'stopped') base = base.filter((s) => s.status === 'Stopped');
    const dir = sort.desc ? -1 : 1;
    return [...base].sort((a, b) => {
      switch (sort.key) {
        case 'displayName':
          return a.displayName.localeCompare(b.displayName) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'startupType':
          return String(a.startupType).localeCompare(String(b.startupType)) * dir;
        case 'account':
          return (a.account ?? '').localeCompare(b.account ?? '') * dir;
        case 'description':
          return (a.description ?? '').localeCompare(b.description ?? '') * dir;
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
  }, [rows, search, statusFilter, sort]);

  const runningCount = rows.filter((s) => s.status === 'Running').length;

  /* selection predicates */
  const sel = selected;
  const canStart = sel.length > 0 && sel.every((s) => s.status === 'Stopped' || s.status === 'Paused');
  const canStop = sel.length > 0 && sel.every((s) => ['Running', 'Paused', 'Start Pending'].includes(s.status));
  const canRestart = sel.length > 0 && sel.every((s) => s.status === 'Running');

  const withBusy = (names: string[]) => setBusyNames(new Set(names));

  const control = React.useCallback(
    async (action: 'start' | 'stop' | 'restart', targets?: ServiceInfo[]) => {
      const list = targets ?? selected;
      if (!list.length) return;
      withBusy(list.map((s) => s.name));
      let failed = 0;
      for (const s of list) {
        const res = await bridge.serviceControl(s.name, action);
        if (!res.ok) {
          failed++;
          push('error', `${s.displayName || s.name}: ${res.error}`);
        }
      }
      if (!failed) push('success', `${action[0].toUpperCase()}${action.slice(1)}ed ${list.length} service${list.length > 1 ? 's' : ''}.`, 3000);
      await refresh();
      setBusyNames(new Set());
    },
    [selected, refresh, push],
  );

  const applyStartup = React.useCallback(
    async (type: ServiceStartupType, targets?: ServiceInfo[]) => {
      const list = targets ?? selected;
      if (!list.length) return;
      withBusy(list.map((s) => s.name));
      let failed = 0;
      for (const s of list) {
        const res = await bridge.setServiceStartup(s.name, type);
        if (!res.ok) {
          failed++;
          push('error', `${s.displayName || s.name}: ${res.error}`);
        }
      }
      if (!failed) push('success', `Startup type set to "${type}" for ${list.length} service${list.length > 1 ? 's' : ''}.`, 3600);
      await refresh();
      setBusyNames(new Set());
    },
    [selected, refresh, push],
  );

  const openTool = React.useCallback(
    async (tool: string) => {
      const res = await bridge.openTool(tool);
      if (res.demo) push('info', `Demo mode — Windows would open ${toolLabel(tool)}.`, 4200);
      else if (!res.ok) push('error', `Could not open ${toolLabel(tool)}: ${res.error}`);
    },
    [push],
  );

  const exportCsv = React.useCallback(async () => {
    const header = 'Name,Display name,Status,Startup type,Log on as,Description\n';
    const lines = filtered
      .map((s) =>
        [s.name, s.displayName, s.status, s.startupType, s.account ?? '', s.description ?? '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const res = await bridge.exportReport(`Services-${new Date().toISOString().slice(0, 10)}.csv`, header + lines);
    if (res.ok && res.data?.path) push('success', `List exported to ${res.data.path}`, 5000);
    else if (!res.ok) push('error', `Export failed: ${res.error}`);
  }, [filtered, push]);

  /* ---------------------------- columns ----------------------------- */

  const columns = React.useMemo<IColumn[]>(() => {
    const mk = (key: string, name: string, width: number): IColumn => ({
      key,
      name,
      fieldName: key,
      minWidth: width,
      maxWidth: width + 90,
      isResizable: true,
      isSorted: sort.key === key,
      isSortedDescending: sort.desc,
      onColumnClick: () => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: false })),
    });
    return [
      { ...mk('name', 'Name', 170), maxWidth: 300 },
      { ...mk('displayName', 'Display name', 230), maxWidth: 380 },
      { ...mk('status', 'Status', 110) },
      { ...mk('startupType', 'Startup type', 150) },
      ...(colVis.account ? [mk('account', 'Log on as', 150)] : []),
      ...(colVis.pid ? [{ ...mk('processId', 'PID', 70) }] : []),
      ...(colVis.description ? [mk('description', 'Description', 320)] : []),
    ];
  }, [colVis, sort]);

  const renderItemColumn = (item: ServiceInfo, _i: number | undefined, column?: IColumn) => {
    switch (column?.key) {
      case 'name':
        return <span style={{ fontFamily: 'Consolas, monospace', fontSize: 11.5 }}>{item.name}</span>;
      case 'displayName':
        return <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.displayName}</span>;
      case 'status':
        return <StatusDot status={busyNames.has(item.name) ? `${item.status === 'Running' ? 'Stopping' : 'Starting'}…` : item.status} />;
      case 'startupType':
        return <span>{item.startupType}</span>;
      case 'account':
        return <span className="cell-muted">{item.account || '—'}</span>;
      case 'processId':
        return <span className="cell-num">{item.processId || '—'}</span>;
      case 'description':
        return (
          <span className="cell-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>
            {item.description || '—'}
          </span>
        );
      default:
        return null;
    }
  };

  /* ------------------------- context menu --------------------------- */

  const [ctx, setCtx] = React.useState<{ item: ServiceInfo; x: number; y: number } | null>(null);

  const ctxMenuItems = (item: ServiceInfo) => [
    { key: 'start', text: 'Start', iconProps: { iconName: 'Play', style: { color: '#107c10' } }, disabled: item.status !== 'Stopped' && item.status !== 'Paused', onClick: () => void control('start', [item]) },
    { key: 'stop', text: 'Stop', iconProps: { iconName: 'Stop', style: { color: '#c50f1f' } }, disabled: !['Running', 'Paused', 'Start Pending'].includes(item.status), onClick: () => void control('stop', [item]) },
    { key: 'restart', text: 'Restart', iconProps: { iconName: 'Sync', style: { color: '#0f6cbd' } }, disabled: item.status !== 'Running', onClick: () => void control('restart', [item]) },
    { key: 'd1', itemType: 1 },
    { key: 'st', text: 'Startup type', itemType: 2 },
    ...STARTUP_TYPES.map((t) => ({
      key: `st-${t}`,
      text: String(t),
      canCheck: true,
      checked: item.startupType === t,
      onClick: () => void applyStartup(t, [item]),
    })),
    { key: 'd2', itemType: 1 },
    { key: 'msc', text: 'Open services.msc', iconProps: { iconName: 'OpenFile' }, onClick: () => void openTool('services') },
  ];

  const onItemContextMenu = (item?: ServiceInfo, _index?: number, ev?: Event) => {
    if (!item || !ev) return;
    if (!selection.isKeySelected(item.name)) {
      selection.setAllSelected(false);
      selection.setKeySelected(item.name, true, false);
    }
    ev.preventDefault();
    const me = ev as MouseEvent;
    setCtx({ item, x: me.clientX ?? 0, y: me.clientY ?? 0 });
  };

  /* ----------------------------- ribbon ----------------------------- */

  const tabs: RibbonTabDef[] = [
    {
      key: 'home',
      title: 'Home',
      groups: [
        {
          key: 'service',
          title: 'Service',
          columns: [
            {
              kind: 'large',
              key: 'start',
              item: {
                kind: 'large',
                key: 'start',
                icon: 'Play',
                iconColor: '#107c10',
                label: 'Start',
                disabled: !canStart,
                onClick: () => void control('start'),
                tip: { title: 'Start', body: 'Starts the selected service(s). Disabled services must be re-enabled first.' },
              },
            },
            {
              kind: 'large',
              key: 'stop',
              item: {
                kind: 'large',
                key: 'stop',
                icon: 'Stop',
                iconColor: '#c50f1f',
                label: 'Stop',
                disabled: !canStop,
                onClick: () => void control('stop'),
                tip: { title: 'Stop', body: 'Stops the selected service(s). Dependent services are stopped as well.' },
              },
            },
            {
              kind: 'large',
              key: 'restart',
              item: {
                kind: 'large',
                key: 'restart',
                icon: 'Sync',
                iconColor: '#0f6cbd',
                label: 'Restart',
                disabled: !canRestart,
                onClick: () => void control('restart'),
                tip: { title: 'Restart', body: 'Stops and immediately starts the selected running service(s).' },
              },
            },
          ],
        },
        {
          key: 'startup',
          title: 'Startup type',
          columns: [
            {
              kind: 'smalls',
              key: 'startup',
              items: [
                {
                  kind: 'smallSplit',
                  key: 'setstart',
                  icon: 'Settings',
                  label: 'Set startup type',
                  disabled: sel.length === 0,
                  onDefaultClick: () => void applyStartup('Automatic'),
                  menu: STARTUP_TYPES.map((t) => ({
                    key: String(t),
                    text: String(t),
                    checked: sel.length > 0 && sel.every((s) => s.startupType === t),
                    onClick: () => void applyStartup(t),
                  })),
                  tip: { title: 'Set startup type', body: 'Choose when Windows starts this service: at boot (Automatic), on demand (Manual) or never (Disabled).' },
                },
                {
                  kind: 'small',
                  key: 'refresh',
                  icon: 'Refresh',
                  label: 'Refresh',
                  onClick: () => void refresh(),
                  tip: { title: 'Refresh (F5)', body: 'Re-reads the service list and live statuses.' },
                },
              ],
            },
          ],
        },
        {
          key: 'actions',
          title: 'Actions',
          columns: [
            {
              kind: 'smalls',
              key: 'actions',
              items: [
                {
                  kind: 'small',
                  key: 'msc',
                  icon: 'OpenFile',
                  label: 'Open services.msc',
                  onClick: () => void openTool('services'),
                  tip: { title: 'Open services.msc', body: 'Launches the built-in Microsoft Management Console for services.' },
                },
                {
                  kind: 'small',
                  key: 'taskmgr',
                  icon: 'TaskManager',
                  label: 'Open Task Manager',
                  onClick: () => void openTool('taskmgr'),
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
          key: 'filter',
          title: 'Filter',
          columns: [
            {
              kind: 'smalls',
              key: 'filter',
              items: [
                {
                  kind: 'select',
                  key: 'status',
                  value: statusFilter,
                  width: 130,
                  options: [
                    { key: 'all', text: 'All statuses' },
                    { key: 'running', text: 'Running' },
                    { key: 'stopped', text: 'Stopped' },
                  ],
                  onSelect: (k) => setStatusFilter(k as typeof statusFilter),
                  tip: { title: 'Filter by status', body: 'Show only running or only stopped services.' },
                },
              ],
            },
          ],
        },
        {
          key: 'cols',
          title: 'Columns',
          columns: [
            {
              kind: 'smalls',
              key: 'cols',
              items: [
                {
                  kind: 'checkbox',
                  key: 'desc',
                  label: 'Description',
                  checked: colVis.description,
                  onToggle: () => setColVis((v) => ({ ...v, description: !v.description })),
                },
                {
                  kind: 'checkbox',
                  key: 'acct',
                  label: 'Log on as',
                  checked: colVis.account,
                  onToggle: () => setColVis((v) => ({ ...v, account: !v.account })),
                },
                {
                  kind: 'checkbox',
                  key: 'pid',
                  label: 'Process ID',
                  checked: colVis.pid,
                  onToggle: () => setColVis((v) => ({ ...v, pid: !v.pid })),
                },
              ],
            },
          ],
          dialogLauncher: {
            tip: { title: 'Select columns', body: 'Choose which columns appear in the service list.' },
            onClick: () => setColsOpen(true),
          },
        },
      ],
    },
  ];

  const selSummary =
    sel.length === 0
      ? null
      : sel.length === 1
        ? `${sel[0].displayName || sel[0].name} — ${sel[0].status}, ${sel[0].startupType}`
        : `${sel.length} services selected`;

  const statusLeft = (
    <>
      <SbItem>Services: {filtered.length}</SbItem>
      <SbSep />
      <SbItem>Running: {runningCount}</SbItem>
      {selSummary ? (
        <>
          <SbSep />
          <SbItem>{selSummary}</SbItem>
        </>
      ) : null}
    </>
  );

  return (
    <OfficeWindow
      meta={meta}
      tabs={tabs}
      search={{ value: search, onChange: setSearch, placeholder: 'Search services' }}
      qat={{
        save: { onClick: () => void exportCsv(), tip: 'Export — save the current service list as CSV' },
        refresh: { onClick: () => void refresh(), tip: 'Refresh the service list' },
      }}
      statusLeft={statusLeft}
      statusRight={<SbButton icon="Refresh" onClick={() => void refresh()} title="Refresh (F5)" />}
    >
      <NoticeStack notices={notices} onDismiss={dismiss} />
      {error ? <NoticeStack notices={[{ key: -1, kind: 'error', text: error }]} onDismiss={() => setError(null)} /> : null}

      {loading ? (
        <Busy label="Querying services…" />
      ) : (
        <div className="list-host" style={{ paddingTop: 4 }}>
          <DetailsList
            items={filtered}
            columns={columns}
            selection={selection}
            selectionMode={SelectionMode.multiple}
            selectionPreservedOnEmptyClick
            checkboxVisibility={2}
            onRenderItemColumn={renderItemColumn}
            onItemContextMenu={(item, idx, ev) => onItemContextMenu(item as ServiceInfo, idx, ev)}
            styles={{ root: { fontSize: 12 } }}
          />
          {sel.length === 1 ? (
            <div className="svc-footer">
              <b>{sel[0].displayName || sel[0].name}</b>
              {sel[0].description ? <> — {sel[0].description}</> : null}
              {sel[0].account ? <div>Log on as: {sel[0].account}</div> : null}
            </div>
          ) : null}
        </div>
      )}

      <OfficeDialog open={colsOpen} title="Select columns" onClose={() => setColsOpen(false)} maxWidth={420}>
        <div className="hint">Choose which data columns are shown in the service list.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
          {(
            [
              ['description', 'Description'],
              ['account', 'Log on as'],
              ['pid', 'Process ID'],
            ] as const
          ).map(([c, label]) => (
            <Checkbox key={c} label={label} checked={colVis[c]} onChange={() => setColVis((v) => ({ ...v, [c]: !v[c] }))} styles={{ root: { fontSize: 12 } }} />
          ))}
        </div>
        <DialogButtons>
          <PrimaryButton onClick={() => setColsOpen(false)}>Close</PrimaryButton>
        </DialogButtons>
      </OfficeDialog>

      {/* Right-click context menu for a single service */}
      <ContextualMenu
        items={ctx ? ctxMenuItems(ctx.item) : []}
        hidden={!ctx}
        target={ctx ? { left: ctx.x, top: ctx.y } : undefined}
        onDismiss={() => setCtx(null)}
        shouldFocusOnMount
      />
    </OfficeWindow>
  );
}

