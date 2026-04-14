import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  prepareSoundEnabled: boolean;
  setPrepareSoundEnabled: (enabled: boolean) => void;
  prepareSoundSeconds: number;
  setPrepareSoundSeconds: (seconds: number) => void;
};

const THEME_KEY = 'gym-app.mobile.theme';
const ACCENT_KEY = 'gym-app.mobile.accent';
const UNIT_KEY = 'gym-app.mobile.weight-unit';
const SOUND_ENABLED_KEY = 'gym-app.mobile.sound-enabled';
const PREPARE_SOUND_ENABLED_KEY = 'gym-app.mobile.prepare-sound-enabled';
const PREPARE_SOUND_SECONDS_KEY = 'gym-app.mobile.prepare-sound-seconds';

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [accent, setAccentState] = useState<AccentColor>('auburn');
  const [unit, setUnitState] = useState<WeightUnit>('kg');
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [prepareSoundEnabled, setPrepareSoundEnabledState] = useState(false);
  const [prepareSoundSeconds, setPrepareSoundSecondsState] = useState(10);

  useEffect(() => {
    const load = async () => {
      try {
        const [
          savedTheme,
          savedAccent,
          savedUnit,
          savedSoundEnabled,
          savedPrepareSoundEnabled,
          savedPrepareSoundSeconds,
        ] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(ACCENT_KEY),
          AsyncStorage.getItem(UNIT_KEY),
          AsyncStorage.getItem(SOUND_ENABLED_KEY),
          AsyncStorage.getItem(PREPARE_SOUND_ENABLED_KEY),
          AsyncStorage.getItem(PREPARE_SOUND_SECONDS_KEY),
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
        if (savedSoundEnabled === 'true' || savedSoundEnabled === 'false') {
          setSoundEnabledState(savedSoundEnabled === 'true');
        }
        if (savedPrepareSoundEnabled === 'true' || savedPrepareSoundEnabled === 'false') {
          setPrepareSoundEnabledState(savedPrepareSoundEnabled === 'true');
        }

        const parsedPrepareSeconds = Number(savedPrepareSoundSeconds);
        if (
          Number.isFinite(parsedPrepareSeconds) &&
          Number.isInteger(parsedPrepareSeconds) &&
          parsedPrepareSeconds >= 1
        ) {
          setPrepareSoundSecondsState(parsedPrepareSeconds);
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
    AsyncStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled)).catch((err) => {
      console.error('Failed to persist sound enabled setting:', err);
    });
  }, [soundEnabled, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(PREPARE_SOUND_ENABLED_KEY, String(prepareSoundEnabled)).catch((err) => {
      console.error('Failed to persist prepare sound enabled setting:', err);
    });
  }, [prepareSoundEnabled, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(PREPARE_SOUND_SECONDS_KEY, String(prepareSoundSeconds)).catch((err) => {
      console.error('Failed to persist prepare sound seconds setting:', err);
    });
  }, [prepareSoundSeconds, ready]);

  const value = useMemo<PreferencesContextValue>(() => {
    const convertFromKg = (kg: number) => (unit === 'lb' ? kg * 2.2 : kg);
    const convertToKg = (input: number) => (unit === 'lb' ? input / 2.2 : input);
    const formatWeight = (kg: number, digits = 1) => `${convertFromKg(kg).toFixed(digits)} ${unit}`;

    return {
      ready,
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((previous) => (previous === 'dark' ? 'light' : 'dark')),
      accent,
      setAccent: setAccentState,
      unit,
      setUnit: setUnitState,
      colors: getThemeColors(theme, accent),
      convertFromKg,
      convertToKg,
      formatWeight,
      soundEnabled,
      setSoundEnabled: setSoundEnabledState,
      prepareSoundEnabled,
      setPrepareSoundEnabled: setPrepareSoundEnabledState,
      prepareSoundSeconds,
      setPrepareSoundSeconds: setPrepareSoundSecondsState,
    };
  }, [ready, theme, accent, unit, soundEnabled, prepareSoundEnabled, prepareSoundSeconds]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return context;
};
