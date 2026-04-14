import { useMemo } from 'react';
import { NativeModules, Platform } from 'react-native';
import { ApiClient } from '@gym-app/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const FALLBACK_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const LOCALHOST_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i;
const LOCALHOST_HOST_PATTERN = /^(localhost|127\.0\.0\.1)$/i;

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

const isLoopbackHost = (value: string): boolean => LOCALHOST_HOST_PATTERN.test(value);

const resolveApiBaseUrl = (): string => {
  const envBaseUrl = (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_BASE_URL?.trim();
  const metroHost = getMetroHost();

  if (!envBaseUrl) {
    return metroHost ? `http://${metroHost}:3000` : FALLBACK_API_BASE_URL;
  }

  // A localhost API URL is the signal that we are in local USB debugging mode.
  // Only this branch is Android-specific; non-localhost URLs keep the existing home/prod behavior.
  if (Platform.OS === 'android' && isLocalhostUrl(envBaseUrl)) {
    // On a physical Android device, `adb reverse tcp:3000 tcp:3000` lets localhost resolve back
    // to the development machine. If Metro exposes a non-loopback host, prefer that host instead.
    if (metroHost && !isLoopbackHost(metroHost)) {
      return envBaseUrl.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)/i, `$1${metroHost}`);
    }

    return metroHost ? envBaseUrl : FALLBACK_API_BASE_URL;
  }

  return envBaseUrl;
};

const API_BASE_URL = resolveApiBaseUrl();

export const useApi = () => {
  const { session } = useAuth();

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

        return data.session?.access_token ?? null;
      }),
    [session?.access_token]
  );
};
