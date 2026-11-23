import { useQuery } from '@tanstack/react-query';
import { fetchMachineById, fetchWashConfig } from '@/services/wash';
import { Machine, WashConfig } from '@/types';

export interface UseWashConfigResult {
  machine: Machine | null;
  config: WashConfig;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWashConfig(machineId?: string): UseWashConfigResult {
  const machineQuery = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => (machineId ? fetchMachineById(machineId) : null),
    enabled: !!machineId,
    staleTime: 1000 * 10,
  });

  const configQuery = useQuery({
    queryKey: ['wash_config'],
    queryFn: fetchWashConfig,
    staleTime: 1000 * 60 * 10,
  });

  return {
    machine: machineQuery.data || null,
    config: configQuery.data || {
      programs: [],
      tempAdjustments: [],
      spinAdjustments: [],
    },
    isLoading: machineQuery.isLoading || configQuery.isLoading,
    isError: machineQuery.isError || configQuery.isError,
    error: (machineQuery.error || configQuery.error) as Error | null,
    refetch: () => {
      machineQuery.refetch();
      configQuery.refetch();
    },
  };
}
