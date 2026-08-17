import { useMemo } from 'react';
import { ApiClient } from '@gym-app/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * ApiClient talks straight to Supabase, so there is no API host to resolve and
 * nothing platform-specific here. Row Level Security scopes every query to the
 * signed-in user, and the client reads the session itself.
 */
export const useApi = () => {
  const { session } = useAuth();

  // Rebuilt when the session changes so a sign-out/sign-in cannot leave a
  // consumer holding a client bound to the previous user's session.
  return useMemo(() => new ApiClient(supabase), [session?.user?.id]);
};
