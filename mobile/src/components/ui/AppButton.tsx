import React from 'react';
import {
  ActivityIndicator,
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

type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'outline'
  | 'outlineAccent'
  | 'outlineDanger'
  | 'outlineSuccess';
type AppButtonSize = 'sm' | 'md' | 'lg';

type AppButtonProps = {
  title: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
} & Omit<TouchableOpacityProps, 'style'>;

const SPINNER_COLOR_BY_VARIANT = {
  primary: 'textOnAccent',
  secondary: 'accent',
  danger: 'textOnAccent',
  ghost: 'accent',
  outline: 'textStrong',
  outlineAccent: 'accent',
  outlineDanger: 'danger',
  outlineSuccess: 'success',
} as const;

export default function AppButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...touchableProps
}: AppButtonProps) {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      {...touchableProps}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[`${size}Button`],
        styles[`${variant}Button`],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={themeColors[SPINNER_COLOR_BY_VARIANT[variant]]} />
      ) : (
        <Text style={[styles.baseText, styles[`${size}Text`], styles[`${variant}Text`], textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    base: {
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    disabled: {
      opacity: 0.55,
    },
    smButton: {
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    mdButton: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    lgButton: {
      minHeight: 52,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    primaryButton: {
      backgroundColor: themeColors.accent,
      borderColor: themeColors.accent,
    },
    secondaryButton: {
      backgroundColor: themeColors.accentSoft,
      borderColor: themeColors.border,
    },
    dangerButton: {
      backgroundColor: themeColors.danger,
      borderColor: themeColors.danger,
    },
    ghostButton: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    outlineButton: {
      backgroundColor: 'transparent',
      borderColor: themeColors.border,
    },
    outlineAccentButton: {
      backgroundColor: 'transparent',
      borderColor: themeColors.accent,
    },
    outlineDangerButton: {
      backgroundColor: 'transparent',
      borderColor: themeColors.danger,
    },
    outlineSuccessButton: {
      backgroundColor: 'transparent',
      borderColor: themeColors.success,
    },
    baseText: {
      fontWeight: '700',
    },
    smText: {
      fontSize: 12,
    },
    mdText: {
      fontSize: 14,
    },
    lgText: {
      fontSize: 16,
    },
    primaryText: {
      color: themeColors.textOnAccent,
    },
    secondaryText: {
      color: themeColors.textStrong,
    },
    dangerText: {
      color: themeColors.textOnAccent,
    },
    ghostText: {
      color: themeColors.accent,
    },
    outlineText: {
      color: themeColors.textStrong,
    },
    outlineAccentText: {
      color: themeColors.accent,
    },
    outlineDangerText: {
      color: themeColors.danger,
    },
    outlineSuccessText: {
      color: themeColors.success,
    },
  });
