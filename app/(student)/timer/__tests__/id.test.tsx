import React from 'react';
import { render, fireEvent, waitFor, act, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TimerScreen from '../[id]';
import * as washService from '@/services/wash';
import * as notificationsService from '@/services/notifications';
import { WashSessionDetails } from '@/services/wash';

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
  }),
  useLocalSearchParams: () => ({
    id: 'session-123',
  }),
}));

jest.mock('@/services/notifications', () => ({
  scheduleWashNotifications: jest.fn().mockResolvedValue({}),
  cancelSessionNotifications: jest.fn().mockResolvedValue(undefined),
}));

describe('TimerScreen', () => {
  let queryClient: QueryClient;

  const mockRunningSession: WashSessionDetails = {
    id: 'session-123',
    machine_id: 'm1',
    user_id: 'user-1',
    program_id: 'prog-normal',
    temp: '40',
    spin: 'High',
    weight_kg: 5.5,
    started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
    ends_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // 25 mins from now
    collected_at: null,
    status: 'running',
    machine: {
      id: 'm1',
      block_id: 'block-a',
      label: '02',
      capacity_kg: 7,
      status: 'in_use',
      status_updated_by: null,
      status_updated_at: '',
      verified_at: null,
      verified_by: null,
      note: null,
    },
    program: {
      id: 'prog-normal',
      name: 'Normal',
      base_minutes: 35,
      per_kg_minutes: 2.0,
      active: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderScreen = async () =>
    await render(
      <QueryClientProvider client={queryClient}>
        <TimerScreen />
      </QueryClientProvider>
    );

  it('renders loading state initially when session is fetching', async () => {
    jest.spyOn(washService, 'fetchSessionDetails').mockReturnValue(new Promise(() => {}));
    const { getByTestId } = await renderScreen();
    expect(getByTestId('timer-loading')).toBeTruthy();
  });

  it('renders not found state when session does not exist', async () => {
    jest.spyOn(washService, 'fetchSessionDetails').mockResolvedValue(null);
    const { getByTestId, getByText } = await renderScreen();

    await waitFor(() => {
      expect(getByTestId('session-not-found')).toBeTruthy();
    });

    expect(getByText('No active session found')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Back to machines'));
    });
    expect(mockReplace).toHaveBeenCalledWith('/(student)');
  });

  it('renders active timer screen with machine info and tabular countdown', async () => {
    jest.spyOn(washService, 'fetchSessionDetails').mockResolvedValue(mockRunningSession);
    const { getByTestId, getByText } = await renderScreen();

    await waitFor(() => {
      expect(getByTestId('timer-countdown')).toBeTruthy();
    });

    expect(getByText('Machine 02')).toBeTruthy();
    expect(getByText('TIME REMAINING')).toBeTruthy();
    expect(getByText('Normal')).toBeTruthy();
    expect(getByText(/40°C · High spin/)).toBeTruthy();
    expect(getByText('5.5 kg')).toBeTruthy();
    expect(getByText('Washing')).toBeTruthy();
  });

  it('renders completion state when time has expired or status is done', async () => {
    const mockDoneSession: WashSessionDetails = {
      ...mockRunningSession,
      status: 'running',
      ends_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    };

    jest.spyOn(washService, 'fetchSessionDetails').mockResolvedValue(mockDoneSession);
    const { getByTestId, getByText } = await renderScreen();

    await waitFor(() => {
      expect(getByTestId('timer-countdown')).toBeTruthy();
    });

    expect(getByText('00:00')).toBeTruthy();
    expect(getByText('CYCLE COMPLETE')).toBeTruthy();
    expect(getByText('Ready to collect')).toBeTruthy();
  });

  it('marks laundry collected, cancels notifications, and navigates home', async () => {
    jest.spyOn(washService, 'fetchSessionDetails').mockResolvedValue(mockRunningSession);
    const collectSpy = jest.spyOn(washService, 'collectWash').mockResolvedValue({ success: true });
    const cancelNotifSpy = jest
      .spyOn(notificationsService, 'cancelSessionNotifications')
      .mockResolvedValue(undefined);

    const { getByTestId } = await renderScreen();

    await waitFor(() => {
      expect(getByTestId('collected-button')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('collected-button'));
    });

    expect(collectSpy).toHaveBeenCalledWith('session-123');
    expect(cancelNotifSpy).toHaveBeenCalledWith('session-123');
    expect(mockReplace).toHaveBeenCalledWith('/(student)');
  });

  it('allows student to report an issue with the machine', async () => {
    jest.spyOn(washService, 'fetchSessionDetails').mockResolvedValue(mockRunningSession);
    const reportSpy = jest
      .spyOn(washService, 'reportMachineIssue')
      .mockResolvedValue({ success: true });

    const { getByTestId, getByText } = await renderScreen();

    await waitFor(() => {
      expect(getByTestId('report-issue-button')).toBeTruthy();
    });

    // Open issue modal
    await act(async () => {
      fireEvent.press(getByTestId('report-issue-button'));
    });

    expect(getByTestId('report-issue-modal')).toBeTruthy();
    expect(getByText('Report machine issue')).toBeTruthy();

    // Type description
    await act(async () => {
      fireEvent.changeText(
        getByTestId('issue-description-input'),
        'Water is leaking from drum door'
      );
    });

    // Submit issue report
    await act(async () => {
      fireEvent.press(getByTestId('submit-issue-button'));
    });

    await waitFor(() => {
      expect(reportSpy).toHaveBeenCalledWith('m1', 'Water is leaking from drum door');
      expect(getByTestId('issue-success-message')).toBeTruthy();
    });
  });
});
