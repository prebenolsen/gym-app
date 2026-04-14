import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'emerald' | 'auburn';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  prepareSoundEnabled: boolean;
  setPrepareSoundEnabled: (enabled: boolean) => void;
  prepareSoundSeconds: number;
  setPrepareSoundSeconds: (seconds: number) => void;
};

const STORAGE_KEY = 'gym-app.theme';
const ACCENT_KEY = 'gym-app.accent';
const SOUND_ENABLED_KEY = 'gym-app.sound-enabled';
const PREPARE_SOUND_ENABLED_KEY = 'gym-app.prepare-sound-enabled';
const PREPARE_SOUND_SECONDS_KEY = 'gym-app.prepare-sound-seconds';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return 'dark';
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    const saved = localStorage.getItem(ACCENT_KEY);
    if (saved === 'emerald' || saved === 'auburn') return saved;
    return 'emerald';
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY);
    return saved === 'true';
  });

  const [prepareSoundEnabled, setPrepareSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(PREPARE_SOUND_ENABLED_KEY);
    return saved === 'true';
  });

  const [prepareSoundSeconds, setPrepareSoundSecondsState] = useState<number>(() => {
    const saved = Number(localStorage.getItem(PREPARE_SOUND_SECONDS_KEY));
    if (Number.isInteger(saved) && saved >= 1) {
      return saved;
    }
    return 10;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(ACCENT_KEY, accent);
    document.documentElement.setAttribute('data-accent', accent);
    document.body.setAttribute('data-accent', accent);
  }, [accent]);

  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem(PREPARE_SOUND_ENABLED_KEY, String(prepareSoundEnabled));
  }, [prepareSoundEnabled]);

  useEffect(() => {
    localStorage.setItem(PREPARE_SOUND_SECONDS_KEY, String(prepareSoundSeconds));
  }, [prepareSoundSeconds]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((previous) => (previous === 'dark' ? 'light' : 'dark')),
      accent,
      setAccent: setAccentState,
      soundEnabled,
      setSoundEnabled: setSoundEnabledState,
      prepareSoundEnabled,
      setPrepareSoundEnabled: setPrepareSoundEnabledState,
      prepareSoundSeconds,
      setPrepareSoundSeconds: setPrepareSoundSecondsState,
    }),
    [theme, accent, soundEnabled, prepareSoundEnabled, prepareSoundSeconds]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
};
