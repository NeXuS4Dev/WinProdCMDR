/**
 * WinProdCMDR — shared Office 2016 motion presets.
 *
 * `slideDownIn10` is the exact motion Office uses for its dropdown menus
 * (slide down 10px + fade, ~100ms). Applied to every ContextualMenu so the
 * suite's menus feel like Word/Excel/PowerPoint instead of appearing flat.
 */

import { AnimationStyles } from '@fluentui/react';

export const officeMenuStyles = { root: { ...AnimationStyles.slideDownIn10 } };

/** Dialog: quick fade of the overlay + a subtle scale-up of the panel. */
export const officeDialogMotion = {
  main: { ...AnimationStyles.scaleUpIn100 },
  root: { ...AnimationStyles.fadeIn200 },
};
