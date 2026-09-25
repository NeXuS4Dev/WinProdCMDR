/**
 * WinProdCMDR — Task Manager (Excel green #217346).
 * Details view: sortable process list with live CPU/RAM, search, end-task.
 * Performance view: live CPU + memory charts with system stats.
 */

import * as React from 'react';
import {
  DetailsList,
  Selection,
  SelectionMode,
  TextField,
  DefaultButton,
  PrimaryButton,
  Icon,
  Checkbox,
  type IColumn,
} from '@fluentui/react';
import { APPS } from '../../../shared/apps';
import type { ProcessInfo } from '../../../shared/types';
import { bridge } from '../../bridge';
import { usePrefs } from '../../prefs';
import { logActivity } from '../../activity';
import { OfficeWindow } from '../../chrome/OfficeWindow';
import type { RibbonTabDef } from '../../chrome/ribbonTypes';
import { Busy, LineChart, NoticeStack, useNotices, Bar, fmtUptime } from '../../components/Bits';
import { OfficeDialog, DialogButtons } from '../../chrome/OfficeDialog';
import { SbButton, SbItem, SbSep } from '../../chrome/StatusBar';

type ColKey = 'name' | 'pid' | 'status' | 'cpu' | 'mem' | 'title' | 'username' | 'company';

