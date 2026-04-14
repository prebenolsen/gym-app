import { useEffect, useMemo } from 'react';
import { NativeModules, Platform } from 'react-native';
import { ApiClient } from '@gym-app/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const FALLBACK_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const LOCALHOST_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i;

const getMetroHost = (): string | null => {
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as
    | string
    | undefined;
  if (!scriptURL) {
    return null;
  }

  const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?/i);
  return match?.[1] ?? null;
};

const isLocalhostUrl = (value: string): boolean => LOCALHOST_URL_PATTERN.test(value);

const resolveApiBaseUrl = (): string => {
  const envBaseUrl = (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_BASE_URL?.trim();
  const metroHost = getMetroHost();

  if (!envBaseUrl) {
    return metroHost ? `http://${metroHost}:3000` : FALLBACK_API_BASE_URL;
  }

  // Localhost is the explicit USB-debug mode signal.
  // In this mode we must keep localhost untouched and rely on `adb reverse`.
  if (Platform.OS === 'android' && isLocalhostUrl(envBaseUrl)) {
    return envBaseUrl;
  }

  return envBaseUrl;
};

const API_BASE_URL = resolveApiBaseUrl();

export const useApi = () => {
  const { session } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'android' && isLocalhostUrl(API_BASE_URL)) {
      console.info(
        'Android USB debugging mode detected. Ensure adb reverse is active: ' +
          '`adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081`.'
      );
    }
  }, []);

  return useMemo(
    () =>
      new ApiClient(API_BASE_URL, async () => {
        if (session?.access_token) {
          return session.access_token;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Failed to load mobile auth token for API request:', error);
          return null;
        }

        if (!data.session?.access_token) {
          console.warn('API request is missing a Supabase access token during startup.');
        }

        return data.session?.access_token ?? null;
      }),
    [session?.access_token]
  );
};
