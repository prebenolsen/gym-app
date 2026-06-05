import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, shadow } from '../../theme';
import { usePreferences } from '../../context/PreferencesContext';

type ErrorDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  dismissLabel?: string;
  onDismiss: () => void;
};

export default function ErrorDialog({
  visible,
  title,
  message,
  dismissLabel = 'OK',
  onDismiss,
}: ErrorDialogProps) {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropHitArea} onPress={onDismiss} />
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>{dismissLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
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
      ...shadow.card,
    },
    title: {
      color: themeColors.textStrong,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
    },
    message: {
      color: themeColors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 14,
    },
    button: {
      backgroundColor: themeColors.accent,
      borderColor: themeColors.accent,
      borderWidth: 1,
      borderRadius: radius.sm,
      minHeight: 42,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    buttonText: {
      color: themeColors.textOnAccent,
      fontSize: 14,
      fontWeight: '700',
    },
  });
