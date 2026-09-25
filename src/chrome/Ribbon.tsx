/**
 * WinProdCMDR — the ribbon itself: tab strip behavior and the white body with
 * groups, dividers, large/small controls, split menus and dialog launchers,
 * faithfully recreating the classic Office 2016 ribbon layout.
 */

import * as React from 'react';
import { ContextualMenu, Icon, type IContextualMenuItem } from '@fluentui/react';
import type { RibbonGroupDef, RibbonItem, RibbonMenuItem, RibbonTabDef } from './ribbonTypes';
import { useScreentip } from './Screentip';
import { officeMenuStyles } from './motion';

/* ------------------------------------------------------------------ */
/* Menu mapping                                                        */
/* ------------------------------------------------------------------ */

function toMenuItems(items: RibbonMenuItem[]): IContextualMenuItem[] {
  const out: IContextualMenuItem[] = [];
  for (const it of items) {
    if (it.dividerBefore) out.push({ key: `${it.key}-div`, itemType: 1 }); // Divider
    if (it.header) {
      out.push({ key: it.key, text: it.header, itemType: 2 }); // Header
      continue;
    }
    out.push({
      key: it.key,
      text: it.text,
      iconProps: it.icon ? { iconName: it.icon, style: it.iconColor ? { color: it.iconColor } : undefined } : undefined,
      disabled: it.disabled,
      canCheck: it.checked !== undefined,
      checked: it.checked,
      onClick: it.onClick
        ? () => {
            it.onClick?.();
          }
        : undefined,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ribbon controls                                                     */
/* ------------------------------------------------------------------ */

function LargeButton(props: { item: Extract<RibbonItem, { kind: 'large' }> }) {
  const { item } = props;
  const { handlers, screentip } = useScreentip(item.tip, item.disabled);
  return (
    <>
      <button
        className="rbbtn rbbtn-lg"
        disabled={item.disabled}
        onClick={item.onClick}
        {...handlers}
      >
        <span className="ic">
          <Icon iconName={item.icon} styles={item.iconColor ? { root: { color: item.iconColor } } : undefined} />
        </span>
        <span className="lb">{item.label}</span>
      </button>
      {screentip}
    </>
  );
}

function LargeSplitButton(props: {
  item: Extract<RibbonItem, { kind: 'largeSplit' }>;
}) {
  const { item } = props;
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const { handlers, screentip } = useScreentip(item.tip, item.disabled);
  return (
    <>
      <button
        ref={btnRef}
        className="rbbtn rb-lg-split"
        disabled={item.disabled}
        {...handlers}
      >
        <span
          className="top"
          onClick={(e) => {
            if (item.disabled) return;
            e.stopPropagation();
            item.onDefaultClick();
          }}
        >
          <span className="ic">
            <Icon iconName={item.icon} styles={item.iconColor ? { root: { color: item.iconColor } } : undefined} />
          </span>
          <span className="lb">{item.label}</span>
        </span>
        <span
          className="strip"
          onClick={(e) => {
            if (item.disabled) return;
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Icon iconName="ChevronDownSmall" />
        </span>
      </button>
      {screentip}
      <ContextualMenu
        items={toMenuItems(item.menu)}
        hidden={!open}
        target={btnRef}
        onDismiss={() => setOpen(false)}
        shouldFocusOnMount
        styles={officeMenuStyles}
      />
    </>
  );
}

function SmallRow(props: { item: RibbonItem }) {
  const { item } = props;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const ref = React.useRef<HTMLButtonElement>(null);

  if (item.kind === 'checkbox') {
    return <CheckboxRow item={item} />;
  }
  if (item.kind === 'select') {
    return <SelectRow item={item} />;
  }

  const { handlers, screentip } = useScreentip(item.tip, item.disabled);

  if (item.kind === 'small') {
    return (
      <>
        <button
          ref={ref}
          className="rbbtn rbbtn-sm"
          disabled={item.disabled}
          onClick={item.onClick}
          {...handlers}
        >
          <span className="ic">
            <Icon iconName={item.icon} styles={item.iconColor ? { root: { color: item.iconColor } } : undefined} />
          </span>
          <span className="lb">{item.label}</span>
        </button>
        {screentip}
      </>
    );
  }

  if (item.kind === 'toggle') {
    return (
      <>
        <button
          ref={ref}
          className={`rbbtn rbbtn-sm${item.checked ? ' checked' : ''}`}
          disabled={item.disabled}
          onClick={item.onToggle}
          {...handlers}
        >
          <span className="ic">
            <Icon iconName={item.icon} styles={item.iconColor ? { root: { color: item.iconColor } } : undefined} />
          </span>
          <span className="lb">{item.label}</span>
        </button>
        {screentip}
      </>
    );
  }

  // smallSplit
  const split = item as Extract<RibbonItem, { kind: 'smallSplit' }>;
  return (
    <>
      <button
        ref={ref}
        className="rbbtn rbbtn-sm split"
        disabled={split.disabled}
        onClick={(e) => {
          if (split.disabled) return;
          if (split.onDefaultClick && !(e.target as HTMLElement).closest('.caret-zone')) {
            split.onDefaultClick();
            return;
          }
          setMenuOpen(true);
        }}
        {...handlers}
      >
        <span className="ic">
          <Icon iconName={split.icon} styles={split.iconColor ? { root: { color: split.iconColor } } : undefined} />
        </span>
        <span className="lb">
          {split.label}
          <span className="caret-zone" style={{ display: 'flex' }}>
            <Icon iconName="ChevronDownSmall" />
          </span>
        </span>
      </button>
      {screentip}
      <ContextualMenu
        items={toMenuItems(split.menu)}
        hidden={!menuOpen}
        target={ref}
        onDismiss={() => setMenuOpen(false)}
        shouldFocusOnMount
        styles={officeMenuStyles}
      />
    </>
  );
}

function CheckboxRow(props: { item: Extract<RibbonItem, { kind: 'checkbox' }> }) {
  const { item } = props;
  const { handlers, screentip } = useScreentip(item.tip, item.disabled);
  return (
    <>
      <button
        className={`rbbtn rbbtn-sm rb-check${item.disabled ? ' disabled' : ''}`}
        disabled={item.disabled}
        onClick={item.onToggle}
        {...handlers}
      >
        <span className="box">{item.checked ? <Icon iconName="CheckMark" /> : null}</span>
        <span className="lb">{item.label}</span>
      </button>
      {screentip}
    </>
  );
}

function SelectRow(props: { item: Extract<RibbonItem, { kind: 'select' }> }) {
  const { item } = props;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLButtonElement>(null);
  const current = item.options.find((o) => o.key === item.value);
  const { handlers, screentip } = useScreentip(item.tip, item.disabled);
  return (
    <>
      <button
        ref={ref}
        className="rbbtn rb-select"
        style={{ width: item.width }}
        disabled={item.disabled}
        onClick={() => setOpen(true)}
        {...handlers}
      >
        <span className="lb">{current?.text ?? ''}</span>
        <Icon iconName="ChevronDownSmall" />
      </button>
      {screentip}
      <ContextualMenu
        items={toMenuItems(
          item.options.map((o) => ({
            key: o.key,
            text: o.text,
            checked: o.key === item.value,
            onClick: () => {
              item.onSelect(o.key);
            },
          })),
        )}
        hidden={!open}
        target={ref}
        onDismiss={() => setOpen(false)}
        shouldFocusOnMount
        styles={officeMenuStyles}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Group                                                               */
/* ------------------------------------------------------------------ */

function Group(props: { group: RibbonGroupDef }) {
  const { group } = props;
  const dlg = group.dialogLauncher;
  const dlgTip = useScreentip(dlg?.tip);
  return (
    <div className="ow-rgroup">
      <div className="rb-cols">
        {group.columns.map((col) =>
          col.kind === 'large' ? (
            <div className="rb-lgcol" key={col.key}>
              {col.item.kind === 'large' ? (
                <LargeButton item={col.item} />
              ) : (
                <LargeSplitButton item={col.item} />
              )}
            </div>
          ) : (
            <div className="rb-smcol" key={col.key}>
              {col.items.map((it) => (
                <SmallRow key={it.key} item={it} />
              ))}
            </div>
          ),
        )}
      </div>
      <div className="rb-label">
        {group.title}
        {dlg ? (
          <button
            className="rb-dlg"
            onClick={dlg.onClick}
            {...dlgTip.handlers}
            title={undefined}
          >
            <Icon iconName="ChevronDownSmall" />
          </button>
        ) : null}
        {dlg ? dlgTip.screentip : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ribbon body                                                         */
/* ------------------------------------------------------------------ */

export function RibbonBody(props: {
  tab: RibbonTabDef;
  overlay?: boolean;
  closing?: boolean;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className={`ow-ribbon${props.overlay ? ' overlay' : ''}${props.closing ? ' closing' : ''}`}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {props.tab.groups.map((g) => (
        <Group key={g.key} group={g} />
      ))}
    </div>
  );
}

export type { RibbonTabDef };
