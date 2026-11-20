import React from 'react';
import { render, fireEvent, waitFor, cleanup, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StartWashScreen from '../start';
import { useWashConfig } from '@/hooks/useWashConfig';
import * as washService from '@/services/wash';
import { Machine } from '@/types';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  useLocalSearchParams: () => ({
    machineId: 'm1',
  }),
}));

jest.mock('@/hooks/useWashConfig', () => ({
  useWashConfig: jest.fn(),
}));

jest.mock('@/services/notifications', () => ({
  scheduleWashNotifications: jest.fn().mockResolvedValue({}),
  cancelSessionNotifications: jest.fn().mockResolvedValue(undefined),
}));

const mockMachine: Machine = {
  id: 'm1',
  block_id: 'block-a',
  label: '01',
  capacity_kg: 7,
  status: 'available',
  status_updated_by: null,
  status_updated_at: '',
  note: null,
  created_at: '',
};

const mockConfig = {
  programs: [
    { id: 'normal', name: 'Normal', base_minutes: 35, per_kg_minutes: 2.0, active: true },
    { id: 'quick', name: 'Quick', base_minutes: 20, per_kg_minutes: 1.0, active: true },
  ],
  tempAdjustments: [
    { temp: 'Cold', minutes: 0 },
    { temp: '40', minutes: 5 },
  ],
  spinAdjustments: [
    { spin: 'Low', minutes: 0 },
    { spin: 'High', minutes: 4 },
  ],
};

describe('StartWashScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    (useWashConfig as jest.Mock).mockReturnValue({
      machine: mockMachine,
      config: mockConfig,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = async () => {
    return await render(
      <QueryClientProvider client={queryClient}>
        <StartWashScreen />
      </QueryClientProvider>
    );
  };

  it('renders machine header, segmented controls, weight stepper, and sticky footer', async () => {
    const { getByText, getByTestId } = await renderComponent();

    expect(getByText('Machine 01')).toBeTruthy();
    expect(getByText('7 kg capacity')).toBeTruthy();
    expect(getByText('Normal (35m)')).toBeTruthy();
    expect(getByText('Quick (20m)')).toBeTruthy();
    expect(getByText('Cold')).toBeTruthy();
    expect(getByText('40° (+5m)')).toBeTruthy();
    expect(getByText('Low')).toBeTruthy();
    expect(getByText('High (+4m)')).toBeTruthy();

    expect(getByTestId('weight-display')).toBeTruthy();
    expect(getByText('4 kg')).toBeTruthy();
    expect(getByTestId('start-wash-button')).toBeTruthy();
  });

  it('adjusts weight using minus and plus stepper buttons', async () => {
    const { getByTestId, getByText } = await renderComponent();

    await act(async () => {
      fireEvent.press(getByTestId('increase-weight-button'));
    });
    expect(getByText('5 kg')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('decrease-weight-button'));
    });
    expect(getByText('4 kg')).toBeTruthy();
  });

  it('shows overload warning and disables Start button when weight exceeds capacity', async () => {
    const { getByTestId, getByText } = await renderComponent();

    await act(async () => {
      fireEvent.press(getByTestId('increase-weight-button'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('increase-weight-button'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('increase-weight-button'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('increase-weight-button'));
    });

    expect(getByText('8 kg')).toBeTruthy();
    expect(getByTestId('overload-warning')).toBeTruthy();
    expect(getByText('Load exceeds capacity')).toBeTruthy();

    const startBtn = getByTestId('start-wash-button');
    expect(startBtn.props.accessibilityState.disabled).toBe(true);
  });

  it('calls startWash and navigates to timer on success', async () => {
    const mockSession = {
      session_id: 'session-xyz',
      machine_id: 'm1',
      machine_label: '01',
      program_name: 'Normal',
      duration_minutes: 43,
      started_at: '2026-11-20T10:00:00Z',
      ends_at: '2026-11-20T10:43:00Z',
      status: 'running',
    };

    jest.spyOn(washService, 'startWash').mockResolvedValueOnce({
      success: true,
      session: mockSession,
    });

    const { getByTestId } = await renderComponent();

    await act(async () => {
      fireEvent.press(getByTestId('start-wash-button'));
    });

    await waitFor(() => {
      expect(washService.startWash).toHaveBeenCalledWith({
        machineId: 'm1',
        programId: 'normal',
        temp: 'Cold',
        spin: 'Low',
        weightKg: 4,
      });
      expect(mockReplace).toHaveBeenCalledWith('/(student)/timer/session-xyz');
    });
  });

  it('handles race condition when machine was just taken by another student', async () => {
    jest.spyOn(washService, 'startWash').mockResolvedValueOnce({
      success: false,
      isRaceConflict: true,
      error: 'This machine was just taken by someone else.',
    });

    const { getByTestId, getByText } = await renderComponent();

    await act(async () => {
      fireEvent.press(getByTestId('start-wash-button'));
    });

    await waitFor(() => {
      expect(getByTestId('race-conflict-alert')).toBeTruthy();
      expect(getByText(/This machine was just taken by someone else/)).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Return'));
    });
    expect(mockReplace).toHaveBeenCalledWith('/(student)');
  });

  it('displays unavailable state if machine is already occupied or broken upfront', async () => {
    (useWashConfig as jest.Mock).mockReturnValue({
      machine: { ...mockMachine, status: 'broken', note: 'Motor issue' },
      config: mockConfig,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId, getByText } = await renderComponent();
    expect(getByTestId('machine-unavailable')).toBeTruthy();
    expect(getByText('Machine is currently broken')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Back to machines'));
    });
    expect(mockReplace).toHaveBeenCalledWith('/(student)');
  });

  it('renders loading skeleton state when config or machine is loading', async () => {
    (useWashConfig as jest.Mock).mockReturnValue({
      machine: null,
      config: mockConfig,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId } = await renderComponent();
    expect(getByTestId('start-loading')).toBeTruthy();
  });

  it('renders machine-not-found state if machine cannot be located', async () => {
    (useWashConfig as jest.Mock).mockReturnValue({
      machine: null,
      config: mockConfig,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId, getByText } = await renderComponent();
    expect(getByTestId('machine-not-found')).toBeTruthy();
    expect(getByText('Machine not found')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Back to machines'));
    });
    expect(mockReplace).toHaveBeenCalledWith('/(student)');
  });
});
