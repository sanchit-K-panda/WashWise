import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMachines, fetchHostelBlock, subscribeToMachineChanges } from '@/services/machines';
import { MachineWithSession, HostelBlock } from '@/types';

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

export const DEFAULT_BLOCK_ID = 'a0000000-0000-0000-0000-000000000001';

export function useMachines(blockIdInput?: string | null): UseMachinesResult {
  const blockId = blockIdInput || DEFAULT_BLOCK_ID;
  const queryClient = useQueryClient();
  const [realtimeOffline, setRealtimeOffline] = useState(false);

  // Machines Query (scoped per user block via view)
  const machinesQuery = useQuery({
    queryKey: ['machines'],
    queryFn: () => fetchMachines(blockId),
    staleTime: 1000 * 15,
  });

  // Block Info Query
  const blockQuery = useQuery({
    queryKey: ['hostel_block', blockId],
    queryFn: () => fetchHostelBlock(blockId),
    staleTime: 1000 * 60 * 5,
  });

  // Realtime subscription
  useEffect(() => {
    if (!blockId) return;

    const unsubscribe = subscribeToMachineChanges(
      blockId,
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
  }, [blockId, queryClient]);

  const machines = useMemo(() => machinesQuery.data || [], [machinesQuery.data]);
  const block = blockQuery.data || null;

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
    isLoading: machinesQuery.isLoading,
    isRefetching: machinesQuery.isRefetching,
    isError: machinesQuery.isError,
    error: machinesQuery.error as Error | null,
    isOffline,
    lastSyncedAt,
    refetch,
  };
}
