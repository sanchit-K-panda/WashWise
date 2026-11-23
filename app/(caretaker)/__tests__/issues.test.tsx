import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import CaretakerIssuesScreen from '../issues';
import * as useAuthModule from '@/hooks/useAuth';
import * as useMachinesModule from '@/hooks/useMachines';
import * as useIssuesModule from '@/hooks/useIssues';
import * as caretakerService from '@/services/caretaker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSegments: () => [],
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('CaretakerIssuesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    jest.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'c1', email: 'username_1@washwise.app' } as any,
      profile: { id: 'c1', name: 'Caretaker', role: 'caretaker', hostel_block_id: 'b1' },
      role: 'caretaker',
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

  it('renders open issues list with machine label and descriptions', async () => {
    jest.spyOn(useIssuesModule, 'useIssues').mockReturnValue({
      issues: [
        {
          id: 'i1',
          machine_id: 'm4',
          reported_by: 'u2',
          description: 'Drum does not spin, water stays in.',
          created_at: new Date(Date.now() - 1200000).toISOString(),
          resolved_at: null,
          resolved_by: null,
          machines: { id: 'm4', label: '04', block_id: 'b1', status: 'available' },
        },
      ] as any,
      openCount: 1,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText, getByLabelText } = await render(<CaretakerIssuesScreen />, { wrapper });

    expect(getByText('Issues')).toBeTruthy();
    expect(getByText('1 open reports from students')).toBeTruthy();
    expect(getByText('Machine 04')).toBeTruthy();
    expect(getByText('Drum does not spin, water stays in.')).toBeTruthy();
    expect(getByLabelText('Resolve, mark broken')).toBeTruthy();
    expect(getByLabelText('Resolve')).toBeTruthy();
  });

  it('renders empty state when no issues are open', async () => {
    jest.spyOn(useIssuesModule, 'useIssues').mockReturnValue({
      issues: [],
      openCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText } = await render(<CaretakerIssuesScreen />, { wrapper });

    expect(getByText('No open issues')).toBeTruthy();
    expect(getByText('New reports from students will show up here.')).toBeTruthy();
  });

  it('calls resolveIssue when Resolve button is pressed', async () => {
    const resolveSpy = jest.spyOn(caretakerService, 'resolveIssue').mockResolvedValue({
      success: true,
      report: {} as any,
    });

    jest.spyOn(useIssuesModule, 'useIssues').mockReturnValue({
      issues: [
        {
          id: 'i1',
          machine_id: 'm4',
          reported_by: 'u2',
          description: 'Drum problem',
          created_at: new Date().toISOString(),
          resolved_at: null,
          resolved_by: null,
          machines: { id: 'm4', label: '04', block_id: 'b1', status: 'available' },
        },
      ] as any,
      openCount: 1,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByLabelText } = await render(<CaretakerIssuesScreen />, { wrapper });

    await act(async () => {
      fireEvent.press(getByLabelText('Resolve'));
    });

    expect(resolveSpy).toHaveBeenCalledWith({ issueId: 'i1' });
  });
});
