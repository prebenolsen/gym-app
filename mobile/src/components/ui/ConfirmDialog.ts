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
  onConfirmSelection?: (selectedOptions: string[]) => void | Promise<void>;
  onConfirmDualInput?: (
    primaryInputValue: string,
    secondaryInputValue: string,
    selectedOptions?: string[],
  ) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  promptPlaceholder?: string;
  promptInitialValue?: string;
  promptSecureTextEntry?: boolean;
  promptSecondaryPlaceholder?: string;
  promptSecondaryInitialValue?: string;
  promptSecondarySecureTextEntry?: boolean;
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
  onConfirmSelection,
  onConfirmDualInput,
  onCancel,
  promptPlaceholder,
  promptInitialValue,
  promptSecureTextEntry,
  promptSecondaryPlaceholder,
  promptSecondaryInitialValue,
  promptSecondarySecureTextEntry,
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
    onConfirmSelection,
    onConfirmDualInput,
    onCancel,
    promptPlaceholder,
    promptInitialValue,
    promptSecureTextEntry,
    promptSecondaryPlaceholder,
    promptSecondaryInitialValue,
    promptSecondarySecureTextEntry,
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

type SelectionConfirmDialogOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  options: string[];
  optionsLabel?: string;
  initialSelections?: string[];
  selectionMode?: 'single' | 'multi';
  destructive?: boolean;
  onConfirmSelection: (selectedOptions: string[]) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
};

export const showSelectionConfirmDialog = ({
  title,
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  options,
  optionsLabel,
  initialSelections,
  selectionMode = 'single',
  destructive = false,
  onConfirmSelection,
  onCancel,
}: SelectionConfirmDialogOptions) => {
  showConfirmDialog({
    title,
    message,
    confirmText,
    cancelText,
    destructive,
    onConfirm: () => {},
    onConfirmSelection,
    onCancel,
    promptOptions: options,
    promptOptionsLabel: optionsLabel,
    promptInitialSelections: initialSelections,
    promptSelectionMode: selectionMode,
  });
};

type DualInputConfirmDialogOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  primaryPlaceholder?: string;
  primaryInitialValue?: string;
  primarySecureTextEntry?: boolean;
  secondaryPlaceholder?: string;
  secondaryInitialValue?: string;
  secondarySecureTextEntry?: boolean;
  onConfirmDualInput: (
    primaryInputValue: string,
    secondaryInputValue: string,
    selectedOptions?: string[],
  ) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
};

export const showDualInputConfirmDialog = ({
  title,
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  primaryPlaceholder,
  primaryInitialValue,
  primarySecureTextEntry,
  secondaryPlaceholder,
  secondaryInitialValue,
  secondarySecureTextEntry,
  onConfirmDualInput,
  onCancel,
}: DualInputConfirmDialogOptions) => {
  showConfirmDialog({
    title,
    message,
    confirmText,
    cancelText,
    destructive: false,
    onConfirm: () => {},
    onConfirmDualInput,
    onCancel,
    promptPlaceholder: primaryPlaceholder,
    promptInitialValue: primaryInitialValue,
    promptSecureTextEntry: primarySecureTextEntry,
    promptSecondaryPlaceholder: secondaryPlaceholder,
    promptSecondaryInitialValue: secondaryInitialValue,
    promptSecondarySecureTextEntry: secondarySecureTextEntry,
  });
};
