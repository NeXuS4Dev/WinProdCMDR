/**
 * WinProdCMDR — the complete Office 2016 window shell.
 *
 * Layout (top to bottom):
 *   [ Title bar + QAT ]  app color, drag region, caption buttons
 *   [ Tab strip       ]  File | tabs | "Tell me" search | ribbon display options
 *   [ Ribbon body     ]  96px white strip (expanded), overlay (collapsed), hidden (auto-hide)
 *   [ Content         ]  the app's working area
 *   [ Status bar      ]  app color strip
 *
 * Classic behaviors:
 *   - Ribbon Display Options: Always show / Show tabs / Auto-hide
 *   - click active tab toggles ribbon, double-click pins, hover opens when collapsed
 *   - File opens the Backstage view (slides in like Office 2016)
 *   - F5 refreshes, Esc closes overlays, double-click title maximizes
 */

import * as React from 'react';
import { ContextualMenu, Icon } from '@fluentui/react';
import type { AppMeta } from '../../shared/apps';
import { bridge } from '../bridge';
import { blend } from '../theme';
import { usePrefs } from '../prefs';
import type { RibbonTabDef } from './ribbonTypes';
import { RibbonBody } from './Ribbon';
import { TitleBar, type QatAction } from './TitleBar';
import { Backstage, type BackstageExtras } from './Backstage';
import { StatusBar } from './StatusBar';

export type RibbonMode = 'expanded' | 'collapsed' | 'autohide';

export interface OfficeWindowProps {
  meta: AppMeta;
  tabs: RibbonTabDef[];
  /** Optional "Tell me"-style search box rendered in the tab strip. */
  search?: { value: string; onChange(v: string): void; placeholder?: string };
  qat?: {
    save?: { onClick: () => void; tip: string; disabled?: boolean };
    refresh?: { onClick: () => void; tip: string; disabled?: boolean };
    extra?: QatAction[];
  };
  /** Backstage content contributed by the app (properties / exports / refresh). */
  backstageExtras: BackstageExtras;
  /** F5 handler. */
  onRefresh?: () => void;
  ribbonMode?: RibbonMode;
  onRibbonModeChange?: (mode: RibbonMode) => void;
  statusLeft?: React.ReactNode;
  statusRight?: React.ReactNode;
  children: React.ReactNode;
}

type BackstageState = 'closed' | 'open' | 'closing';

