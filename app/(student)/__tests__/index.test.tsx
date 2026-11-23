import React from 'react';
import { render, fireEvent, act, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudentHomeScreen from '../index';
import * as useAuthModule from '@/hooks/useAuth';
import * as useMachinesModule from '@/hooks/useMachines';
import * as useActiveSessionModule from '@/hooks/useActiveSession';
import * as washService from '@/services/wash';
import { MachineWithSession, HostelBlock } from '@/types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

jest.mock('@/hooks/useActiveSession', () => ({
  useActiveSession: jest.fn(),
}));

const mockSignOut = jest.fn();

const mockBlock: HostelBlock = {
  id: 'block-a-id',
  name: 'Block A',
};

const mockMachines: MachineWithSession[] = [
  {
    id: 'm1',
    block_id: 'block-a-id',
    label: '01',
    capacity_kg: 6.5,
    status: 'available',
    status_updated_at: '',
    verified_at: null,
    note: null,
    started_at: null,
    ends_at: null,
    is_finished: false,
  },
  {
    id: 'm2',
    block_id: 'block-a-id',
    label: '02',
    capacity_kg: 7.0,
    status: 'in_use',
    status_updated_at: '',
    verified_at: null,
    note: null,
    started_at: '2026-11-20T10:00:00Z',
    ends_at: '2026-11-20T10:45:00Z',
    is_finished: false,
    timeLeftMinutes: 14,
    progressPercent: 65,
  },
  {
    id: 'm3',
    block_id: 'block-a-id',
    label: '03',
    capacity_kg: 7.5,
    status: 'broken',
    status_updated_at: '',
    verified_at: null,
    note: 'Door latch fault',
    started_at: null,
    ends_at: null,
    is_finished: false,
  },
  {
    id: 'm4',
    block_id: 'block-a-id',
    label: '04',
    capacity_kg: 7.0,
    status: 'maintenance',
    status_updated_at: '',
    verified_at: null,
    note: 'Filter cleaning',
    started_at: null,
    ends_at: null,
    is_finished: false,
  },
];

describe('StudentHomeScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    (useActiveSessionModule.useActiveSession as jest.Mock).mockReturnValue({
      activeSession: null,
      isLoading: false,
      refetch: jest.fn(),
    });

    jest.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', email: 'student@college.edu' } as never,
      profile: {
        id: 'u1',
        name: 'Student One',
        role: 'student',
        hostel_block_id: 'block-a-id',
      },
      session: {} as never,
      role: 'student',
      isLoading: false,
      error: null,
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithPassword: jest.fn(),
      signUpWithPassword: jest.fn(),
      signOut: mockSignOut,
      refreshProfile: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = async () => {
    return await render(
      <QueryClientProvider client={queryClient}>
        <StudentHomeScreen />
      </QueryClientProvider>
    );
  };

  it('renders loading skeletons when initial load is in progress', async () => {
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: [],
      block: null,
      totalCount: 0,
      availableCount: 0,
      inUseCount: 0,
      brokenCount: 0,
      maintenanceCount: 0,
      isLoading: true,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const { getByTestId, getByText } = await renderComponent();
    expect(getByTestId('loading-skeletons')).toBeTruthy();
    expect(getByText('Checking machines…')).toBeTruthy();
  });

  it('renders error state with retry button when query fails', async () => {
    const mockRefetch = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: [],
      block: null,
      totalCount: 0,
      availableCount: 0,
      inUseCount: 0,
      brokenCount: 0,
      maintenanceCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: true,
      error: new Error('Failed to load'),
      isOffline: false,
      lastSyncedAt: null,
      refetch: mockRefetch,
    });

    const { getByTestId, getByText } = await renderComponent();
    expect(getByTestId('error-state')).toBeTruthy();
    expect(getByText('Unable to load machines')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Try again'));
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders block summary header ("1 of 4 free") and 2-column machine tiles', async () => {
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 4,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 1,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const { getByText, getByTestId } = await renderComponent();

    // Header summary and block subtitle
    expect(getByText('1 of 4 free')).toBeTruthy();
    expect(getByText('Block A Laundry Room')).toBeTruthy();

    // Machine tiles
    expect(getByTestId('machine-grid')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
    expect(getByText('02')).toBeTruthy();
    expect(getByText('03')).toBeTruthy();
    expect(getByText('04')).toBeTruthy();

    // In use machine shows time-left chip
    expect(getByText('14 min left')).toBeTruthy();

    // Broken machine shows strike/broken indicator
    expect(getByTestId('broken-indicator-03')).toBeTruthy();
  });

  it('navigates to start screen when an available machine is pressed and confirmed in sheet', async () => {
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 4,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 1,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const { getByLabelText, getByTestId } = await renderComponent();

    const availableTile = getByLabelText(/Machine 01, 6.5 kilograms, Available/);
    await act(async () => {
      fireEvent.press(availableTile);
    });

    // Sheet opens with "Start a wash here"
    const startWashBtn = getByTestId('sheet-start-wash-button');
    expect(startWashBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(startWashBtn);
    });

    expect(mockPush).toHaveBeenCalledWith('/(student)/start?machineId=m1');
  });

  it('displays offline banner with last synced time when offline', async () => {
    const syncDate = new Date('2026-11-20T10:45:00Z');
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 4,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 1,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: true,
      lastSyncedAt: syncDate,
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const { getByLabelText, getByText } = await renderComponent();
    expect(getByLabelText('Offline banner')).toBeTruthy();
    expect(getByText(/Offline · Last synced/)).toBeTruthy();
  });

  it('renders active wash session banner and navigates to timer on press', async () => {
    (useActiveSessionModule.useActiveSession as jest.Mock).mockReturnValue({
      activeSession: {
        id: 'session-active-1',
        machine_id: 'm1',
        user_id: 'u1',
        program_id: 'prog-1',
        temp: '40',
        spin: 'High',
        weight_kg: 5,
        started_at: '2026-11-20T10:00:00Z',
        ends_at: '2026-11-20T10:45:00Z',
        collected_at: null,
        status: 'running',
        machine: { id: 'm1', label: '01' },
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 4,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 1,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const { getByTestId, getByText } = await renderComponent();
    expect(getByTestId('active-session-banner')).toBeTruthy();
    expect(getByText(/Machine 01/)).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('active-session-banner'));
    });

    expect(mockPush).toHaveBeenCalledWith('/(student)/timer/session-active-1');
  });

  it('allows students to report an issue from the machine details sheet', async () => {
    const reportSpy = jest
      .spyOn(washService, 'reportMachineIssue')
      .mockResolvedValue({ success: true });

    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 4,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 1,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const { getByLabelText, getByText, getByTestId } = await renderComponent();

    // Tap broken machine (03) tile to open bottom sheet
    const brokenTile = getByLabelText(/Machine 03/);
    await act(async () => {
      fireEvent.press(brokenTile);
    });

    // In sheet, tap "Report a problem"
    await act(async () => {
      fireEvent.press(getByText('Report a problem'));
    });

    expect(getByTestId('tile-report-issue-modal')).toBeTruthy();
    expect(getByText('Report machine issue')).toBeTruthy();

    // Enter description
    await act(async () => {
      fireEvent.changeText(
        getByTestId('tile-issue-description-input'),
        'Water puddling under drum'
      );
    });

    // Submit report
    await act(async () => {
      fireEvent.press(getByTestId('submit-tile-issue-button'));
    });

    expect(reportSpy).toHaveBeenCalledWith('m3', 'Water puddling under drum', '03');
    expect(getByTestId('tile-issue-success')).toBeTruthy();
  });
});
