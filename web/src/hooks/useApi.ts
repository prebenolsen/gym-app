import { useMemo } from 'react';
import { ApiClient } from '@gym-app/shared';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:3000';

export const useApi = () => {
  const { session } = useAuth();

  return useMemo(
    () => new ApiClient(API_BASE_URL, () => session?.access_token ?? null),
    [session?.access_token],
  );
};
