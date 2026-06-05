import React, { type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../../theme';
import { usePreferences } from '../../context/PreferencesContext';

type ModalSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: string | number;
};

export default function ModalSheet({
  visible,
  title,
  onClose,
  children,
  maxHeight = '90%',
}: ModalSheetProps) {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={themeColors.textMuted} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: themeColors.overlayScrim,
      justifyContent: 'flex-end',
    },
    backdropPressable: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      backgroundColor: themeColors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      ...shadow.card,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: themeColors.textStrong,
    },
  });
