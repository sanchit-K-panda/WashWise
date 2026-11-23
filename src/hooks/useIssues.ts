import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { fetchBlockIssues } from '@/services/caretaker';
import { IssueReportWithMachine } from '@/types';

export function useIssues(enabled: boolean = true) {
  const { profile } = useAuth();
  const blockId = profile?.hostel_block_id;

  const query = useQuery<IssueReportWithMachine[]>({
    queryKey: ['issues', blockId],
    queryFn: () => (blockId ? fetchBlockIssues(blockId) : Promise.resolve([])),
    enabled: enabled && !!blockId,
    staleTime: 1000 * 30,
    refetchInterval: enabled ? 1000 * 30 : false,
  });

  return {
    issues: query.data || [],
    openCount: query.data?.length || 0,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
}
