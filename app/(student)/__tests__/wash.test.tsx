import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MyWashScreen from '../wash';
import * as useAuthModule from '@/hooks/useAuth';
import * as useActiveSessionModule from '@/hooks/useActiveSession';
import * as useMachinesModule from '@/hooks/useMachines';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('MyWashScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    jest.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', email: 'student@college.edu' } as any,
      profile: { id: 'u1', name: 'Student', role: 'student', hostel_block_id: 'b1' },
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

  it('renders empty state when no wash session is running', async () => {
    jest.spyOn(useActiveSessionModule, 'useActiveSession').mockReturnValue({
      activeSession: null,
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByText, getByLabelText } = await render(<MyWashScreen />, { wrapper });

    expect(getByText('No wash running')).toBeTruthy();
    expect(getByText(/Start a wash from the Machines tab/)).toBeTruthy();

    fireEvent.press(getByLabelText('Find a machine'));
    expect(mockPush).toHaveBeenCalledWith('/(student)');
  });

  it('renders active wash countdown and details when a wash is running', async () => {
    jest.spyOn(useActiveSessionModule, 'useActiveSession').mockReturnValue({
      activeSession: {
        id: 's1',
        machine_id: 'm1',
        user_id: 'u1',
        program_id: 'p1',
        temp: '30',
        spin: 'medium',
        weight_kg: 3.0,
        started_at: new Date(Date.now() - 60000).toISOString(),
        ends_at: new Date(Date.now() + 1800000).toISOString(),
        collected_at: null,
        status: 'running',
        machine: { id: 'm1', label: '02' } as any,
        program: { id: 'p1', name: 'Normal' } as any,
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByText, getByLabelText } = await render(<MyWashScreen />, { wrapper });

    expect(getByText('Washing')).toBeTruthy();
    expect(getByText('Normal')).toBeTruthy();
    expect(getByText('30°C')).toBeTruthy();
    expect(getByText('Medium')).toBeTruthy();
    expect(getByText('3.0 kg')).toBeTruthy();
    expect(getByLabelText('I collected my clothes')).toBeTruthy();
    expect(getByLabelText('Report a problem')).toBeTruthy();
    expect(getByLabelText('Cancel this wash')).toBeTruthy();
  });
});
