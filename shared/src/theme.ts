export const themeTokens = {
  color: {
    background: '#09090b',
    surface: '#18181b',
    surfaceSoft: '#27272a',
    accent: '#10b981',
    accentPressed: '#059669',
    textStrong: '#ffffff',
    textMuted: '#a1a1aa',
    border: '#3f3f46',
    success: '#22c55e',
    successSoft: '#052e16',
    danger: '#ef4444',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  typography: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
    display: 36,
  },
} as const;

export const webCssVars = {
  '--background': '240 10% 4%',
  '--foreground': '0 0% 98%',
  '--card': '240 10% 10%',
  '--card-foreground': '0 0% 98%',
  '--popover': '240 10% 10%',
  '--popover-foreground': '0 0% 98%',
  '--primary': '160 84% 39%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '240 6% 14%',
  '--secondary-foreground': '0 0% 98%',
  '--muted': '240 4% 16%',
  '--muted-foreground': '240 5% 65%',
  '--accent': '240 4% 16%',
  '--accent-foreground': '0 0% 98%',
  '--destructive': '0 72% 51%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '240 5% 26%',
  '--input': '240 5% 26%',
  '--ring': '160 84% 39%',
  '--radius': '0.75rem',
} as const;

export type MobileTheme = {
  colors: typeof themeTokens.color;
  spacing: typeof themeTokens.spacing;
  typography: typeof themeTokens.typography;
};

export const mobileTheme: MobileTheme = {
  colors: themeTokens.color,
  spacing: themeTokens.spacing,
  typography: themeTokens.typography,
};
