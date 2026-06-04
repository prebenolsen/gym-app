import type { TextStyle, ViewStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'auburn' | 'emerald';

const brandPalettes = {
  auburn: {
    primary50: '#FDF3EE',
    primary100: '#FAE5D8',
    primary300: '#E8936A',
    primary500: '#C65A1E',
    primary700: '#9C4115',
    neutral50: '#FAF8F6',
    neutral100: '#F3F0ED',
    neutral200: '#E5E0DB',
    neutral400: '#B8B2AB',
    neutralSteel: '#6B7280',
    neutralIron: '#3D3D3D',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    prGold: '#F59E0B',
    prGoldLight: '#FEF3C7',
  },
  emerald: {
    primary50: '#ECFDF5',
    primary100: '#D1FAE5',
    primary300: '#6EE7B7',
    primary500: '#10B981',
    primary700: '#059669',
    neutral50: '#F7FAF9',
    neutral100: '#F0F4F2',
    neutral200: '#D9E2DE',
    neutral400: '#9DB3AB',
    neutralSteel: '#6B7280',
    neutralIron: '#1F2937',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    prGold: '#F59E0B',
    prGoldLight: '#FEF3C7',
  },
} as const;

type BrandPalette = (typeof brandPalettes)[AccentColor];

const clamp = (value: number) => Math.max(0, Math.min(255, value));

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => char + char)
        .join('')
    : normalized;

  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16),
  };
};

const rgbToHex = ({ red, green, blue }: { red: number; green: number; blue: number }) =>
  `#${[red, green, blue]
    .map((channel) => clamp(channel).toString(16).padStart(2, '0'))
    .join('')}`;

const mixHex = (foreground: string, background: string, weight: number) => {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  return rgbToHex({
    red: Math.round(fg.red * weight + bg.red * (1 - weight)),
    green: Math.round(fg.green * weight + bg.green * (1 - weight)),
    blue: Math.round(fg.blue * weight + bg.blue * (1 - weight)),
  });
};

const withAlpha = (hex: string, alpha: number) => {
  const { red, green, blue } = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const createLightTheme = (palette: BrandPalette) => ({
  primary50: palette.primary50,
  primary100: palette.primary100,
  primary300: palette.primary300,
  primary500: palette.primary500,
  primary700: palette.primary700,
  neutral50: palette.neutral50,
  neutral100: palette.neutral100,
  neutral200: palette.neutral200,
  neutral400: palette.neutral400,
  neutralSteel: palette.neutralSteel,
  neutralIron: palette.neutralIron,
  background: palette.neutral100,
  surface: palette.neutral50,
  border: palette.neutral200,
  textStrong: palette.neutralIron,
  textMuted: palette.neutralSteel,
  accent: palette.primary500,
  accentPressed: palette.primary700,
  accentSoft: palette.primary100,
  success: palette.success,
  successSoft: mixHex(palette.success, palette.neutral50, 0.14),
  warning: palette.warning,
  warningSoft: mixHex(palette.warning, palette.neutral50, 0.16),
  danger: palette.danger,
  dangerPressed: mixHex(palette.danger, '#000000', 0.84),
  dangerSoft: mixHex(palette.danger, palette.neutral50, 0.13),
  prGold: palette.prGold,
  prGoldLight: palette.prGoldLight,
  textOnAccent: '#FFFFFF',
  switchThumb: '#FFFFFF',
  overlayScrim: withAlpha(palette.neutralIron, 0.42),
  thumbFrameBorder: palette.neutral200,
  thumbFrameBackground: palette.neutral50,
});

const createDarkTheme = (palette: BrandPalette) => {
  const background = mixHex(palette.neutralIron, '#000000', 0.44);
  const surface = mixHex(palette.neutralIron, '#000000', 0.58);

  return {
    primary50: palette.primary50,
    primary100: palette.primary100,
    primary300: palette.primary300,
    primary500: palette.primary500,
    primary700: palette.primary700,
    neutral50: palette.neutral50,
    neutral100: palette.neutral100,
    neutral200: palette.neutral200,
    neutral400: palette.neutral400,
    neutralSteel: palette.neutralSteel,
    neutralIron: palette.neutralIron,
    background,
    surface,
    border: mixHex(palette.neutral400, background, 0.52),
    textStrong: '#FFFFFF',
    textMuted: palette.neutral200,
    accent: palette.primary500,
    accentPressed: palette.primary700,
    accentSoft: mixHex(palette.primary700, background, 0.4),
    success: palette.success,
    successSoft: mixHex(palette.success, background, 0.24),
    warning: palette.warning,
    warningSoft: mixHex(palette.warning, background, 0.22),
    danger: palette.danger,
    dangerPressed: mixHex(palette.danger, '#000000', 0.72),
    dangerSoft: mixHex(palette.danger, background, 0.2),
    prGold: palette.prGold,
    prGoldLight: mixHex(palette.prGoldLight, background, 0.3),
    textOnAccent: '#FFFFFF',
    switchThumb: palette.neutral50,
    overlayScrim: withAlpha('#000000', 0.54),
    thumbFrameBorder: mixHex(palette.neutral400, background, 0.7),
    thumbFrameBackground: surface,
  };
};

export const getThemeColors = (theme: ThemeMode, accent: AccentColor) => {
  const palette = brandPalettes[accent];
  return theme === 'dark' ? createDarkTheme(palette) : createLightTheme(palette);
};

// Backward-compatible default palette.
export const colors = getThemeColors('light', 'auburn');

export const radius = {
  sm: 10,
  md: 12,
  pill: 999,
};

type AppButtonStyles = {
  mainButton: ViewStyle;
  mainButtonText: TextStyle;
  deleteButton: ViewStyle;
  deleteButtonText: TextStyle;
};

export const buttonTokens = {
  height: 44,
  horizontalPadding: 16,
  borderRadius: radius.sm,
  fontSize: 14,
  fontWeight: '700' as const,
};

export const getButtonStyles = (themeColors: typeof colors): AppButtonStyles => ({
  mainButton: {
    backgroundColor: themeColors.accent,
    borderRadius: buttonTokens.borderRadius,
    height: buttonTokens.height,
    paddingHorizontal: buttonTokens.horizontalPadding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonText: {
    color: themeColors.textOnAccent,
    fontSize: buttonTokens.fontSize,
    fontWeight: buttonTokens.fontWeight,
  },
  deleteButton: {
    backgroundColor: themeColors.danger,
    borderRadius: buttonTokens.borderRadius,
    height: buttonTokens.height,
    paddingHorizontal: buttonTokens.horizontalPadding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: buttonTokens.fontSize,
    fontWeight: buttonTokens.fontWeight,
  },
});

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
};
