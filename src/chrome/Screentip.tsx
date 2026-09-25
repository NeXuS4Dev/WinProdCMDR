/**
 * Office-style screentips: white card, 1px border, soft shadow, appearing
 * below the control after a short delay — like Word/Excel 2016 hover help.
 */

import * as React from 'react';
import { Callout } from '@fluentui/react';
import type { Screentip } from './ribbonTypes';

interface HoverState {
  target: HTMLElement;
}

export function useScreentip(tip: Screentip | undefined, disabled?: boolean) {
  const [hover, setHover] = React.useState<HoverState | null>(null);
  const timer = React.useRef<number | undefined>(undefined);

  const clear = React.useCallback(() => {
    if (timer.current !== undefined) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
    }
    setHover(null);
  }, []);

  React.useEffect(() => () => clear(), [clear]);

  const show = React.useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!tip || disabled) return;
      const el = e.currentTarget;
      clear();
      timer.current = window.setTimeout(() => setHover({ target: el }), 420);
    },
    [tip, disabled, clear],
  );

  const handlers = React.useMemo(
    () => ({
      onMouseEnter: show,
      onMouseLeave: clear,
      onMouseDown: clear,
      onContextMenu: clear,
    }),
    [show, clear],
  );

  const screentip =
    hover && tip && !disabled ? (
      <Callout
        target={hover.target}
        gapSpace={2}
        isBeakVisible={false}
        setInitialFocus={false}
        doNotLayer={false}
        styles={{
          root: { boxShadow: 'none' },
          beak: { display: 'none' },
          calloutMain: { padding: 0 },
        }}
        onDismiss={clear}
      >
        <div className="screentip">
          <div className="t">{tip.title}</div>
          {tip.body ? <div className="b">{tip.body}</div> : null}
        </div>
      </Callout>
    ) : null;

  return { handlers, screentip };
}
