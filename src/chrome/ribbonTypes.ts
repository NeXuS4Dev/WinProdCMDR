/**
 * WinProdCMDR — ribbon definition types.
 *
 * The ribbon is data-driven: apps declare tabs → groups → columns of items,
 * mirroring how real Office ribbons are structured (a large button occupies a
 * column; small controls stack in multi-row columns).
 */

export interface Screentip {
  title: string;
  body?: string;
}

export interface RibbonMenuItem {
  key: string;
  text: string;
  icon?: string;
  iconColor?: string;
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean;
  /** Render as a non-interactive section header. */
  header?: string;
  dividerBefore?: boolean;
}

interface RibbonButtonBase {
  key: string;
  icon: string;
  label: string;
  tip?: Screentip;
  disabled?: boolean;
  /** Optional icon tint (classic Office ribbons use colored artwork). */
  iconColor?: string;
}

export type RibbonItem =
  | (RibbonButtonBase & { kind: 'large'; onClick: () => void })
  | (RibbonButtonBase & { kind: 'small'; onClick: () => void })
  | (RibbonButtonBase & { kind: 'smallSplit'; menu: RibbonMenuItem[]; onDefaultClick?: () => void })
  | (RibbonButtonBase & { kind: 'largeSplit'; menu: RibbonMenuItem[]; onDefaultClick: () => void })
  | (RibbonButtonBase & { kind: 'toggle'; checked: boolean; onToggle: () => void })
  | {
      kind: 'checkbox';
      key: string;
      label: string;
      checked: boolean;
      onToggle: () => void;
      tip?: Screentip;
      disabled?: boolean;
    }
  | {
      kind: 'select';
      key: string;
      value: string;
      options: { key: string; text: string }[];
      onSelect: (key: string) => void;
      width?: number;
      tip?: Screentip;
      disabled?: boolean;
    };

export type RibbonColumn =
  | { kind: 'large'; key: string; item: RibbonItem & { kind: 'large' | 'largeSplit' } }
  | { kind: 'smalls'; key: string; items: RibbonItem[] };

export interface RibbonGroupDef {
  key: string;
  title: string;
  columns: RibbonColumn[];
  /** The tiny chevron in the group's bottom-right corner that opens a dialog. */
  dialogLauncher?: {
    tip: Screentip;
    onClick: () => void;
  };
}

export interface RibbonTabDef {
  key: string;
  title: string;
  groups: RibbonGroupDef[];
}
