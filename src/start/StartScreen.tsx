/**
 * WinProdCMDR — App Browser.
 * A faithful recreation of the Office 2016 Start screen: dark left band with
 * the suite brand, large colored app tiles, and a live system snapshot below.
 */

import * as React from 'react';
import { Icon } from '@fluentui/react';
import { APP_LIST, SUITE_LONG_NAME, SUITE_NAME, SUITE_VERSION } from '../../shared/apps';
import { bridge } from '../bridge';
import type { SystemInfoModel } from '../../shared/types';
import { Bar, Card, KV, fmtGB, fmtUptime } from '../components/Bits';
import { TitleBar } from '../chrome/TitleBar';

export function StartScreen() {
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

  const isDemo = sys ? sys.demo : bridge.mode === 'browser';
  const memUsed = sys ? sys.memTotalGB - sys.memFreeGB : 0;

  return (
    <div className="ss">
      <TitleBar
        title={`${SUITE_NAME} — App Browser`}
        controls={bridge.window}
        maximized={false}
        qat={{
          items: [
            { icon: 'Home', tip: 'App Browser', onClick: () => undefined, disabled: true },
          ],
          menu: [
            { key: 'about', text: `About ${SUITE_NAME}`, icon: 'Info', onClick: () => undefined },
          ],
        }}
      />
      <div className="ss-main-wrap">
        <div className="ss-band">
          <div className="ss-brand">
            WinProd<b>CMDR</b>
          </div>
          <div className="ss-sub">
            {SUITE_LONG_NAME}
            <br />
            Manage Windows from three classic ribbon apps — processes, services and system facts.
          </div>
          <div className="spacer" />
          <div className="ss-band-bottom">
            Version {SUITE_VERSION}
            <br />
            {sys ? `${sys.osName} • ${sys.arch}` : 'Reading system…'}
            <div className={`ss-mode-chip${isDemo ? ' demo' : ''}`}>
              <span className="dot" />
              {isDemo ? 'Demo data (PowerShell unavailable)' : 'Live data via PowerShell'}
            </div>
          </div>
        </div>

        <div className="ss-main">
          <h1 className="ss-h1">Apps</h1>
          <div className="ss-h2">Launch a management app</div>
          <div className="ss-tiles">
            {APP_LIST.map((app) => (
              <button
                key={app.id}
                className="ss-tile"
                style={{ background: app.palette.primary }}
                onClick={() => bridge.openApp(app.id)}
                title={`Open ${app.name} in a new ribbon window`}
              >
                <span className="go">
                  <Icon iconName="OpenFile" />
                </span>
                <span className="ic">
                  <Icon iconName={app.icon} />
                </span>
                <span className="nm">{app.name}</span>
                <span className="tg">{app.tagline}</span>
              </button>
            ))}
          </div>

          <div className="ss-h2">System snapshot</div>
          <div className="ss-snapshot">
            {sys ? (
              <>
                <Card title="Operating system">
                  <KV k="Edition" v={sys.osName} />
                  <KV k="Build" v={sys.osBuild} />
                  <KV k="Architecture" v={sys.arch} />
                  <KV k="Uptime" v={fmtUptime(sys.uptimeSec)} />
                </Card>
                <Card title="Processor">
                  <KV k="Load" v={`${sys.cpuLoad}%`} />
                  <div style={{ margin: '4px 0 8px' }}>
                    <Bar pct={sys.cpuLoad} />
                  </div>
                  <KV k="Cores / Threads" v={`${sys.cpuCores} / ${sys.cpuThreads}`} />
                  <KV k="Model" v={sys.cpuName} title={sys.cpuName} />
                </Card>
                <Card title="Memory">
                  <KV k="In use" v={`${fmtGB(memUsed)} / ${fmtGB(sys.memTotalGB)}`} />
                  <div style={{ margin: '4px 0 8px' }}>
                    <Bar pct={(memUsed / sys.memTotalGB) * 100} />
                  </div>
                  <KV k="Free" v={fmtGB(sys.memFreeGB)} />
                  <KV k="Page file" v={sys.pageTotalGB ? fmtGB(sys.pageTotalGB) : '—'} />
                </Card>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#8a8a8a' }}>Reading system information…</div>
            )}
          </div>
          {sys?.demo ? (
            <div className="ss-snap-note">
              Running outside Windows (or PowerShell is unavailable) — showing simulated data.
              On Windows, all three apps query and control the real system.
            </div>
          ) : null}
        </div>
      </div>

      <div className="ss-sb">
        <span>Ready</span>
        <span className="sb-right">
          {SUITE_NAME} v{SUITE_VERSION} • 3 apps
        </span>
      </div>
    </div>
  );
}
