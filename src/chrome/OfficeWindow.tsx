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
 * Office 2016 motion model (all killable via Options → animations):
 *   - Pinned ribbon expands/collapses by ANIMATING ITS HEIGHT (96px ⇄ 0),
 *     so the content below is pushed/pulled smoothly, exactly like Office.
 *   - Collapsed ("Show Tabs") or auto-hide: the ribbon drops over the
 *     content as an overlay and slides back up when dismissed.
 *   - Auto-hide also hides the tab strip; moving the mouse to the top of
 *     the window reveals tabs + ribbon; leaving (or clicking content)
 *     hides them again.
 *   - Menus use Office's slideDownIn10 motion, screentips fade in.
 *
 * Classic behaviors kept: click active tab toggles, double-click pins,
 * Esc closes overlays, F5 refreshes, double-click title maximizes.
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
import { officeMenuStyles } from './motion';

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
type WrapState = 'in' | 'opening' | 'closing';
type OverlayState = 'closed' | 'open' | 'closing';

export function OfficeWindow(props: OfficeWindowProps) {
  const { meta } = props;
  const prefs = usePrefs();
  const [activeTab, setActiveTab] = React.useState(() => props.tabs[0]?.key ?? '');
  const [backstage, setBackstage] = React.useState<BackstageState>('closed');
  const [mode, setMode] = React.useState<RibbonMode>(props.ribbonMode ?? 'expanded');
  const [wrapState, setWrapState] = React.useState<WrapState>('in');
  const [overlay, setOverlay] = React.useState<OverlayState>('closed');
  const [revealed, setRevealed] = React.useState(false);
  const [dispMenuOpen, setDispMenuOpen] = React.useState(false);
  const [dispTarget, setDispTarget] = React.useState<HTMLElement | null>(null);
  const [windowActive, setWindowActive] = React.useState(true);
  const [maximized, setMaximized] = React.useState(false);

  const bsTimer = React.useRef<number | undefined>(undefined);
  const transTimer = React.useRef<number | undefined>(undefined);
  const hideTimer = React.useRef<number | undefined>(undefined);

  /* Mirrors for use inside timers/callbacks without staleness. */
  const modeRef = React.useRef(mode);
  modeRef.current = mode;
  const overlayRef = React.useRef(overlay);
  overlayRef.current = overlay;

  React.useEffect(
    () => () => {
      window.clearTimeout(bsTimer.current);
      window.clearTimeout(transTimer.current);
      window.clearTimeout(hideTimer.current);
    },
    [],
  );

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

  /* ------------------------- ribbon state machine --------------------- */

  const commitMode = (m: RibbonMode) => {
    setMode(m);
    props.onRibbonModeChange?.(m);
  };

  /** Mount the pinned ribbon and animate its height 0 → 96px. */
  const openPinned = () => {
    commitMode('expanded');
    setWrapState('opening');
    window.clearTimeout(transTimer.current);
    transTimer.current = window.setTimeout(() => setWrapState('in'), 170);
  };

  /** Animate the pinned ribbon's height 96px → 0, then unmount. */
  const closePinnedTo = (to: RibbonMode) => {
    setWrapState('closing');
    window.clearTimeout(transTimer.current);
    transTimer.current = window.setTimeout(() => {
      setWrapState('in');
      commitMode(to);
    }, 140);
  };

  /** Drop the ribbon over the content (collapsed click or auto-hide reveal). */
  const openOverlay = () => {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(transTimer.current);
    setRevealed(true);
    setOverlay('open');
  };

  /** Slide the overlay ribbon back up. */
  const closeOverlay = () => {
    window.clearTimeout(hideTimer.current);
    if (overlayRef.current !== 'open') {
      setRevealed(false);
      return;
    }
    setOverlay('closing');
    window.clearTimeout(transTimer.current);
    transTimer.current = window.setTimeout(() => {
      setOverlay('closed');
      setRevealed(false);
    }, 130);
  };

  /** Auto-hide: hide again shortly after the mouse leaves tabs/ribbon. */
  const scheduleAutohide = () => {
    if (modeRef.current !== 'autohide') return;
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (overlayRef.current === 'open') {
        setOverlay('closing');
        window.clearTimeout(transTimer.current);
        transTimer.current = window.setTimeout(() => {
          setOverlay('closed');
          setRevealed(false);
        }, 130);
      } else {
        setRevealed(false);
      }
    }, 260);
  };
  const cancelAutohide = () => window.clearTimeout(hideTimer.current);

  const setRibbonMode = (m: RibbonMode) => {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(transTimer.current);
    const cur = modeRef.current;
    if (m === cur) {
      closeOverlay();
      return;
    }
    if (cur === 'expanded' && m !== 'expanded') {
      if (overlayRef.current !== 'closed') {
        setOverlay('closing');
        transTimer.current = window.setTimeout(() => {
          setOverlay('closed');
          setRevealed(false);
          commitMode(m);
        }, 130);
      } else {
        closePinnedTo(m);
      }
      return;
    }
    if (m === 'expanded' && cur !== 'expanded') {
      if (overlayRef.current !== 'closed') {
        setOverlay('closing');
        transTimer.current = window.setTimeout(() => {
          setOverlay('closed');
          setRevealed(false);
          openPinned();
        }, 130);
      } else {
        openPinned();
      }
      return;
    }
    // hidden ⇄ hidden (collapsed ⇄ autohide)
    setOverlay('closed');
    setRevealed(false);
    commitMode(m);
  };

  const currentTab = props.tabs.find((t) => t.key === activeTab) ?? props.tabs[0];

  const onTabClick = (key: string) => {
    if (key === 'file') {
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(transTimer.current);
      setOverlay('closed');
      setRevealed(false);
      setWrapState((w) => (w === 'closing' ? 'in' : w));
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
      if (overlayRef.current !== 'closed') {
        closeOverlay();
      } else if (modeRef.current === 'expanded') {
        setRibbonMode('collapsed');
      } else if (modeRef.current === 'collapsed') {
        openOverlay();
      } else if (revealed) {
        closeOverlay();
      } else {
        openOverlay();
      }
      return;
    }
    setActiveTab(key);
    // Collapsed/auto-hide: choosing a different tab drops the ribbon for it.
    if (modeRef.current !== 'expanded' && overlayRef.current === 'closed') {
      openOverlay();
    }
  };

  const onTabDoubleClick = (key: string) => {
    if (key === 'file') return;
    setRibbonMode(modeRef.current === 'expanded' ? 'collapsed' : 'expanded');
  };

  /* Backstage close with slide-out -------------------------------------- */
  const closeBackstage = React.useCallback(() => {
    setBackstage((b) => (b === 'open' ? 'closing' : b));
    window.clearTimeout(bsTimer.current);
    bsTimer.current = window.setTimeout(() => setBackstage('closed'), 150);
  }, []);

  /* Gray out chrome when the window loses focus (inactive Office window) */
  const chromeColor = React.useMemo(() => {
    if (bridge.mode !== 'electron' || windowActive) return meta.palette.primary;
    return blend(meta.palette.primary, '#8f8f8f');
  }, [meta.palette.primary, windowActive]);

  const autohide = mode === 'autohide';
  const showBackstage = backstage !== 'closed';

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
        if (overlayRef.current !== 'closed') closeOverlay();
        else if (backstage === 'open') closeBackstage();
      } else if (e.key === 'F5') {
        e.preventDefault();
        props.onRefresh?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [backstage, closeBackstage, props]);

  return (
    <div
      className={`ow${prefs.animations ? '' : ' no-anim'}${autohide ? ' mode-autohide' : ''}`}
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

      <div
        className={`ow-tabs${revealed || !autohide ? ' revealed' : ''}`}
        onMouseEnter={cancelAutohide}
        onMouseLeave={autohide && overlay === 'open' ? scheduleAutohide : undefined}
      >
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
            {/* Pinned ribbon: wrapper animates its height (96px ⇄ 0). */}
            {mode === 'expanded' && currentTab ? (
              <div className={`ow-ribbonwrap${wrapState !== 'in' ? ` ${wrapState}` : ''}`}>
                <RibbonBody tab={currentTab} closing={wrapState === 'closing'} />
              </div>
            ) : null}

            {/* Overlay ribbon (collapsed click / auto-hide hover reveal). */}
            {overlay !== 'closed' && currentTab ? (
              <RibbonBody
                tab={currentTab}
                overlay
                closing={overlay === 'closing'}
                onMouseEnter={cancelAutohide}
                onMouseLeave={autohide && overlay === 'open' ? scheduleAutohide : undefined}
              />
            ) : null}

            {/* Auto-hide: reveal strip at the very top of the body. */}
            {autohide && !revealed ? (
              <div className="ohotzone" onMouseEnter={openOverlay} title="Show the ribbon" />
            ) : null}

            <div
              className="ow-content"
              onMouseDown={() => {
                if (overlay !== 'closed') closeOverlay();
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
        styles={officeMenuStyles}
      />
    </div>
  );
}
