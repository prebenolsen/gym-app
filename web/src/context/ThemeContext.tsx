import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'emerald' | 'auburn';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  completionCueEnabled: boolean;
  setCompletionCueEnabled: (enabled: boolean) => void;
  countdownCueEnabled: boolean;
  setCountdownCueEnabled: (enabled: boolean) => void;
  customCueEnabled: boolean;
  setCustomCueEnabled: (enabled: boolean) => void;
  customCueSeconds: number;
  setCustomCueSeconds: (seconds: number) => void;
  showFileDisplay: boolean;
  setShowFileDisplay: (enabled: boolean) => void;
};

const STORAGE_KEY = 'gym-app.theme';
const ACCENT_KEY = 'gym-app.accent';
const COMPLETION_CUE_ENABLED_KEY = 'gym-app.sound-completion-enabled';
const COUNTDOWN_CUE_ENABLED_KEY = 'gym-app.sound-countdown-enabled';
const CUSTOM_CUE_ENABLED_KEY = 'gym-app.sound-custom-enabled';
const CUSTOM_CUE_SECONDS_KEY = 'gym-app.sound-custom-seconds';
const SHOW_FILE_DISPLAY_KEY = 'gym-app.show-file-display';

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

  const [completionCueEnabled, setCompletionCueEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(COMPLETION_CUE_ENABLED_KEY);
    return saved === 'true';
  });

  const [countdownCueEnabled, setCountdownCueEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(COUNTDOWN_CUE_ENABLED_KEY);
    return saved === 'true';
  });

  const [customCueEnabled, setCustomCueEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(CUSTOM_CUE_ENABLED_KEY);
    return saved === 'true';
  });

  const [customCueSeconds, setCustomCueSecondsState] = useState<number>(() => {
    const saved = Number(localStorage.getItem(CUSTOM_CUE_SECONDS_KEY));
    if (Number.isInteger(saved) && saved >= 1) {
      return saved;
    }
    return 10;
  });

  const [showFileDisplay, setShowFileDisplayState] = useState<boolean>(() => {
    const saved = localStorage.getItem(SHOW_FILE_DISPLAY_KEY);
    return saved !== 'false';
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
    localStorage.setItem(COMPLETION_CUE_ENABLED_KEY, String(completionCueEnabled));
  }, [completionCueEnabled]);

  useEffect(() => {
    localStorage.setItem(COUNTDOWN_CUE_ENABLED_KEY, String(countdownCueEnabled));
  }, [countdownCueEnabled]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_CUE_ENABLED_KEY, String(customCueEnabled));
  }, [customCueEnabled]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_CUE_SECONDS_KEY, String(customCueSeconds));
  }, [customCueSeconds]);

  useEffect(() => {
    localStorage.setItem(SHOW_FILE_DISPLAY_KEY, String(showFileDisplay));
  }, [showFileDisplay]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () =>
        setThemeState((previous) => (previous === 'dark' ? 'light' : 'dark')),
      accent,
      setAccent: setAccentState,
      completionCueEnabled,
      setCompletionCueEnabled: setCompletionCueEnabledState,
      countdownCueEnabled,
      setCountdownCueEnabled: setCountdownCueEnabledState,
      customCueEnabled,
      setCustomCueEnabled: setCustomCueEnabledState,
      customCueSeconds,
      setCustomCueSeconds: setCustomCueSecondsState,
      showFileDisplay,
      setShowFileDisplay: setShowFileDisplayState,
    }),
    [
      theme,
      accent,
      completionCueEnabled,
      countdownCueEnabled,
      customCueEnabled,
      customCueSeconds,
      showFileDisplay,
    ],
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
