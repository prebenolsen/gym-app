export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'auburn' | 'emerald';

const lightBase = {
  background: '#F5F3F1',
  surface: '#FFFFFF',
  border: '#DDD6D1',
  textStrong: '#1F1A17',
  textMuted: '#6C625B',
  success: '#2E8B57',
  successSoft: '#E9F7EF',
  danger: '#C0392B',
  dangerPressed: '#A93226',
};

const darkBase = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  border: '#353535',
  textStrong: '#FFFFFF',
  textMuted: '#C9C9C9',
  success: '#4CAF73',
  successSoft: '#18251D',
  danger: '#E45D4F',
  dangerPressed: '#C84D41',
};

const accentPalette = {
  auburn: {
    accent: '#C65A1E',
    accentPressed: '#A94A16',
    accentSoft: '#FBE7DA',
    accentSoftDark: '#35261E',
  },
  emerald: {
    accent: '#10B981',
    accentPressed: '#0E9F70',
    accentSoft: '#DCFCE7',
    accentSoftDark: '#133227',
  },
};

export const getThemeColors = (theme: ThemeMode, accent: AccentColor) => {
  const base = theme === 'dark' ? darkBase : lightBase;
  const accentColors = accentPalette[accent];

  return {
    ...base,
    accent: accentColors.accent,
    accentPressed: accentColors.accentPressed,
    accentSoft: theme === 'dark' ? accentColors.accentSoftDark : accentColors.accentSoft,
  };
};

// Backward-compatible default palette.
export const colors = getThemeColors('light', 'auburn');

export const radius = {
  sm: 10,
  md: 12,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#1F1A17',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
};
