import { useMemo } from 'react';
import { Platform } from 'react-native';
import { ApiClient } from '@gym-app/shared';
import { useAuth } from '../context/AuthContext';

const FALLBACK_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || FALLBACK_API_BASE_URL;

export const useApi = () => {
  const { session } = useAuth();

  return useMemo(
    () => new ApiClient(API_BASE_URL, () => session?.access_token ?? null),
    [session?.access_token]
  );
};