export function OfficeWindow(props: OfficeWindowProps) {
  const { meta } = props;
  const prefs = usePrefs();
  const [activeTab, setActiveTab] = React.useState(() => props.tabs[0]?.key ?? '');
  const [backstage, setBackstage] = React.useState<BackstageState>('closed');
  const [mode, setMode] = React.useState<RibbonMode>(props.ribbonMode ?? 'expanded');
  const [ribbonClosing, setRibbonClosing] = React.useState(false);
  const [overlay, setOverlay] = React.useState(false);
  const [dispMenuOpen, setDispMenuOpen] = React.useState(false);
  const [dispTarget, setDispTarget] = React.useState<HTMLElement | null>(null);
  const [windowActive, setWindowActive] = React.useState(true);
  const [maximized, setMaximized] = React.useState(false);
  const closeTimer = React.useRef<number | undefined>(undefined);

  /* Window controls (Electron only) ------------------------------------ */
  React.useEffect(() => {
    const w = bridge.window;
    if (!w) return;
    let unsub: (() => void) | undefined;
    void w.isMaximized().then(setMaximized);
    unsub = w.onMaximized(setMaximized);
    const focus = () => setWindowActive(true);
    const blur = () => setWindowActive(false);
    window.addEventListener('focus', focus);
    window.addEventListener('blur', blur);
    return () => {
      unsub?.();
      window.removeEventListener('focus', focus);
      window.removeEventListener('blur', blur);
    };
  }, []);

  React.useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  /* Ribbon mode transitions (with Office-style slide) ------------------- */
  const commitMode = (m: RibbonMode) => {
    setMode(m);
    props.onRibbonModeChange?.(m);
    if (m === 'expanded') setOverlay(false);
  };

  const setRibbonMode = (m: RibbonMode) => {
    if (m === mode) {
      if (m !== 'expanded') setOverlay(false);
      return;
    }
    if (mode === 'expanded' && m !== 'expanded') {
      // animate the ribbon away, then collapse to tabs-only
      if (ribbonClosing) return;
      setOverlay(false);
      setRibbonClosing(true);
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        setRibbonClosing(false);
        commitMode(m);
      }, 130);
      return;
    }
    commitMode(m);
  };

  const currentTab = props.tabs.find((t) => t.key === activeTab) ?? props.tabs[0];

  const onTabClick = (key: string) => {
    if (key === 'file') {
      setBackstage((b) => (b === 'closed' ? 'open' : 'closed'));
      return;
    }
    if (backstage !== 'closed') {
      setBackstage('closed');
      setActiveTab(key);
      return;
    }
    if (key === activeTab) {
      // Clicking the active tab toggles the ribbon (classic behavior).
      if (overlay) {
        setOverlay(false);
      } else if (mode === 'expanded') {
        setRibbonMode('collapsed');
      } else {
        setRibbonMode('expanded');
      }
      return;
    }
    setActiveTab(key);
    if (mode !== 'expanded' && !ribbonClosing) setOverlay(true);
  };

  const onTabDoubleClick = (key: string) => {
    if (key === 'file') return;
    setRibbonMode(mode === 'expanded' ? 'collapsed' : 'expanded');
  };

  /* Backstage close with slide-out -------------------------------------- */
  const closeBackstage = React.useCallback(() => {
    setBackstage((b) => (b === 'open' ? 'closing' : b));
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setBackstage('closed'), 150);
  }, []);

  /* Gray out chrome when the window loses focus (inactive Office window) */
  const chromeColor = React.useMemo(() => {
    if (bridge.mode !== 'electron' || windowActive) return meta.palette.primary;
    return blend(meta.palette.primary, '#8f8f8f');
  }, [meta.palette.primary, windowActive]);

  const ribbonVisible = !ribbonClosing && (mode === 'expanded' || overlay);

  /* QAT ----------------------------------------------------------------- */
  const qatItems: QatAction[] = [];
  if (props.qat?.save) {
    qatItems.push({
      icon: 'Save',
      tip: props.qat.save.tip,
      onClick: props.qat.save.onClick,
      disabled: props.qat.save.disabled,
    });
  }
  qatItems.push({
    icon: 'Home',
    tip: 'App Browser — return to the launcher',
    onClick: () => bridge.goHome(),
  });
  if (props.qat?.refresh) {
    qatItems.push({
      icon: 'Refresh',
      tip: props.qat.refresh.tip,
      onClick: props.qat.refresh.onClick,
      disabled: props.qat.refresh.disabled,
    });
  }
  if (props.qat?.extra) qatItems.push(...props.qat.extra);

  const qatMenu = [
    { key: 'home', text: 'Open App Browser', icon: 'Home', onClick: () => bridge.goHome() },
    { key: 'about', text: `About ${meta.name}`, icon: 'Info', onClick: () => setBackstage('open') },
    { key: 'div', text: '', onClick: () => undefined, dividerBefore: true },
    { key: 'exp', text: 'Always show the Ribbon', onClick: () => setRibbonMode('expanded'), checked: mode === 'expanded' },
    { key: 'tabs', text: 'Show Tabs', onClick: () => setRibbonMode('collapsed'), checked: mode === 'collapsed' },
    { key: 'auto', text: 'Auto-hide the Ribbon', onClick: () => setRibbonMode('autohide'), checked: mode === 'autohide' },
  ];

  /* Keyboard: Esc closes overlays, F5 refreshes ------------------------- */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (overlay) setOverlay(false);
        else if (backstage === 'open') closeBackstage();
      } else if (e.key === 'F5') {
        e.preventDefault();
        props.onRefresh?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, backstage, closeBackstage, props]);

  const showBackstage = backstage !== 'closed';

  return (
    <div
      className={`ow${prefs.animations ? '' : ' no-anim'}`}
      style={
        {
          '--ow-primary': chromeColor,
          '--ow-dark': meta.palette.dark,
          '--ow-darker': meta.palette.darker,
        } as React.CSSProperties
      }
    >
      <TitleBar
        title={meta.window.title}
        controls={bridge.window}
        maximized={maximized}
        onDoubleClick={() => bridge.window?.toggleMaximize()}
        qat={{ items: qatItems, menu: qatMenu }}
      />

      <div className="ow-tabs">
        <button
          className={`ow-tab${showBackstage ? ' active' : ''}`}
          onClick={() => onTabClick('file')}
        >
          File
        </button>
        {props.tabs.map((t) => (
          <button
            key={t.key}
            className={`ow-tab${!showBackstage && t.key === activeTab ? ' active' : ''}`}
            onClick={() => onTabClick(t.key)}
            onDoubleClick={() => onTabDoubleClick(t.key)}
          >
            {t.title}
          </button>
        ))}
        <div className="ow-tabs-right">
          {props.search ? (
            <div className="tellme">
              <span className="tellme-ic">
                <Icon iconName="Search" />
              </span>
              <input
                type="text"
                placeholder={props.search.placeholder ?? 'Search'}
                value={props.search.value}
                onChange={(e) => props.search!.onChange(e.target.value)}
                spellCheck={false}
              />
            </div>
          ) : null}
          <button
            className="rbdisp"
            title="Ribbon Display Options"
            onClick={(e) => {
              setDispTarget(e.currentTarget);
              setDispMenuOpen(true);
            }}
          >
            <Icon iconName="ChevronDownSmall" />
          </button>
        </div>
      </div>

      <div className="ow-body">
        {showBackstage ? (
          <Backstage
            meta={meta}
            extras={props.backstageExtras}
            closing={backstage === 'closing'}
            onDone={closeBackstage}
          />
        ) : (
          <>
            {mode !== 'expanded' && !overlay && !ribbonClosing ? (
              <div
                className="ohotzone"
                onMouseEnter={() => setOverlay(true)}
                title="Show the ribbon"
              />
            ) : null}
            {ribbonVisible && currentTab ? (
              <RibbonBody tab={currentTab} overlay={overlay} closing={ribbonClosing} />
            ) : null}
            <div
              className="ow-content"
              onMouseDown={() => {
                if (overlay) setOverlay(false);
              }}
            >
              {props.children}
            </div>
          </>
        )}
      </div>

      <StatusBar left={props.statusLeft} right={props.statusRight} />

      {/* Ribbon display options (classic three-state menu) */}
      <ContextualMenu
        items={[
          { key: 'exp', text: 'Always show the Ribbon', iconProps: { iconName: 'Pin' }, canCheck: true, checked: mode === 'expanded', onClick: () => setRibbonMode('expanded') },
          { key: 'tabs', text: 'Show Tabs', iconProps: { iconName: 'View' }, canCheck: true, checked: mode === 'collapsed', onClick: () => setRibbonMode('collapsed') },
          { key: 'auto', text: 'Auto-hide the Ribbon', iconProps: { iconName: 'ChevronUp' }, canCheck: true, checked: mode === 'autohide', onClick: () => setRibbonMode('autohide') },
        ]}
        hidden={!dispMenuOpen}
        target={dispTarget}
        onDismiss={() => setDispMenuOpen(false)}
        shouldFocusOnMount
      />
    </div>
  );
}
