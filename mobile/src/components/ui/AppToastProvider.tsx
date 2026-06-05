import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, shadow } from '../../theme';
import { usePreferences } from '../../context/PreferencesContext';

type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastDuration = 'short' | 'long' | 'sticky';

type ToastPayload = {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: ToastDuration;
};

type ToastState = {
  id: number;
  title?: string;
  message: string;
  type: ToastType;
  duration: ToastDuration;
};

type ToastContextValue = {
  showToast: (payload: ToastPayload) => void;
};

const AppToastContext = createContext<ToastContextValue | undefined>(undefined);

const DURATION_MS: Record<Exclude<ToastDuration, 'sticky'>, number> = {
  short: 2200,
  long: 4200,
};

const BACKGROUND_BY_TYPE: Record<ToastType, keyof typeof colors> = {
  success: 'accentSoft',
  error: 'danger',
  warning: 'warning',
  info: 'accent',
};

const TEXT_COLOR_BY_TYPE: Record<ToastType, keyof typeof colors> = {
  success: 'textStrong',
  error: 'textOnAccent',
  warning: 'textOnAccent',
  info: 'textOnAccent',
};

const BORDER_COLOR_BY_TYPE: Record<ToastType, keyof typeof colors> = {
  success: 'accent',
  error: 'danger',
  warning: 'warning',
  info: 'accent',
};

export function AppToastProvider({ children }: { children: ReactNode }) {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    ({ title, message, type = 'info', duration = 'short' }: ToastPayload) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const nextToast: ToastState = {
        id: ++idRef.current,
        title,
        message,
        type,
        duration,
      };
      setToast(nextToast);

      if (duration !== 'sticky') {
        timerRef.current = setTimeout(() => {
          setToast((current) => (current?.id === nextToast.id ? null : current));
          timerRef.current = null;
        }, DURATION_MS[duration]);
      } else {
        timerRef.current = null;
      }
    },
    [],
  );

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <AppToastContext.Provider value={contextValue}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <Pressable
            onPress={dismissToast}
            style={[
              styles.toast,
              {
                backgroundColor: themeColors[BACKGROUND_BY_TYPE[toast.type]],
                borderColor: themeColors[BORDER_COLOR_BY_TYPE[toast.type]],
              },
            ]}
            accessibilityRole="alert"
          >
            {toast.title ? (
              <Text
                style={[
                  styles.title,
                  { color: themeColors[TEXT_COLOR_BY_TYPE[toast.type]] },
                ]}
              >
                {toast.title}
              </Text>
            ) : null}
            <Text
              style={[styles.message, { color: themeColors[TEXT_COLOR_BY_TYPE[toast.type]] }]}
            >
              {toast.message}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </AppToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(AppToastContext);
  if (!context) {
    throw new Error('useToast must be used within AppToastProvider');
  }
  return context;
}

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingBottom: 130,
      paddingHorizontal: 16,
      zIndex: 30,
      pointerEvents: 'box-none',
    },
    toast: {
      width: '100%',
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      ...shadow.card,
    },
    title: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },
    message: {
      fontSize: 13,
      fontWeight: '600',
    },
  });
