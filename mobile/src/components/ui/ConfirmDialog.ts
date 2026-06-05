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
  onConfirmInput?: (inputValue: string, selectedOptions?: string[]) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  promptPlaceholder?: string;
  promptInitialValue?: string;
  promptOptions?: string[];
  promptOptionsLabel?: string;
  promptInitialSelections?: string[];
  promptAutoSuggestSelections?: (inputValue: string) => string[];
  promptSelectionMode?: 'single' | 'multi';
};

export const showConfirmDialog = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onConfirmInput,
  onCancel,
  promptPlaceholder,
  promptInitialValue,
  promptOptions,
  promptOptionsLabel,
  promptInitialSelections,
  promptAutoSuggestSelections,
  promptSelectionMode,
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
    onConfirmInput,
    onCancel,
    promptPlaceholder,
    promptInitialValue,
    promptOptions,
    promptOptionsLabel,
    promptInitialSelections,
    promptAutoSuggestSelections,
    promptSelectionMode,
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

type InputConfirmDialogOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  initialValue?: string;
  promptOptions?: string[];
  promptOptionsLabel?: string;
  initialSelections?: string[];
  autoSuggestSelections?: (inputValue: string) => string[];
  selectionMode?: 'single' | 'multi';
  onConfirmInput: (inputValue: string, selectedOptions?: string[]) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
};

export const showInputConfirmDialog = ({
  title,
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  placeholder,
  initialValue,
  promptOptions,
  promptOptionsLabel,
  initialSelections,
  autoSuggestSelections,
  selectionMode,
  onConfirmInput,
  onCancel,
}: InputConfirmDialogOptions) => {
  showConfirmDialog({
    title,
    message,
    confirmText,
    cancelText,
    destructive: false,
    onConfirm: () => {},
    onConfirmInput,
    onCancel,
    promptPlaceholder: placeholder,
    promptInitialValue: initialValue,
    promptOptions,
    promptOptionsLabel,
    promptInitialSelections: initialSelections,
    promptAutoSuggestSelections: autoSuggestSelections,
    promptSelectionMode: selectionMode,
  });
};
