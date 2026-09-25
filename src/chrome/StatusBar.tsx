/**
 * Office 2016 status bar — app color strip with contextual facts on the left
 * and view controls on the right.
 */

import * as React from 'react';
import { Icon } from '@fluentui/react';

export function StatusBar(props: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="ow-sb">
      {props.left}
      <div className="sb-right">{props.right}</div>
    </div>
  );
}

export function SbItem(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span className="sb-item" style={props.style}>
      {props.children}
    </span>
  );
}

export function SbSep() {
  return <span className="sb-sep" />;
}

export function SbButton(props: {
  onClick: () => void;
  children?: React.ReactNode;
  icon?: string;
  title?: string;
}) {
  return (
    <button className="sb-btn" onClick={props.onClick} title={props.title}>
      {props.icon ? <Icon iconName={props.icon} /> : null}
      {props.children}
    </button>
  );
}
