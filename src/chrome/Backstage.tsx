/**
 * Office 2016 Backstage view — the full-window experience behind the File tab.
 *
 * Structure mirrors Word/Excel/PowerPoint 2016:
 *   [ colored left nav: Info · Open · Export · Close … Account · Options ]
 *   [ content page with a subtle horizontal slide between pages ]
 *
 * Info page replicates the classic three-column layout:
 *   big action buttons | Properties | Recent activity
 */

import * as React from 'react';
import { Checkbox, Dialog, DialogType, Icon } from '@fluentui/react';
import { APP_LIST, SUITE_LONG_NAME, SUITE_NAME, SUITE_VERSION, type AppMeta } from '../../shared/apps';
import { bridge } from '../bridge';
import { useActivity, formatActivityTime } from '../activity';
import { getPrefs, setPref } from '../prefs';
import type { SystemInfoModel } from '../../shared/types';

export type BackstageKey = 'info' | 'open' | 'export' | 'close' | 'account' | 'options';

export interface BackstageExtras {
  /** "Properties" rows (live values, re-evaluated on each render). */
  properties: { k: string; v: React.ReactNode }[];
  /** "Export" page entries (like Office's Export page options). */
  exportItems: { key: string; label: string; desc: string; icon: string; onClick: () => void }[];
  /** Refresh callback wired to the Info page big button. */
  refresh?: () => void;
}

const NAV_MAIN: { key: BackstageKey; text: string; icon: string }[] = [
  { key: 'info', text: 'Info', icon: 'Info' },
  { key: 'open', text: 'Open', icon: 'FolderOpen' },
  { key: 'export', text: 'Export', icon: 'ReportDocument' },
  { key: 'close', text: 'Close', icon: 'ChromeClose' },
];
const NAV_BOTTOM: { key: BackstageKey; text: string; icon: string }[] = [
  { key: 'account', text: 'Account', icon: 'SecurityGroup' },
  { key: 'options', text: 'Options', icon: 'Settings' },
];

/* ------------------------------------------------------------------ */
/* Info page                                                           */
/* ------------------------------------------------------------------ */

