import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMachines, DEFAULT_BLOCK_ID } from '../useMachines';
import * as machineService from '@/services/machines';
import { MachineWithSession, HostelBlock } from '@/types';

jest.mock('@/services/machines');

const mockMachines: MachineWithSession[] = [
  {
    id: '1',
    block_id: DEFAULT_BLOCK_ID,
    label: '01',
    capacity_kg: 7,
    status: 'available',
    status_updated_at: '',
    verified_at: null,
    note: null,
    started_at: null,
    ends_at: null,
    is_finished: null,
  },
  {
    id: '2',
    block_id: DEFAULT_BLOCK_ID,
    label: '02',
    capacity_kg: 7,
    status: 'in_use',
    status_updated_at: '',
    verified_at: null,
    note: null,
    started_at: null,
    ends_at: null,
    is_finished: null,
    timeLeftMinutes: 14,
    progressPercent: 60,
  },
  {
    id: '3',
    block_id: DEFAULT_BLOCK_ID,
    label: '03',
    capacity_kg: 7,
    status: 'broken',
    status_updated_at: '',
    verified_at: null,
    note: 'Broken door',
    started_at: null,
    ends_at: null,
    is_finished: null,
  },
];

const mockBlock: HostelBlock = {
  id: DEFAULT_BLOCK_ID,
  name: 'Block A',
};

describe('useMachines hook', () => {
  let queryClient: QueryClient;
  let unsubscribeMock: jest.Mock;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    unsubscribeMock = jest.fn();
    jest.spyOn(machineService, 'fetchMachines').mockResolvedValue(mockMachines);
    jest.spyOn(machineService, 'fetchHostelBlock').mockResolvedValue(mockBlock);
    jest.spyOn(machineService, 'fetchFirstBlock').mockResolvedValue(mockBlock);
    jest
      .spyOn(machineService, 'subscribeToMachineChanges')
      .mockImplementation((_blockId, _cb, onStatus) => {
        if (onStatus) onStatus('SUBSCRIBED');
        return unsubscribeMock;
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches machines, block info, and calculates counts', async () => {
    const { result } = await renderHook(() => useMachines(DEFAULT_BLOCK_ID), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.machines).toHaveLength(3);
    expect(result.current.block).toEqual(mockBlock);
    expect(result.current.totalCount).toBe(3);
    expect(result.current.availableCount).toBe(1);
    expect(result.current.inUseCount).toBe(1);
    expect(result.current.brokenCount).toBe(1);
    expect(result.current.isOffline).toBe(false);
  });

  it('supports refetching data', async () => {
    const { result } = await renderHook(() => useMachines(DEFAULT_BLOCK_ID), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(machineService.fetchMachines).toHaveBeenCalledTimes(2);
  });

  it('unsubscribes from realtime on unmount', async () => {
    const { unmount } = await renderHook(() => useMachines(DEFAULT_BLOCK_ID), { wrapper });

    await waitFor(() => {
      expect(machineService.subscribeToMachineChanges).toHaveBeenCalled();
    });

    await act(async () => {
      unmount();
    });

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
