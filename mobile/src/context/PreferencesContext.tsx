import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AccentColor, getThemeColors, type ThemeMode } from '../theme';

export type WeightUnit = 'kg' | 'lb';

type PreferencesContextValue = {
  ready: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
  colors: ReturnType<typeof getThemeColors>;
  convertFromKg: (kg: number) => number;
  convertToKg: (value: number) => number;
  formatWeight: (kg: number, digits?: number) => string;
  completionCueEnabled: boolean;
  setCompletionCueEnabled: (enabled: boolean) => void;
  countdownCueEnabled: boolean;
  setCountdownCueEnabled: (enabled: boolean) => void;
  customCueEnabled: boolean;
  setCustomCueEnabled: (enabled: boolean) => void;
  customCueSeconds: number;
  setCustomCueSeconds: (seconds: number) => void;
};

const THEME_KEY = 'gym-app.mobile.theme';
const ACCENT_KEY = 'gym-app.mobile.accent';
const UNIT_KEY = 'gym-app.mobile.weight-unit';
const COMPLETION_CUE_ENABLED_KEY = 'gym-app.mobile.sound-completion-enabled';
const COUNTDOWN_CUE_ENABLED_KEY = 'gym-app.mobile.sound-countdown-enabled';
const CUSTOM_CUE_ENABLED_KEY = 'gym-app.mobile.sound-custom-enabled';
const CUSTOM_CUE_SECONDS_KEY = 'gym-app.mobile.sound-custom-seconds';

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [accent, setAccentState] = useState<AccentColor>('auburn');
  const [unit, setUnitState] = useState<WeightUnit>('kg');
  const [completionCueEnabled, setCompletionCueEnabledState] = useState(false);
  const [countdownCueEnabled, setCountdownCueEnabledState] = useState(false);
  const [customCueEnabled, setCustomCueEnabledState] = useState(false);
  const [customCueSeconds, setCustomCueSecondsState] = useState(10);

  useEffect(() => {
    const load = async () => {
      try {
        const [
          savedTheme,
          savedAccent,
          savedUnit,
          savedCompletionCueEnabled,
          savedCountdownCueEnabled,
          savedCustomCueEnabled,
          savedCustomCueSeconds,
        ] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(ACCENT_KEY),
          AsyncStorage.getItem(UNIT_KEY),
          AsyncStorage.getItem(COMPLETION_CUE_ENABLED_KEY),
          AsyncStorage.getItem(COUNTDOWN_CUE_ENABLED_KEY),
          AsyncStorage.getItem(CUSTOM_CUE_ENABLED_KEY),
          AsyncStorage.getItem(CUSTOM_CUE_SECONDS_KEY),
        ]);

        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
        }
        if (savedAccent === 'auburn' || savedAccent === 'emerald') {
          setAccentState(savedAccent);
        }
        if (savedUnit === 'kg' || savedUnit === 'lb') {
          setUnitState(savedUnit);
        }
        if (
          savedCompletionCueEnabled === 'true' ||
          savedCompletionCueEnabled === 'false'
        ) {
          setCompletionCueEnabledState(savedCompletionCueEnabled === 'true');
        }
        if (
          savedCountdownCueEnabled === 'true' ||
          savedCountdownCueEnabled === 'false'
        ) {
          setCountdownCueEnabledState(savedCountdownCueEnabled === 'true');
        }
        if (savedCustomCueEnabled === 'true' || savedCustomCueEnabled === 'false') {
          setCustomCueEnabledState(savedCustomCueEnabled === 'true');
        }

        const parsedCustomCueSeconds = Number(savedCustomCueSeconds);
        if (
          Number.isFinite(parsedCustomCueSeconds) &&
          Number.isInteger(parsedCustomCueSeconds) &&
          parsedCustomCueSeconds >= 1
        ) {
          setCustomCueSecondsState(parsedCustomCueSeconds);
        }
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(THEME_KEY, theme).catch((err) => {
      console.error('Failed to persist theme setting:', err);
    });
  }, [theme, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(ACCENT_KEY, accent).catch((err) => {
      console.error('Failed to persist accent setting:', err);
    });
  }, [accent, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(UNIT_KEY, unit).catch((err) => {
      console.error('Failed to persist weight unit setting:', err);
    });
  }, [unit, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(COMPLETION_CUE_ENABLED_KEY, String(completionCueEnabled)).catch(
      (err) => {
        console.error('Failed to persist completion cue setting:', err);
      },
    );
  }, [completionCueEnabled, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(COUNTDOWN_CUE_ENABLED_KEY, String(countdownCueEnabled)).catch(
      (err) => {
        console.error('Failed to persist countdown cue setting:', err);
      },
    );
  }, [countdownCueEnabled, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(CUSTOM_CUE_ENABLED_KEY, String(customCueEnabled)).catch(
      (err) => {
        console.error('Failed to persist custom cue setting:', err);
      },
    );
  }, [customCueEnabled, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(CUSTOM_CUE_SECONDS_KEY, String(customCueSeconds)).catch(
      (err) => {
        console.error('Failed to persist custom cue seconds setting:', err);
      },
    );
  }, [customCueSeconds, ready]);

  const value = useMemo<PreferencesContextValue>(() => {
    const convertFromKg = (kg: number) => (unit === 'lb' ? kg * 2.2 : kg);
    const convertToKg = (input: number) => (unit === 'lb' ? input / 2.2 : input);
    const formatWeight = (kg: number, digits = 1) =>
      `${convertFromKg(kg).toFixed(digits)} ${unit}`;

    return {
      ready,
      theme,
      setTheme: setThemeState,
      toggleTheme: () =>
        setThemeState((previous) => (previous === 'dark' ? 'light' : 'dark')),
      accent,
      setAccent: setAccentState,
      unit,
      setUnit: setUnitState,
      colors: getThemeColors(theme, accent),
      convertFromKg,
      convertToKg,
      formatWeight,
      completionCueEnabled,
      setCompletionCueEnabled: setCompletionCueEnabledState,
      countdownCueEnabled,
      setCountdownCueEnabled: setCountdownCueEnabledState,
      customCueEnabled,
      setCustomCueEnabled: setCustomCueEnabledState,
      customCueSeconds,
      setCustomCueSeconds: setCustomCueSecondsState,
    };
  }, [
    ready,
    theme,
    accent,
    unit,
    completionCueEnabled,
    countdownCueEnabled,
    customCueEnabled,
    customCueSeconds,
  ]);

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return context;
};
