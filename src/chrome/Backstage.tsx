/**
 * Office 2016 Backstage view — the full-window experience behind the File tab.
 * Left nav in the app color with white items; content pane on the right.
 */

import * as React from 'react';
import { Icon } from '@fluentui/react';
import { APP_LIST, SUITE_NAME, SUITE_VERSION, type AppMeta } from '../../shared/apps';
import { bridge } from '../bridge';
import type { SystemInfoModel } from '../../shared/types';

export type BackstageKey = 'info' | 'home' | 'exit';

function BackstageInfo(props: { meta: AppMeta }) {
  const { meta } = props;
  const [sys, setSys] = React.useState<SystemInfoModel | null>(null);

  React.useEffect(() => {
    let live = true;
    bridge.getSystemInfo().then((r) => {
      if (live && r.ok && r.data) setSys(r.data);
    });
    return () => {
      live = false;
    };
  }, []);

  const isDemo = sys ? sys.demo : bridge.mode === 'browser';

  return (
    <div>
      <h1 className="bs-h1">
        <span className="bs-appicon">
          <Icon iconName={meta.icon} />
        </span>
        {meta.name}
        <span className={`bs-badge ${isDemo ? 'demo' : 'live'}`}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: isDemo ? '#ffb900' : '#107c10' }} />
          {isDemo ? 'Demo data' : 'Live Windows data'}
        </span>
      </h1>
      <p className="bs-sub">{meta.description}</p>

      <div className="bs-block">
        <h3>System</h3>
        <div style={{ fontSize: 12, color: '#333', lineHeight: 1.9 }}>
          {sys ? (
            <>
              <div>{sys.osName} • Build {sys.osBuild} • {sys.arch}</div>
              <div>
                Signed in as <b>{sys.userName ?? sys.computerName}</b>
                {sys.isAdmin !== undefined ? (sys.isAdmin ? ' — Administrator' : ' — Standard user') : ''}
              </div>
              <div>Computer name: {sys.computerName}</div>
            </>
          ) : (
            <div style={{ color: '#a19f9d' }}>Reading system information…</div>
          )}
        </div>
      </div>

      <div className="bs-block">
        <h3>{SUITE_NAME} suite</h3>
        <div className="bs-applist">
          {APP_LIST.map((app) => (
            <div key={app.id} className={`bs-approw${app.id === meta.id ? ' current' : ''}`}>
              <span className="dot" style={{ background: app.palette.primary }}>
                <Icon iconName={app.icon} />
              </span>
              <span>
                <b>{app.name}</b>
                <span style={{ color: '#797775' }}> — {app.tagline}</span>
              </span>
              {app.id === meta.id ? (
                <span style={{ color: '#797775' }}>current app</span>
              ) : (
                <button className="rbbtn rbbtn-sm" onClick={() => bridge.openApp(app.id)}>
                  Open
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bs-block" style={{ fontSize: 11.5, color: '#a19f9d' }}>
        {SUITE_NAME} version {SUITE_VERSION} — a suite of three Windows management apps with the
        classic Office 2016 ribbon. Not affiliated with Microsoft.
      </div>
    </div>
  );
}

export function Backstage(props: { meta: AppMeta; onDone: () => void }) {
  const [active, setActive] = React.useState<BackstageKey>('info');

  const items: { key: BackstageKey; text: string; icon: string }[] = [
    { key: 'info', text: 'Info', icon: 'Info' },
    { key: 'home', text: 'App Browser', icon: 'Home' },
    { key: 'exit', text: 'Exit', icon: 'ChromeClose' },
  ];

  const activate = (key: BackstageKey) => {
    if (key === 'home') {
      bridge.goHome();
      props.onDone();
      return;
    }
    if (key === 'exit') {
      if (bridge.window) bridge.window.close();
      props.onDone();
      return;
    }
    setActive(key);
  };

  return (
    <div className="ow-backstage">
      <div className="bs-nav">
        {items.map((it) => (
          <button
            key={it.key}
            className={`bs-item${active === it.key ? ' active' : ''}`}
            onClick={() => activate(it.key)}
          >
            <Icon iconName={it.icon} />
            {it.text}
          </button>
        ))}
        <div className="bs-spacer" />
        <div style={{ padding: '0 18px 16px', fontSize: 11, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
          {SUITE_NAME}
          <br />
          Version {SUITE_VERSION}
        </div>
      </div>
      <div className="bs-content">
        {active === 'info' ? <BackstageInfo meta={props.meta} /> : null}
      </div>
    </div>
  );
}
