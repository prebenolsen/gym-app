import { useConfirmDialog } from './ConfirmDialogProvider';

// Note: These are helper functions that work with useConfirmDialog().
// They are exported for convenience but screens should use useConfirmDialog() hook directly.

let confirmDialogHook: ReturnType<typeof useConfirmDialog> | null = null;

export const setConfirmDialogHook = (hook: ReturnType<typeof useConfirmDialog>) => {
  confirmDialogHook = hook;
};

type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
};

export const showConfirmDialog = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogOptions) => {
  if (!confirmDialogHook) {
    console.warn('ConfirmDialog hook not initialized. Make sure ConfirmDialogProvider is in the app tree.');
    return;
  }
  confirmDialogHook.showConfirm({
    title,
    message,
    confirmText,
    cancelText,
    destructive,
    onConfirm,
    onCancel,
  });
};

export const showDeleteConfirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText = 'Delete',
) => {
  showConfirmDialog({
    title,
    message,
    confirmText,
    cancelText: 'Cancel',
    destructive: true,
    onConfirm,
  });
};
