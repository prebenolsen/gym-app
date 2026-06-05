import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type TextStyle,
  type TouchableOpacityProps,
  type ViewStyle,
} from 'react-native';
import { colors, radius } from '../../theme';
import { usePreferences } from '../../context/PreferencesContext';

type ChipTone = 'accent' | 'danger';

type ChipButtonProps = {
  label: string;
  selected: boolean;
  tone?: ChipTone;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
} & Omit<TouchableOpacityProps, 'style'>;

export default function ChipButton({
  label,
  selected,
  tone = 'accent',
  compact = false,
  style,
  textStyle,
  ...touchableProps
}: ChipButtonProps) {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      {...touchableProps}
      style={[
        styles.base,
        compact ? styles.compact : styles.regular,
        selected ? styles[`${tone}Selected`] : styles.unselected,
        style,
      ]}
    >
      <Text
        style={[
          styles.baseText,
          compact ? styles.compactText : styles.regularText,
          selected ? styles[`${tone}SelectedText`] : styles.unselectedText,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    base: {
      borderWidth: 1,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
    },
    regular: {
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    compact: {
      paddingHorizontal: 11,
      paddingVertical: 6,
    },
    unselected: {
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
    },
    accentSelected: {
      backgroundColor: themeColors.accentSoft,
      borderColor: themeColors.accent,
    },
    dangerSelected: {
      backgroundColor: themeColors.dangerSoft,
      borderColor: themeColors.danger,
    },
    baseText: {
      fontWeight: '700',
    },
    regularText: {
      fontSize: 13,
    },
    compactText: {
      fontSize: 12,
    },
    unselectedText: {
      color: themeColors.textMuted,
    },
    accentSelectedText: {
      color: themeColors.accent,
    },
    dangerSelectedText: {
      color: themeColors.danger,
    },
  });
