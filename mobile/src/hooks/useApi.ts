import { useMemo } from 'react';
import { NativeModules, Platform } from 'react-native';
import { ApiClient } from '@gym-app/shared';
import { useAuth } from '../context/AuthContext';

const FALLBACK_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

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

const resolveApiBaseUrl = (): string => {
  const envBaseUrl = (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_BASE_URL?.trim();
  const metroHost = getMetroHost();

  if (!envBaseUrl) {
    return metroHost ? `http://${metroHost}:3000` : FALLBACK_API_BASE_URL;
  }

  if (
    Platform.OS === 'android' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(envBaseUrl)
  ) {
    return metroHost
      ? envBaseUrl.replace(
          /^(https?:\/\/)(localhost|127\.0\.0\.1)/i,
          `$1${metroHost}`
        )
      : FALLBACK_API_BASE_URL;
  }

  return envBaseUrl;
};

const API_BASE_URL = resolveApiBaseUrl();

export const useApi = () => {
  const { session } = useAuth();

  return useMemo(
    () => new ApiClient(API_BASE_URL, () => session?.access_token ?? null),
    [session?.access_token]
  );
};
