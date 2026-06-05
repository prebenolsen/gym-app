import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius } from '../../theme';
import { usePreferences } from '../../context/PreferencesContext';
import ChipButton from './ChipButton';

type ConfirmDialogState = {
  id: number;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
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

type ConfirmDialogContextValue = {
  showConfirm: (payload: Omit<ConfirmDialogState, 'id'>) => void;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptSelections, setPromptSelections] = useState<string[]>([]);
  const [isPromptSelectionManual, setIsPromptSelectionManual] = useState(false);
  const idRef = React.useRef(0);

  const showConfirm = useCallback(
    (payload: Omit<ConfirmDialogState, 'id'>) => {
      setDialog({
        id: ++idRef.current,
        ...payload,
      });
    },
    [],
  );

  React.useEffect(() => {
    if (!dialog) {
      setPromptValue('');
      setPromptSelections([]);
      setIsPromptSelectionManual(false);
      return;
    }

    const initialValue = dialog.promptInitialValue ?? '';
    setPromptValue(initialValue);

    if (dialog.promptAutoSuggestSelections) {
      setPromptSelections(dialog.promptAutoSuggestSelections(initialValue));
      setIsPromptSelectionManual(false);
    } else {
      setPromptSelections(dialog.promptInitialSelections ?? []);
      setIsPromptSelectionManual(true);
    }
  }, [dialog]);

  const handlePromptInputChange = useCallback((value: string) => {
    setPromptValue(value);

    if (!dialog?.promptAutoSuggestSelections || isPromptSelectionManual) {
      return;
    }

    setPromptSelections(dialog.promptAutoSuggestSelections(value));
  }, [dialog, isPromptSelectionManual]);

  const handleSelectOption = useCallback((option: string) => {
    setIsPromptSelectionManual(true);
    setPromptSelections((current) => {
      if (dialog?.promptSelectionMode === 'single') {
        return current.includes(option) ? [] : [option];
      }

      if (current.includes(option)) {
        return current.filter((entry) => entry !== option);
      }

      return [...current, option];
    });
  }, [dialog?.promptSelectionMode]);

  const handleConfirm = useCallback(async () => {
    if (!dialog) return;
    try {
      if (dialog.onConfirmInput) {
        await dialog.onConfirmInput(promptValue.trim(), promptSelections);
      } else {
        await dialog.onConfirm();
      }
    } finally {
      setDialog(null);
    }
  }, [dialog, promptSelections, promptValue]);

  const handleCancel = useCallback((runCancelAction = false) => {
    if (!dialog) return;

    const onCancel = dialog.onCancel;
    setDialog(null);

    if (runCancelAction && onCancel) {
      void onCancel();
    }
  }, [dialog]);

  const contextValue = useMemo(() => ({ showConfirm }), [showConfirm]);

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      {dialog && (
        <Modal
          visible={!!dialog}
          transparent
          animationType="fade"
          onRequestClose={() => handleCancel(false)}
        >
          <View style={styles.backdrop}>
            <Pressable style={styles.backdropHitArea} onPress={() => handleCancel(false)} />
            <View style={styles.dialog}>
              <Text style={styles.title}>{dialog.title}</Text>
              <Text style={styles.message}>{dialog.message}</Text>
              {dialog.onConfirmInput ? (
                <TextInput
                  style={styles.promptInput}
                  value={promptValue}
                  onChangeText={handlePromptInputChange}
                  placeholder={dialog.promptPlaceholder ?? ''}
                  placeholderTextColor={themeColors.textMuted}
                  autoFocus
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              ) : null}
              {dialog.onConfirmInput && dialog.promptOptions?.length ? (
                <View style={styles.promptOptionsContainer}>
                  {dialog.promptOptionsLabel ? (
                    <Text style={styles.promptOptionsLabel}>{dialog.promptOptionsLabel}</Text>
                  ) : null}
                  <View style={styles.promptOptionsWrap}>
                    <ChipButton
                      label="None"
                      compact
                      selected={promptSelections.length === 0}
                      onPress={() => {
                        setIsPromptSelectionManual(true);
                        setPromptSelections([]);
                      }}
                    />
                    {dialog.promptOptions.map((option) => (
                      <ChipButton
                        key={`confirm-option-${option}`}
                        label={option}
                        compact
                        selected={promptSelections.includes(option)}
                        onPress={() => handleSelectOption(option)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => handleCancel(true)}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>
                    {dialog.cancelText}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.button,
                    dialog.destructive ? styles.destructiveButton : styles.confirmButton,
                    dialog.onConfirmInput && !promptValue.trim()
                      ? styles.confirmButtonDisabled
                      : null,
                  ]}
                  disabled={dialog.onConfirmInput && !promptValue.trim()}
                  onPress={handleConfirm}
                >
                  <Text style={[styles.buttonText, styles.confirmButtonText]}>
                    {dialog.confirmText}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return context;
}

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: themeColors.overlayScrim,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    backdropHitArea: {
      ...StyleSheet.absoluteFillObject,
    },
    dialog: {
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    title: {
      color: themeColors.textStrong,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
    },
    message: {
      color: themeColors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 4,
    },
    promptInput: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.background,
      color: themeColors.textStrong,
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    promptOptionsContainer: {
      gap: 8,
    },
    promptOptionsLabel: {
      color: themeColors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    promptOptionsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    button: {
      flex: 1,
      borderRadius: radius.sm,
      minHeight: 42,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    cancelButton: {
      backgroundColor: themeColors.background,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    cancelButtonText: {
      color: themeColors.textStrong,
    },
    confirmButton: {
      backgroundColor: themeColors.accent,
      borderWidth: 1,
      borderColor: themeColors.accent,
    },
    confirmButtonDisabled: {
      opacity: 0.55,
    },
    destructiveButton: {
      backgroundColor: themeColors.danger,
      borderWidth: 1,
      borderColor: themeColors.danger,
    },
    confirmButtonText: {
      color: themeColors.textOnAccent,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
