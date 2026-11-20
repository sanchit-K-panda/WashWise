import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { fetchActiveUserSession } from '@/services/wash';

export function useActiveSession() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['active_session', userId],
    queryFn: () => (userId ? fetchActiveUserSession(userId) : null),
    enabled: !!userId,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 15,
  });

  return {
    activeSession: query.data || null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
