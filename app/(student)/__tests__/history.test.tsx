import React from 'react';
import { render } from '@testing-library/react-native';

import HistoryScreen from '../history';
import * as useAuthModule from '@/hooks/useAuth';
import * as useMachinesModule from '@/hooks/useMachines';
import * as washService from '@/services/wash';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSegments: () => [],
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    jest.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', email: 'test@college.edu' } as any,
      profile: { id: 'u1', name: 'Test', role: 'student', hostel_block_id: 'b1' },
      role: 'student',
      session: {} as any,
      isLoading: false,
      error: null,
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithPassword: jest.fn(),
      signUpWithPassword: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    });

    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: [],
      block: { id: 'b1', name: 'Block A' },
      totalCount: 0,
      availableCount: 0,
      inUseCount: 0,
      brokenCount: 0,
      maintenanceCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn(),
    });
  });

  it('renders past wash history list with program, weight and status chip', async () => {
    jest.spyOn(washService, 'fetchUserHistory').mockResolvedValue([
      {
        id: 's1',
        machine_id: 'm1',
        user_id: 'u1',
        program_id: 'p1',
        temp: '30',
        spin: 'medium',
        weight_kg: 3.0,
        started_at: '2026-11-20T10:00:00Z',
        ends_at: '2026-11-20T10:48:00Z',
        collected_at: '2026-11-20T10:50:00Z',
        status: 'collected',
        machine: { id: 'm1', label: '02' } as any,
        program: { id: 'p1', name: 'Normal' } as any,
      },
      {
        id: 's2',
        machine_id: 'm2',
        user_id: 'u1',
        program_id: 'p2',
        temp: 'cold',
        spin: 'low',
        weight_kg: 2.0,
        started_at: '2026-11-19T08:00:00Z',
        ends_at: '2026-11-19T08:35:00Z',
        collected_at: null,
        status: 'cancelled',
        machine: { id: 'm2', label: '01' } as any,
        program: { id: 'p2', name: 'Eco' } as any,
      },
    ]);

    const { findByText } = await render(<HistoryScreen />, { wrapper });

    expect(await findByText('History')).toBeTruthy();
    expect(await findByText('02')).toBeTruthy();
    expect(await findByText(/Normal · 3.0 kg/)).toBeTruthy();
    expect(await findByText('Collected')).toBeTruthy();
    expect(await findByText('01')).toBeTruthy();
    expect(await findByText(/Eco · 2.0 kg/)).toBeTruthy();
    expect(await findByText('Cancelled')).toBeTruthy();
  });

  it('renders empty state when there are no past washes', async () => {
    jest.spyOn(washService, 'fetchUserHistory').mockResolvedValue([]);

    const { findByText } = await render(<HistoryScreen />, { wrapper });

    expect(await findByText('No past washes')).toBeTruthy();
    expect(await findByText('Your completed wash sessions will appear here.')).toBeTruthy();
  });
});
