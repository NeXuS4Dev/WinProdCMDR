/**
 * Office-styled dialog: app-colored caption with white title + close X,
 * white body, right-aligned action buttons — like every Office 2016 dialog.
 */

import * as React from 'react';
import { Dialog, DialogType } from '@fluentui/react';
import { officeDialogMotion } from './motion';

export function OfficeDialog(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <Dialog
      hidden={!props.open}
      onDismiss={props.onClose}
      className="ow-dialog"
      dialogContentProps={{
        type: DialogType.normal,
        title: props.title,
        showCloseButton: true,
      }}
      modalProps={{ isBlocking: false, isDarkOverlay: true, styles: { root: officeDialogMotion.root } }}
      styles={{
        main: { ...(props.maxWidth ? { maxWidth: props.maxWidth } : {}), ...officeDialogMotion.main },
      }}
    >
      {props.children}
      {props.footer ? <div className="ms-Dialog-actions">{props.footer}</div> : null}
    </Dialog>
  );
}

export function DialogButtons(props: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        padding: '14px 20px 16px',
        margin: '0 -20px -8px',
      }}
    >
      {props.children}
    </div>
  );
}
