/**
 * Office 2016 title bar: app-colored strip with the Quick Access Toolbar on
 * the left, the centered window title, and Windows-style caption buttons on
 * the right. Doubles as the drag region for the frameless Electron window.
 */

import * as React from 'react';
import { ContextualMenu, Icon } from '@fluentui/react';
import type { WindowControls } from '../bridge';

export interface QatAction {
  icon: string;
  tip: string;
  onClick: () => void;
  disabled?: boolean;
}

export function TitleBar(props: {
  title: string;
  /** null → non-Electron (browser preview): chrome buttons are hidden. */
  controls: WindowControls | null;
  maximized: boolean;
  /** Double-clicking the title bar toggles maximize (Windows behavior). */
  onDoubleClick?: () => void;
  qat: { items: QatAction[]; menu: { key: string; text: string; icon?: string; onClick: () => void; checked?: boolean; dividerBefore?: boolean }[] };
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLButtonElement>(null);

  const w = props.controls;

  return (
    <div className="ow-tb drag" onDoubleClick={props.onDoubleClick}>
      <div className="ow-qat">
        {props.qat.items.map((a, i) => (
          <React.Fragment key={`${a.icon}-${i}`}>
            <button
              className="qat-btn"
              disabled={a.disabled}
              onClick={a.onClick}
              title={a.tip}
            >
              <Icon iconName={a.icon} />
            </button>
            {i === props.qat.items.length - 2 ? <span className="qat-sep" /> : null}
          </React.Fragment>
        ))}
        <button
          ref={menuRef}
          className="qat-btn"
          onClick={() => setMenuOpen(true)}
          title="Customize Quick Access Toolbar"
        >
          <Icon iconName="ChevronDownSmall" />
        </button>
      </div>

      <div className="ow-tb-title">{props.title}</div>

      {w ? (
        <div className="ow-wc">
          <button className="wc-btn" onClick={() => w.minimize()} title="Minimize">
            <Icon iconName="ChromeMinimize" />
          </button>
          <button className="wc-btn" onClick={() => w.toggleMaximize()} title={props.maximized ? 'Restore' : 'Maximize'}>
            <Icon iconName={props.maximized ? 'ChromeRestore' : 'ChromeMaximize'} />
          </button>
          <button className="wc-btn wc-close" onClick={() => w.close()} title="Close">
            <Icon iconName="ChromeClose" />
          </button>
        </div>
      ) : (
        <div style={{ width: 8 }} />
      )}

      <ContextualMenu
        items={props.qat.menu.map((m) => ({
          key: m.key,
          text: m.text,
          iconProps: m.icon ? { iconName: m.icon } : undefined,
          onClick: () => {
            m.onClick();
          },
          canCheck: m.checked !== undefined,
          checked: m.checked,
        }))}
        hidden={!menuOpen}
        target={menuRef}
        onDismiss={() => setMenuOpen(false)}
        shouldFocusOnMount
      />
    </div>
  );
}
