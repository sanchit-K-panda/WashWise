import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMachines,
  fetchHostelBlock,
  fetchFirstBlock,
  subscribeToMachineChanges,
} from '@/services/machines';
import { MachineWithSession, HostelBlock } from '@/types';

// Kept for test compatibility — not used as default block at runtime
export const DEFAULT_BLOCK_ID = 'a0000000-0000-0000-0000-000000000001';

export interface UseMachinesResult {
  machines: MachineWithSession[];
  block: HostelBlock | null;
  totalCount: number;
  availableCount: number;
  inUseCount: number;
  brokenCount: number;
  maintenanceCount: number;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: Error | null;
  isOffline: boolean;
  lastSyncedAt: Date | null;
  refetch: () => Promise<void>;
}

export function useHostelBlock(blockIdInput?: string | null) {
  const query = useQuery({
    queryKey: ['hostel_block', blockIdInput ?? 'first'],
    queryFn: async () => {
      if (blockIdInput) {
        return fetchHostelBlock(blockIdInput);
      }
      return fetchFirstBlock();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes cache for hostel block metadata
  });

  return {
    block: query.data || null,
    isLoading: query.isLoading,
  };
}

export function useMachines(blockIdInput?: string | null): UseMachinesResult {
  const queryClient = useQueryClient();
  const [realtimeOffline, setRealtimeOffline] = useState(false);

  // Machines Query — RLS handles block filtering server-side
  const machinesQuery = useQuery({
    queryKey: ['machines'],
    queryFn: () => fetchMachines(),
    staleTime: 1000 * 15,
  });

  // Block Info Query via shared useHostelBlock hook
  const { block, isLoading: isBlockLoading } = useHostelBlock(blockIdInput);

  // Determine blockId for realtime subscription (use fetched block if no input)
  const resolvedBlockId = blockIdInput ?? block?.id ?? null;

  // Realtime subscription
  useEffect(() => {
    if (!resolvedBlockId) return;

    const unsubscribe = subscribeToMachineChanges(
      resolvedBlockId,
      () => {
        queryClient.invalidateQueries({ queryKey: ['machines'] });
        queryClient.invalidateQueries({ queryKey: ['issues'] });
      },
      (status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeOffline(true);
        } else if (status === 'SUBSCRIBED') {
          setRealtimeOffline(false);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [resolvedBlockId, queryClient]);

  const machines = useMemo(() => machinesQuery.data || [], [machinesQuery.data]);

  const totalCount = machines.length;
  const availableCount = useMemo(
    () => machines.filter((m) => m.status === 'available').length,
    [machines]
  );
  const inUseCount = useMemo(
    () => machines.filter((m) => m.status === 'in_use').length,
    [machines]
  );
  const brokenCount = useMemo(
    () => machines.filter((m) => m.status === 'broken').length,
    [machines]
  );
  const maintenanceCount = useMemo(
    () => machines.filter((m) => m.status === 'maintenance').length,
    [machines]
  );

  const lastSyncedAt = useMemo(
    () => (machinesQuery.dataUpdatedAt ? new Date(machinesQuery.dataUpdatedAt) : null),
    [machinesQuery.dataUpdatedAt]
  );

  const isOffline = realtimeOffline || (machinesQuery.isError && machines.length > 0);

  const refetch = useCallback(async () => {
    try {
      await machinesQuery.refetch();
    } catch {
      // Prevent unhandled rejection during refresh control gestures
    }
  }, [machinesQuery]);

  return {
    machines,
    block,
    totalCount,
    availableCount,
    inUseCount,
    brokenCount,
    maintenanceCount,
    isLoading: machinesQuery.isLoading || isBlockLoading,
    isRefetching: machinesQuery.isRefetching,
    isError: machinesQuery.isError,
    error: machinesQuery.error as Error | null,
    isOffline,
    lastSyncedAt,
    refetch,
  };
}
