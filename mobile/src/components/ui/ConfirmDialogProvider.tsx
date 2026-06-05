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
  View,
} from 'react-native';
import { colors, radius } from '../../theme';
import { usePreferences } from '../../context/PreferencesContext';

type ConfirmDialogState = {
  id: number;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
  onConfirm: () => void | Promise<void>;
};

type ConfirmDialogContextValue = {
  showConfirm: (payload: Omit<ConfirmDialogState, 'id'>) => void;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);
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

  const handleConfirm = useCallback(async () => {
    if (!dialog) return;
    try {
      await dialog.onConfirm();
    } finally {
      setDialog(null);
    }
  }, [dialog]);

  const handleCancel = useCallback(() => {
    setDialog(null);
  }, []);

  const contextValue = useMemo(() => ({ showConfirm }), [showConfirm]);

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      {dialog && (
        <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={handleCancel}>
          <View style={styles.backdrop}>
            <Pressable style={styles.backdropHitArea} onPress={handleCancel} />
            <View style={styles.dialog}>
              <Text style={styles.title}>{dialog.title}</Text>
              <Text style={styles.message}>{dialog.message}</Text>
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>
                    {dialog.cancelText}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.button,
                    dialog.destructive ? styles.destructiveButton : styles.confirmButton,
                  ]}
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
