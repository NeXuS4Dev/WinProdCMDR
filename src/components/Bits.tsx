/**
 * Small shared UI pieces: live line charts, KV cards, progress bars,
 * notice stack and busy overlay — all styled like classic Office 2016.
 */

import * as React from 'react';
import { Icon, MessageBar, MessageBarType, Spinner } from '@fluentui/react';

/* ------------------------------- LineChart --------------------------- */

export function LineChart(props: {
  data: number[];
  max: number;
  color: string;
  height?: number;
  unit?: string;
}) {
  const { data, max, color } = props;
  const W = 600;
  const H = 150;
  const pts = data.slice(-60);
  const toXY = (v: number, i: number): [number, number] => {
    const x = (i / Math.max(1, 59)) * W;
    const y = H - Math.max(0, Math.min(1, v / max)) * (H - 6) - 3;
    return [x, y];
  };
  const line = pts.map((v, i) => toXY(v, i).join(',')).join(' ');
  const area = pts.length > 1 ? `0,${H} ${line} ${(Math.min(pts.length, 60) - 1) / 59 * W},${H}` : '';

  return (
    <svg
      width="100%"
      height={props.height ?? 150}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block', background: '#fff', border: '1px solid #e1dfdd' }}
    >
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#eceae9" strokeWidth="1" />
      ))}
      {pts.length > 1 ? (
        <>
          <polygon points={area} fill={color} opacity={0.14} />
          <polyline points={line} fill="none" stroke={color} strokeWidth="1.8" />
        </>
      ) : null}
    </svg>
  );
}

/* --------------------------------- Card ------------------------------ */

export function Card(props: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={props.style}>
      <h4>{props.title}</h4>
      {props.children}
    </div>
  );
}

export function KV(props: { k: string; v: React.ReactNode; title?: string }) {
  return (
    <div className="kv" title={props.title}>
      <span className="k">{props.k}</span>
      <span className="v">{props.v}</span>
    </div>
  );
}

export function Bar(props: { pct: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, props.pct));
  const cls = pct >= 92 ? 'crit' : pct >= 78 ? 'warn' : '';
  return (
    <div className="pbar" title={props.label ? `${props.label}: ${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`}>
      <div className={`fill ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ------------------------------- Notices ------------------------------ */

export interface NoticeModel {
  key: number;
  kind: 'info' | 'error' | 'success';
  text: string;
}

export function NoticeStack(props: {
  notices: NoticeModel[];
  onDismiss: (key: number) => void;
}) {
  if (!props.notices.length) return null;
  return (
    <div className="notice-stack">
      {props.notices.map((n) => (
        <MessageBar
          key={n.key}
          messageBarType={n.kind === 'error' ? MessageBarType.error : n.kind === 'success' ? MessageBarType.success : MessageBarType.info}
          onDismiss={() => props.onDismiss(n.key)}
          styles={{ root: { fontSize: 12 } }}
        >
          {n.text}
        </MessageBar>
      ))}
    </div>
  );
}

export function useNotices() {
  const [notices, setNotices] = React.useState<NoticeModel[]>([]);
  const keyRef = React.useRef(1);

  const push = React.useCallback((kind: NoticeModel['kind'], text: string, ttlMs?: number) => {
    const key = keyRef.current++;
    setNotices((ns) => [...ns.slice(-2), { key, kind, text }]);
    if (ttlMs) {
      window.setTimeout(() => {
        setNotices((ns) => ns.filter((n) => n.key !== key));
      }, ttlMs);
    }
  }, []);

  const dismiss = React.useCallback((key: number) => {
    setNotices((ns) => ns.filter((n) => n.key !== key));
  }, []);

  return { notices, push, dismiss };
}

/* -------------------------------- Busy -------------------------------- */

export function Busy(props: { label: string }) {
  return (
    <div className="busy">
      <Spinner />
      <div className="busy-label">{props.label}</div>
    </div>
  );
}

/* ------------------------------ misc bits ----------------------------- */

export function StatusDot(props: { status: string }) {
  const s = props.status.toLowerCase();
  if (s === 'running') {
    return (
      <span className="cell-ok">
        <Icon iconName="StatusCircleCheckmark" />
        Running
      </span>
    );
  }
  if (s.includes('pending') || s.includes('pausing')) {
    return (
      <span style={{ color: '#8a6c00', display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon iconName="StatusCircleExclamation" />
        {props.status}
      </span>
    );
  }
  if (s === 'stopped') {
    return (
      <span className="cell-muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon iconName="StatusCircleBlock" />
        Stopped
      </span>
    );
  }
  return <span>{props.status}</span>;
}

export function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtGB(gb: number): string {
  return gb >= 10 ? `${gb.toFixed(1)} GB` : `${gb.toFixed(2)} GB`;
}
