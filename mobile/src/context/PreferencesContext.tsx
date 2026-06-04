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
export type DateFormat = 'iso' | 'eu' | 'us';
export type SoundType = 'completion' | 'countdown' | 'prepare';

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
  heightUnit: 'cm' | 'ft';
  convertFromCm: (cm: number) => number;
  convertToCm: (value: number) => number;
  formatHeight: (cm: number) => string;
  completionCueEnabled: boolean;
  setCompletionCueEnabled: (enabled: boolean) => void;
  countdownCueEnabled: boolean;
  setCountdownCueEnabled: (enabled: boolean) => void;
  customCueEnabled: boolean;
  setCustomCueEnabled: (enabled: boolean) => void;
  customCueSeconds: number;
  setCustomCueSeconds: (seconds: number) => void;
  completionSoundId: string;
  setCompletionSoundId: (id: string) => void;
  countdownSoundId: string;
  setCountdownSoundId: (id: string) => void;
  prepareSoundId: string;
  setPrepareSoundId: (id: string) => void;
  showFileDisplay: boolean;
  setShowFileDisplay: (enabled: boolean) => void;
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
  formatDate: (isoString: string) => string;
  formatDateOnly: (isoString: string) => string;
};

const THEME_KEY = 'gym-app.mobile.theme';
const ACCENT_KEY = 'gym-app.mobile.accent';
const UNIT_KEY = 'gym-app.mobile.weight-unit';
const COMPLETION_CUE_ENABLED_KEY = 'gym-app.mobile.sound-completion-enabled';
const COUNTDOWN_CUE_ENABLED_KEY = 'gym-app.mobile.sound-countdown-enabled';
const CUSTOM_CUE_ENABLED_KEY = 'gym-app.mobile.sound-custom-enabled';
const CUSTOM_CUE_SECONDS_KEY = 'gym-app.mobile.sound-custom-seconds';
const COMPLETION_SOUND_ID_KEY = 'gym-app.mobile.sound-completion-id';
const COUNTDOWN_SOUND_ID_KEY = 'gym-app.mobile.sound-countdown-id';
const PREPARE_SOUND_ID_KEY = 'gym-app.mobile.sound-prepare-id';
const SHOW_FILE_DISPLAY_KEY = 'gym-app.mobile.show-file-display';
const DATE_FORMAT_KEY = 'gym-app.mobile.date-format';

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
  const [completionSoundId, setCompletionSoundIdState] = useState('completion-classic');
  const [countdownSoundId, setCountdownSoundIdState] = useState('countdown-beep');
  const [prepareSoundId, setPrepareSoundIdState] = useState('prepare-double');
  const [showFileDisplay, setShowFileDisplayState] = useState(true);
  const [dateFormat, setDateFormatState] = useState<DateFormat>('iso');

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
          savedCompletionSoundId,
          savedCountdownSoundId,
          savedPrepareSoundId,
          savedShowFileDisplay,
          savedDateFormat,
        ] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(ACCENT_KEY),
          AsyncStorage.getItem(UNIT_KEY),
          AsyncStorage.getItem(COMPLETION_CUE_ENABLED_KEY),
          AsyncStorage.getItem(COUNTDOWN_CUE_ENABLED_KEY),
          AsyncStorage.getItem(CUSTOM_CUE_ENABLED_KEY),
          AsyncStorage.getItem(CUSTOM_CUE_SECONDS_KEY),
          AsyncStorage.getItem(COMPLETION_SOUND_ID_KEY),
          AsyncStorage.getItem(COUNTDOWN_SOUND_ID_KEY),
          AsyncStorage.getItem(PREPARE_SOUND_ID_KEY),
          AsyncStorage.getItem(SHOW_FILE_DISPLAY_KEY),
          AsyncStorage.getItem(DATE_FORMAT_KEY),
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

        if (savedCompletionSoundId) {
          setCompletionSoundIdState(savedCompletionSoundId);
        }
        if (savedCountdownSoundId) {
          setCountdownSoundIdState(savedCountdownSoundId);
        }
        if (savedPrepareSoundId) {
          setPrepareSoundIdState(savedPrepareSoundId);
        }

        if (savedShowFileDisplay === 'true' || savedShowFileDisplay === 'false') {
          setShowFileDisplayState(savedShowFileDisplay === 'true');
        }
        if (
          savedDateFormat === 'iso' ||
          savedDateFormat === 'eu' ||
          savedDateFormat === 'us'
        ) {
          setDateFormatState(savedDateFormat);
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

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(COMPLETION_SOUND_ID_KEY, completionSoundId).catch((err) => {
      console.error('Failed to persist completion sound id setting:', err);
    });
  }, [completionSoundId, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(COUNTDOWN_SOUND_ID_KEY, countdownSoundId).catch((err) => {
      console.error('Failed to persist countdown sound id setting:', err);
    });
  }, [countdownSoundId, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(PREPARE_SOUND_ID_KEY, prepareSoundId).catch((err) => {
      console.error('Failed to persist prepare sound id setting:', err);
    });
  }, [prepareSoundId, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(SHOW_FILE_DISPLAY_KEY, String(showFileDisplay)).catch((err) => {
      console.error('Failed to persist show file display setting:', err);
    });
  }, [showFileDisplay, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(DATE_FORMAT_KEY, dateFormat).catch((err) => {
      console.error('Failed to persist date format setting:', err);
    });
  }, [dateFormat, ready]);

  const value = useMemo<PreferencesContextValue>(() => {
    const convertFromKg = (kg: number) => (unit === 'lb' ? kg * 2.2 : kg);
    const convertToKg = (input: number) => (unit === 'lb' ? input / 2.2 : input);
    const formatWeight = (kg: number, digits = 1) =>
      `${convertFromKg(kg).toFixed(digits)} ${unit}`;

    const heightUnit = unit === 'lb' ? ('ft' as const) : ('cm' as const);
    const convertFromCm = (cm: number) => (unit === 'lb' ? cm / 30.48 : cm);
    const convertToCm = (val: number) => (unit === 'lb' ? val * 30.48 : val);
    const formatHeight = (cm: number) =>
      unit === 'lb' ? `${(cm / 30.48).toFixed(1)} ft` : `${Math.round(cm)} cm`;

    const formatDateOnly = (isoString: string): string => {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      if (dateFormat === 'eu') {
        return `${day}/${month}/${year}`;
      } else if (dateFormat === 'us') {
        return `${month}/${day}/${year}`;
      } else {
        // 'iso' key uses YYYY/MM/DD for display
        return `${year}/${month}/${day}`;
      }
    };

    const formatDate = (isoString: string): string => {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      // For display with day of week and time
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      if (dateFormat === 'eu') {
        return `${dayOfWeek}, ${day} ${monthName} ${year}`;
      } else if (dateFormat === 'us') {
        return `${dayOfWeek}, ${monthName} ${day}, ${year}`;
      } else {
        // 'iso' key uses YYYY/MM/DD for display with day of week
        return `${dayOfWeek}, ${year}/${month}/${day}`;
      }
    };

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
      heightUnit,
      convertFromCm,
      convertToCm,
      formatHeight,
      completionCueEnabled,
      setCompletionCueEnabled: setCompletionCueEnabledState,
      countdownCueEnabled,
      setCountdownCueEnabled: setCountdownCueEnabledState,
      customCueEnabled,
      setCustomCueEnabled: setCustomCueEnabledState,
      customCueSeconds,
      setCustomCueSeconds: setCustomCueSecondsState,
      completionSoundId,
      setCompletionSoundId: setCompletionSoundIdState,
      countdownSoundId,
      setCountdownSoundId: setCountdownSoundIdState,
      prepareSoundId,
      setPrepareSoundId: setPrepareSoundIdState,
      showFileDisplay,
      setShowFileDisplay: setShowFileDisplayState,
      dateFormat,
      setDateFormat: setDateFormatState,
      formatDate,
      formatDateOnly,
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
    completionSoundId,
    countdownSoundId,
    prepareSoundId,
    showFileDisplay,
    dateFormat,
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