function InfoPage(props: { extras: BackstageExtras }) {
  const { extras } = props;
  const prefs = getPrefs();
  const activity = useActivity();
  const [sys, setSys] = React.useState<SystemInfoModel | null>(null);

  React.useEffect(() => {
    let live = true;
    bridge.getSystemInfo().then((r) => {
      if (live && r.ok) setSys(r.data ?? null);
    });
    return () => {
      live = false;
    };
  }, []);

  const bigBtn = (
    label: string,
    desc: string,
    icon: string,
    onClick: () => void,
    opts?: { disabled?: boolean; active?: boolean },
  ) => (
    <button
      key={label}
      className={`bs-bigbtn${opts?.active ? ' active' : ''}`}
      onClick={onClick}
      disabled={opts?.disabled}
    >
      <span className="bs-bigbtn-ic">
        {icon === 'Lock' && prefs.readOnly ? <span className="bs-lockdot" /> : null}
        <IconB name={icon} />
      </span>
      <span className="bs-bigbtn-tx">
        <span className="t">{label}</span>
        <span className="d">{desc}</span>
      </span>
    </button>
  );

  return (
    <div className="bs-info">
      <div className="bs-col bs-col-actions">
        {extras.refresh
          ? bigBtn('Refresh', 'Re-read all live information from Windows.', 'Refresh', extras.refresh)
          : null}
        {bigBtn(
          'Read-only mode',
          'Block actions that modify the system (end task, services…).',
          'Lock',
          () => setPref('readOnly', !prefs.readOnly),
          { active: prefs.readOnly },
        )}
        {bigBtn('Open App Browser', 'Launch the other apps of the suite.', 'Home', () => bridge.goHome())}
      </div>

      <div className="bs-col bs-col-props">
        <h3 className="bs-h3">Properties</h3>
        <div className="bs-props">
          {extras.properties.map((p) => (
            <div className="kv" key={p.k}>
              <span className="k">{p.k}</span>
              <span className="v">{p.v}</span>
            </div>
          ))}
        </div>
        {sys ? (
          <div className="bs-note">
            {sys.computerName} — {sys.demo ? 'demo data (simulation)' : 'live Windows data'}
            {sys.isAdmin ? ' · administrator' : ''}
          </div>
        ) : null}
      </div>

      <div className="bs-col bs-col-recent">
        <h3 className="bs-h3">Recent activity</h3>
        {activity.length ? (
          <>
            <div className="bs-recent-day">Today</div>
            <div className="bs-recent-list">
              {[...activity]
                .reverse()
                .slice(0, 10)
                .map((a) => (
                  <div className="bs-recent-row" key={a.id}>
                    <span className="bs-recent-time">{formatActivityTime(a.time)}</span>
                    <span className="bs-recent-text" title={a.text}>
                      {a.text}
                    </span>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <div className="bs-note">No recent activity yet in this session.</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Open page                                                           */
/* ------------------------------------------------------------------ */

function OpenPage(props: { meta: AppMeta }) {
  return (
    <div>
      <h1 className="bs-h1">Open</h1>
      <p className="bs-sub">Switch to another app of the {SUITE_NAME} suite.</p>
      <div className="bs-applist">
        {APP_LIST.map((app) => (
          <div key={app.id} className={`bs-approw${app.id === props.meta.id ? ' current' : ''}`}>
            <span className="dot" style={{ background: app.palette.primary }}>
              <IconB name={app.icon} />
            </span>
            <span className="bs-approw-tx">
              <b>{app.name}</b>
              <span className="bs-approw-sub">{app.tagline}</span>
            </span>
            {app.id === props.meta.id ? (
              <span className="bs-current">current app</span>
            ) : (
              <button className="rbbtn rbbtn-sm" onClick={() => bridge.openApp(app.id)}>
                Open
              </button>
            )}
          </div>
        ))}
        <div className="bs-approw">
          <span className="dot" style={{ background: '#1b1b1b' }}>
            <IconB name="Tiles" />
          </span>
          <span className="bs-approw-tx">
            <b>App Browser</b>
            <span className="bs-approw-sub">The launcher with all three apps</span>
          </span>
          <button className="rbbtn rbbtn-sm" onClick={() => bridge.goHome()}>
            Browse
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Export page                                                         */
/* ------------------------------------------------------------------ */

function ExportPage(props: { extras: BackstageExtras }) {
  return (
    <div>
      <h1 className="bs-h1">Export</h1>
      <p className="bs-sub">Save or copy the data of this app.</p>
      <div className="bs-applist">
        {props.extras.exportItems.map((e) => (
          <div key={e.key} className="bs-approw bs-exportrow">
            <span className="dot" style={{ background: 'var(--ow-primary)' }}>
              <IconB name={e.icon} />
            </span>
            <span className="bs-approw-tx">
              <b>{e.label}</b>
              <span className="bs-approw-sub">{e.desc}</span>
            </span>
            <button className="rbbtn rbbtn-sm" onClick={e.onClick}>
              Export
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account page                                                        */
/* ------------------------------------------------------------------ */

function AccountPage() {
  const [sys, setSys] = React.useState<SystemInfoModel | null>(null);
  React.useEffect(() => {
    let live = true;
    bridge.getSystemInfo().then((r) => {
      if (live && r.ok) setSys(r.data ?? null);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div>
      <h1 className="bs-h1">Account</h1>
      <p className="bs-sub">Product and user information.</p>

      <div className="bs-block" style={{ marginTop: 8 }}>
        <h3 className="bs-h3" style={{ color: 'var(--ow-primary)' }}>
          Product information
        </h3>
        <div className="bs-account-grid">
          <div className="kv"><span className="k">Product</span><span className="v">{SUITE_NAME}</span></div>
          <div className="kv"><span className="k">Full name</span><span className="v">{SUITE_LONG_NAME}</span></div>
          <div className="kv"><span className="k">Version</span><span className="v">{SUITE_VERSION}</span></div>
          <div className="kv"><span className="k">Apps</span><span className="v">3 (Task Manager, Services, System Info)</span></div>
          <div className="kv"><span className="k">License</span><span className="v">BSD-3-Clause</span></div>
          <div className="kv">
            <span className="k">Data mode</span>
            <span className="v">{sys ? (sys.demo ? 'Simulation (demo data)' : 'Live Windows data') : '…'}</span>
          </div>
        </div>
      </div>

      <div className="bs-block">
        <h3 className="bs-h3" style={{ color: 'var(--ow-primary)' }}>
          User information
        </h3>
        <div className="bs-account-grid">
          <div className="kv"><span className="k">User</span><span className="v">{sys?.userName ?? '—'}</span></div>
          <div className="kv"><span className="k">Computer</span><span className="v">{sys?.computerName ?? '—'}</span></div>
          <div className="kv">
            <span className="k">Role</span>
            <span className="v">{sys ? (sys.isAdmin ? 'Administrator' : 'Standard user') : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Backstage root                                                      */
/* ------------------------------------------------------------------ */

function BackstageInner(props: { meta: AppMeta; extras: BackstageExtras; onDone: () => void; closing: boolean }) {
  const [active, setActive] = React.useState<BackstageKey>('info');
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const prefs = getPrefs();

  const activate = (key: BackstageKey) => {
    if (key === 'close') {
      if (bridge.window) bridge.window.close();
      return;
    }
    if (key === 'options') {
      setOptionsOpen(true);
      return;
    }
    setActive(key);
  };

  return (
    <div className={`ow-backstage${props.closing ? ' closing' : ''}`}>
      <div className="bs-nav">
        {NAV_MAIN.map((it) => (
          <button
            key={it.key}
            className={`bs-item${active === it.key && it.key !== 'close' ? ' active' : ''}`}
            onClick={() => activate(it.key)}
          >
            <IconB name={it.icon} />
            {it.text}
          </button>
        ))}
        <div className="bs-spacer" />
        {NAV_BOTTOM.map((it) => (
          <button key={it.key} className={`bs-item${active === it.key ? ' active' : ''}`} onClick={() => activate(it.key)}>
            <IconB name={it.icon} />
            {it.text}
          </button>
        ))}
        <div style={{ padding: '0 18px 14px', fontSize: 11, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
          {SUITE_NAME}
          <br />
          Version {SUITE_VERSION}
        </div>
      </div>

      <div className="bs-content" key={active}>
        {active === 'info' ? <InfoPage extras={props.extras} /> : null}
        {active === 'open' ? <OpenPage meta={props.meta} /> : null}
        {active === 'export' ? <ExportPage extras={props.extras} /> : null}
        {active === 'account' ? <AccountPage /> : null}
      </div>

      <Dialog
        hidden={!optionsOpen}
        onDismiss={() => setOptionsOpen(false)}
        className="ow-dialog"
        dialogContentProps={{ type: DialogType.normal, title: `${SUITE_NAME} Options`, showCloseButton: true }}
        modalProps={{ isBlocking: false, isDarkOverlay: true }}
      >
        <div className="hint">These settings apply to this computer and are saved automatically.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, margin: '0 0 14px' }}>
          <Checkbox
            label="Show ScreenTips on ribbon controls"
            checked={prefs.screentips}
            onChange={() => setPref('screentips', !prefs.screentips)}
            styles={{ root: { fontSize: 12 } }}
          />
          <Checkbox
            label="Enable animations"
            checked={prefs.animations}
            onChange={() => setPref('animations', !prefs.animations)}
            styles={{ root: { fontSize: 12 } }}
          />
        </div>
        <div className="hint" style={{ marginTop: 0 }}>
          Read-only mode can be toggled on the Info page.
        </div>
      </Dialog>
    </div>
  );
}

export function Backstage(props: {
  meta: AppMeta;
  extras: BackstageExtras;
  onDone: () => void;
  closing: boolean;
}) {
  return (
    <BackstageInner
      meta={props.meta}
      extras={props.extras}
      onDone={props.onDone}
      closing={props.closing}
    />
  );
}

/** Local wrapper so call sites read <IconB name="..."/>. */
function IconB(props: { name: string }) {
  return <Icon iconName={props.name} />;
}