function hashColor(name: string): string {
  const palette = ['#605e5c', '#8764b8', '#038387', '#ca5010', '#036c70', '#744da9', '#5c2e91', '#4f6bed', '#c239b3', '#498205'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function TasksApp() {
  const meta = APPS.tasks;
  const [rows, setRows] = React.useState<ProcessInfo[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [speed, setSpeed] = React.useState<'paused' | 'normal' | 'high'>('normal');
  const [view, setView] = React.useState<'details' | 'perf'>('details');
  const [colVis, setColVis] = React.useState<Record<string, boolean>>({
    cpu: true,
    mem: true,
    status: true,
    title: true,
    username: false,
    company: false,
  });
  const [selected, setSelected] = React.useState<ProcessInfo[]>([]);
  const [sort, setSort] = React.useState<{ key: ColKey; desc: boolean }>({ key: 'name', desc: false });
  const [hist, setHist] = React.useState<{ cpu: number[]; mem: number[] }>({ cpu: [], mem: [] });
  const [sysTotalMemGB, setSysTotalMemGB] = React.useState<number>(8);
  const [uptimeSec, setUptimeSec] = React.useState<number>(0);
  const [runOpen, setRunOpen] = React.useState(false);
  const [runValue, setRunValue] = React.useState('');
  const [colsOpen, setColsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const { notices, push, dismiss } = useNotices();
  const prefs = usePrefs();

  /* ------------------------------ data ------------------------------ */

  const refresh = React.useCallback(async () => {
    const res = await bridge.listProcesses();
    if (!res.ok) {
      setError(res.error ?? 'Failed to list processes.');
      return;
    }
    setError(null);
    setLoading(false);
    const data = res.data ?? [];
    setRows(data);
    const cpuTotal = Math.min(100, data.reduce((s, p) => s + p.cpuPercent, 0));
    const memUsedGB = data.reduce((s, p) => s + p.mem, 0) / 1024;
    setHist((h) => ({
      cpu: [...h.cpu, cpuTotal].slice(-60),
      mem: [...h.mem, memUsedGB].slice(-60),
    }));
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (speed === 'paused') return;
    const id = window.setInterval(() => void refresh(), speed === 'high' ? 1000 : 2000);
    return () => window.clearInterval(id);
  }, [speed, refresh]);

  React.useEffect(() => {
    void bridge.getSystemInfo().then((r) => {
      if (r.ok && r.data) {
        setSysTotalMemGB(r.data.memTotalGB || 8);
        setUptimeSec(r.data.uptimeSec);
      }
    });
  }, []);

  /* --------------------------- selection ---------------------------- */

  const selectionRef = React.useRef<Selection | null>(null);
  if (!selectionRef.current) {
    selectionRef.current = new Selection({
      getKey: (p) => String((p as unknown as ProcessInfo).pid),
      onSelectionChanged: () => {
        setSelected(selectionRef.current!.getSelection() as unknown as ProcessInfo[]);
      },
    });
  }
  const selection = selectionRef.current;

  /* ------------------------- filtering & sorting -------------------- */

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? rows.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.title ?? '').toLowerCase().includes(q) ||
            (p.description ?? '').toLowerCase().includes(q) ||
            String(p.pid) === q,
        )
      : rows;
    const dir = sort.desc ? -1 : 1;
    return [...base].sort((a, b) => {
      switch (sort.key) {
        case 'pid':
          return (a.pid - b.pid) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'cpu':
          return (a.cpuPercent - b.cpuPercent) * dir;
        case 'mem':
          return (a.mem - b.mem) * dir;
        case 'title':
          return (a.title ?? '').localeCompare(b.title ?? '') * dir;
        case 'username':
          return (a.username ?? '').localeCompare(b.username ?? '') * dir;
        case 'company':
          return (a.company ?? '').localeCompare(b.company ?? '') * dir;
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
  }, [rows, search, sort]);

  const cpuNow = Math.min(100, rows.reduce((s, p) => s + p.cpuPercent, 0));
  const memNowGB = rows.reduce((s, p) => s + p.mem, 0) / 1024;
  const notResponding = rows.filter((p) => p.status === 'Not responding').length;

  /* ---------------------------- actions ----------------------------- */

  const endTask = React.useCallback(async () => {
    if (!selected.length || prefs.readOnly) return;
    const targets = [...selected];
    const ended: string[] = [];
    for (const p of targets) {
      const res = await bridge.endTask(p.pid);
      if (!res.ok) push('error', `Could not end "${p.name}" (PID ${p.pid}): ${res.error}`);
      else ended.push(`${p.name} (${p.pid})`);
    }
    if (ended.length) {
      push('success', `Ended ${ended.length} process${ended.length > 1 ? 'es' : ''}.`, 3200);
      logActivity(`Ended ${ended.join(', ')}`);
    }
    selection.setAllSelected(false);
    await refresh();
  }, [selected, selection, refresh, push, prefs.readOnly]);

  const runTask = React.useCallback(async () => {
    const f = runValue.trim();
    if (!f || prefs.readOnly) return;
    const res = await bridge.runTask(f);
    if (!res.ok) {
      push('error', `Could not run "${f}": ${res.error}`);
      return;
    }
    push('success', `Started "${f}".`, 3200);
    logActivity(`Started task "${f}"`);
    setRunOpen(false);
    setRunValue('');
    await refresh();
  }, [runValue, refresh, push, prefs.readOnly]);

  const exportCsv = React.useCallback(async () => {
    const header = 'Name,PID,Status,CPU %,Memory MB,Description,Company\n';
    const lines = filtered
      .map((p) =>
        [p.name, p.pid, p.status, p.cpuPercent.toFixed(1), p.mem.toFixed(1), p.description ?? '', p.company ?? '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const res = await bridge.exportReport(`Processes-${new Date().toISOString().slice(0, 10)}.csv`, header + lines);
    if (res.ok && res.data?.path) {
      push('success', `List exported to ${res.data.path}`, 5000);
      logActivity(`Exported process list (${filtered.length} rows)`);
    } else if (!res.ok) push('error', `Export failed: ${res.error}`);
  }, [filtered, push]);

  /* ---------------------------- columns ----------------------------- */

  const columns = React.useMemo<IColumn[]>(() => {
    const mk = (
      key: ColKey,
      name: string,
      width: number,
      opts?: { numeric?: boolean },
    ): IColumn => ({
      key,
      name,
      fieldName: key,
      minWidth: width,
      maxWidth: width + 60,
      isResizable: true,
      isSorted: sort.key === key,
      isSortedDescending: sort.desc,
      data: { numeric: opts?.numeric },
      onColumnClick: () =>
        setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: false })),
    });
    const cols: IColumn[] = [
      {
        key: 'name',
        name: 'Name',
        fieldName: 'name',
        minWidth: 190,
        maxWidth: 340,
        isResizable: true,
        isSorted: sort.key === 'name',
        isSortedDescending: sort.desc,
        data: {},
        onColumnClick: () => setSort((s) => (s.key === 'name' ? { key: 'name', desc: !s.desc } : { key: 'name', desc: true })),
      },
      mk('pid', 'PID', 62, { numeric: true }),
    ];
    if (colVis.status) cols.push(mk('status', 'Status', 110));
    if (colVis.cpu) cols.push(mk('cpu', 'CPU', 70, { numeric: true }));
    if (colVis.mem) cols.push(mk('mem', 'Memory', 90, { numeric: true }));
    if (colVis.title) cols.push(mk('title', 'Window title', 150));
    if (colVis.username) cols.push(mk('username', 'User name', 110));
    if (colVis.company) cols.push(mk('company', 'Company', 120));
    return cols;
  }, [colVis, sort]);

  const renderItemColumn = (item: ProcessInfo, _index: number | undefined, column?: IColumn) => {
    switch (column?.key) {
      case 'name':
        return (
          <div className="proc-name-cell">
            <span className="glyph" style={{ background: hashColor(item.name) }}>
              {item.name.replace(/\.exe$/i, '').slice(0, 1).toUpperCase()}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.name.replace(/\.exe$/i, '')}
              {item.description || item.company ? (
                <div className="sub">{item.description || item.company}</div>
              ) : null}
            </span>
          </div>
        );
      case 'pid':
        return <span className="cell-num">{item.pid}</span>;
      case 'status':
        return item.status === 'Not responding' ? (
          <span className="cell-danger">
            <Icon iconName="StatusCircleErrorX" />
            Not responding
          </span>
        ) : (
          <span className="cell-ok">
            <Icon iconName="StatusCircleCheckmark" />
            Running
          </span>
        );
      case 'cpu':
        return <span className="cell-num">{item.cpuPercent.toFixed(1)}%</span>;
      case 'mem':
        return (
          <span className="cell-num">
            {item.mem >= 1024 ? `${(item.mem / 1024).toFixed(2)} GB` : `${item.mem.toFixed(1)} MB`}
          </span>
        );
      case 'title':
        return <span className="cell-muted">{item.title || '—'}</span>;
      case 'username':
        return <span className="cell-muted">{item.username || '—'}</span>;
      case 'company':
        return <span className="cell-muted">{item.company || '—'}</span>;
      default:
        return null;
    }
  };

  /* ----------------------------- ribbon ----------------------------- */

  const tabs: RibbonTabDef[] = [
    {
      key: 'home',
      title: 'Home',
      groups: [
        {
          key: 'end',
          title: 'End task',
          columns: [
            {
              kind: 'large',
              key: 'end',
              item: {
                kind: 'large',
                key: 'end',
                icon: 'Cancel',
                iconColor: '#c42b1c',
                label: 'End task',
                disabled: selected.length === 0 || prefs.readOnly,
                onClick: () => void endTask(),
                tip: {
                  title: 'End task',
                  body: 'Forces the selected process(es) to close immediately. Any unsaved data in the program will be lost.',
                },
              },
            },
          ],
        },
        {
          key: 'procs',
          title: 'Processes',
          columns: [
            {
              kind: 'large',
              key: 'run',
              item: {
                kind: 'large',
                key: 'run',
                icon: 'Add',
                label: 'Run new task',
                disabled: prefs.readOnly,
                onClick: () => setRunOpen(true),
                tip: {
                  title: 'Run new task',
                  body: 'Starts a program, folder or document by typing its name — like the classic Run dialog.',
                },
              },
            },
            {
              kind: 'smalls',
              key: 'misc',
              items: [
                {
                  kind: 'small',
                  key: 'refresh',
                  icon: 'Refresh',
                  label: 'Refresh',
                  onClick: () => void refresh(),
                  tip: { title: 'Refresh (F5)', body: 'Updates the list of processes right now.' },
                },
                {
                  kind: 'small',
                  key: 'end',
                  icon: 'Cancel',
                  iconColor: '#c42b1c',
                  label: 'End selected',
                  disabled: selected.length === 0 || prefs.readOnly,
                  onClick: () => void endTask(),
                },
              ],
            },
          ],
        },
        {
          key: 'speed',
          title: 'Update speed',
          columns: [
            {
              kind: 'smalls',
              key: 'speed',
              items: [
                {
                  kind: 'select',
                  key: 'speed',
                  value: speed,
                  width: 132,
                  options: [
                    { key: 'paused', text: 'Paused' },
                    { key: 'normal', text: 'Normal speed' },
                    { key: 'high', text: 'High speed' },
                  ],
                  onSelect: (k) => setSpeed(k as typeof speed),
                  tip: { title: 'Update speed', body: 'How often the process list refreshes. Pause it to freeze the view.' },
                },
                {
                  kind: 'toggle',
                  key: 'perf',
                  icon: 'AreaChart',
                  label: view === 'perf' ? 'Details view' : 'Performance view',
                  checked: view === 'perf',
                  onToggle: () => setView((v) => (v === 'perf' ? 'details' : 'perf')),
                  tip: { title: 'Performance view', body: 'Shows live CPU and memory charts instead of the process list.' },
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
          key: 'layout',
          title: 'Data',
          columns: [
            {
              kind: 'smalls',
              key: 'cols',
              items: (['cpu', 'mem', 'status', 'title', 'username', 'company'] as const).map((c) => ({
                kind: 'checkbox' as const,
                key: c,
                label: { cpu: 'CPU', mem: 'Memory', status: 'Status', title: 'Window title', username: 'User name', company: 'Company' }[c],
                checked: colVis[c],
                onToggle: () => setColVis((v) => ({ ...v, [c]: !v[c] })),
              })),
            },
          ],
          dialogLauncher: {
            tip: { title: 'Select columns', body: 'Choose which columns appear in the process list.' },
            onClick: () => setColsOpen(true),
          },
        },
        {
          key: 'sort',
          title: 'Sort',
          columns: [
            {
              kind: 'smalls',
              key: 'sort',
              items: [
                {
                  kind: 'select',
                  key: 'sortcol',
                  value: sort.key,
                  width: 130,
                  options: [
                    { key: 'name', text: 'Name' },
                    { key: 'pid', text: 'PID' },
                    { key: 'cpu', text: 'CPU' },
                    { key: 'mem', text: 'Memory' },
                    { key: 'status', text: 'Status' },
                  ],
                  onSelect: (k) => setSort((s) => ({ key: k as ColKey, desc: s.key === k ? s.desc : true })),
                  tip: { title: 'Sort by', body: 'Choose the primary sort column. Click any column header to sort too.' },
                },
                {
                  kind: 'small',
                  key: 'asc',
                  icon: sort.desc ? 'ChevronDown' : 'ChevronUp',
                  label: sort.desc ? 'Descending' : 'Ascending',
                  onClick: () => setSort((s) => ({ ...s, desc: !s.desc })),
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  /* ---------------------------- statusbar --------------------------- */

  const statusLeft = (
    <>
      <SbItem>Processes: {filtered.length}</SbItem>
      <SbSep />
      <SbItem>CPU: {cpuNow.toFixed(0)}%</SbItem>
      <SbSep />
      <SbItem>
        Memory: {memNowGB.toFixed(1)} GB ({((memNowGB / sysTotalMemGB) * 100).toFixed(0)}%)
      </SbItem>
      {notResponding > 0 ? (
        <>
          <SbSep />
          <SbItem style={{ color: '#ffd7d3' }}>Not responding: {notResponding}</SbItem>
        </>
      ) : null}
      {prefs.readOnly ? (
        <>
          <SbSep />
          <SbItem style={{ color: '#ffe9b3' }}>Read-only</SbItem>
        </>
      ) : null}
    </>
  );

  const statusRight = (
    <>
      <SbButton icon="Refresh" onClick={() => void refresh()} title="Refresh (F5)" />
      <SbButton onClick={() => setView((v) => (v === 'perf' ? 'details' : 'perf'))} icon={view === 'perf' ? 'List' : 'AreaChart'}>
        {view === 'perf' ? 'Fewer details' : 'More details'}
      </SbButton>
    </>
  );

  /* ---------------------------- rendering --------------------------- */

  return (
    <OfficeWindow
      meta={meta}
      tabs={tabs}
      search={{ value: search, onChange: setSearch, placeholder: 'Type a name to search' }}
      qat={{
        save: { onClick: () => void exportCsv(), tip: 'Export — save the current process list as CSV' },
        refresh: { onClick: () => void refresh(), tip: 'Refresh the process list' },
      }}
      onRefresh={() => void refresh()}
      backstageExtras={{
        refresh: () => void refresh(),
        properties: [
          { k: 'Processes', v: rows.length },
          { k: 'CPU total', v: `${cpuNow.toFixed(0)}%` },
          { k: 'Memory in use', v: `${memNowGB.toFixed(2)} GB` },
          { k: 'Not responding', v: notResponding },
          { k: 'View', v: view === 'perf' ? 'Performance' : 'Details' },
          { k: 'Mode', v: prefs.readOnly ? 'Read-only' : 'Full access' },
        ],
        exportItems: [
          {
            key: 'csv',
            label: 'Export process list (CSV)',
            desc: 'Saves the visible rows with name, PID, status, CPU and memory.',
            icon: 'ReportDocument',
            onClick: () => void exportCsv(),
          },
        ],
      }}
      statusLeft={statusLeft}
      statusRight={statusRight}
    >
      <NoticeStack notices={notices} onDismiss={dismiss} />
      {error ? (
        <NoticeStack notices={[{ key: -1, kind: 'error', text: error }]} onDismiss={() => setError(null)} />
      ) : null}

      {loading ? (
        <Busy label="Reading processes…" />
      ) : view === 'details' ? (
        <div className="list-host" style={{ paddingTop: 4 }}>
          <DetailsList
            items={filtered}
            columns={columns}
            selection={selection}
            selectionMode={SelectionMode.multiple}
            selectionPreservedOnEmptyClick
            checkboxVisibility={2 /* hidden */}
            onRenderItemColumn={renderItemColumn}
            styles={{ root: { fontSize: 12 } }}
          />
        </div>
      ) : (
        <div className="perf-grid">
          <div className="perf-charts">
            <div className="perf-chart-card">
              <div className="head">
                <span className="t">CPU</span>
                <span className="v">{cpuNow.toFixed(0)}%</span>
                <span className="s">Utilization over 2 minutes</span>
              </div>
              <LineChart data={hist.cpu} max={100} color={meta.palette.primary} />
            </div>
            <div className="perf-chart-card">
              <div className="head">
                <span className="t">Memory</span>
                <span className="v">{memNowGB.toFixed(1)} GB</span>
                <span className="s">of {sysTotalMemGB.toFixed(1)} GB in use</span>
              </div>
              <LineChart data={hist.mem} max={sysTotalMemGB} color={meta.palette.dark} />
            </div>
          </div>
          <div className="perf-stats">
            <div className="card">
              <h4>System</h4>
              <div className="kv"><span className="k">Uptime</span><span className="v">{fmtUptime(uptimeSec)}</span></div>
              <div className="kv"><span className="k">Processes</span><span className="v">{rows.length}</span></div>
              <div className="kv"><span className="k">Not responding</span><span className="v">{notResponding}</span></div>
            </div>
            <div className="card">
              <h4>Memory</h4>
              <div className="kv"><span className="k">In use</span><span className="v">{memNowGB.toFixed(2)} GB</span></div>
              <div className="kv"><span className="k">Available</span><span className="v">{Math.max(0, sysTotalMemGB - memNowGB).toFixed(2)} GB</span></div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: '#605e5c', marginBottom: 3 }}>Committed</div>
                <Bar pct={(memNowGB / sysTotalMemGB) * 100} />
              </div>
            </div>
            <div className="card">
              <h4>Top processes</h4>
              {[...rows]
                .sort((a, b) => b.cpuPercent - a.cpuPercent)
                .slice(0, 5)
                .map((p) => (
                  <div className="kv" key={p.pid}>
                    <span className="k" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.replace(/\.exe$/i, '')}</span>
                    <span className="v cell-num">{p.cpuPercent.toFixed(1)}%</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Run new task dialog */}
      <OfficeDialog
        open={runOpen}
        title="Create new task"
        onClose={() => setRunOpen(false)}
        maxWidth={520}
      >
        <div className="hint">Type the name of a program, folder, document or resource, and the suite will open it for you.</div>
        <TextField
          value={runValue}
          onChange={(_, v) => setRunValue(v ?? '')}
          placeholder="notepad.exe"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runTask();
          }}
          autoFocus
        />
        <DialogButtons>
          <DefaultButton onClick={() => setRunOpen(false)}>Cancel</DefaultButton>
          <PrimaryButton onClick={() => void runTask()} disabled={!runValue.trim()}>
            Run
          </PrimaryButton>
        </DialogButtons>
      </OfficeDialog>

      {/* Select columns dialog */}
      <OfficeDialog
        open={colsOpen}
        title="Select columns"
        onClose={() => setColsOpen(false)}
        maxWidth={420}
      >
        <div className="hint">Choose which data columns are shown in the process list.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
          {(
            [
              ['cpu', 'CPU'],
              ['mem', 'Memory'],
              ['status', 'Status'],
              ['title', 'Window title'],
              ['username', 'User name'],
              ['company', 'Company'],
            ] as const
          ).map(([c, label]) => (
            <Checkbox
              key={c}
              label={label}
              checked={colVis[c]}
              onChange={() => setColVis((v) => ({ ...v, [c]: !v[c] }))}
              styles={{ root: { fontSize: 12 } }}
            />
          ))}
        </div>
        <DialogButtons>
          <PrimaryButton onClick={() => setColsOpen(false)}>Close</PrimaryButton>
        </DialogButtons>
      </OfficeDialog>
    </OfficeWindow>
  );
}
