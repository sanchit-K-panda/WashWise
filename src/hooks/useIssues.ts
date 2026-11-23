import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { fetchBlockIssues } from '@/services/caretaker';
import { IssueReportWithMachine } from '@/types';

export function useIssues() {
  const { profile } = useAuth();
  const blockId = profile?.hostel_block_id;

  const query = useQuery<IssueReportWithMachine[]>({
    queryKey: ['issues'],
    queryFn: () => (blockId ? fetchBlockIssues(blockId) : Promise.resolve([])),
    enabled: !!blockId,
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 15,
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
