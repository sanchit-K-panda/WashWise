import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
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
  created_at: '',
};

const mockMachines: MachineWithSession[] = [
  {
    id: 'm1',
    block_id: 'block-a-id',
    label: '01',
    capacity_kg: 6.5,
    status: 'available',
    status_updated_by: null,
    status_updated_at: '',
    note: null,
    created_at: '',
  },
  {
    id: 'm2',
    block_id: 'block-a-id',
    label: '02',
    capacity_kg: 7.0,
    status: 'in_use',
    status_updated_by: null,
    status_updated_at: '',
    note: null,
    timeLeftMinutes: 14,
    progressPercent: 65,
    created_at: '',
  },
  {
    id: 'm3',
    block_id: 'block-a-id',
    label: '03',
    capacity_kg: 7.5,
    status: 'broken',
    status_updated_by: null,
    status_updated_at: '',
    note: 'Door latch fault',
    created_at: '',
  },
  {
    id: 'm4',
    block_id: 'block-a-id',
    label: '04',
    capacity_kg: 7.0,
    status: 'maintenance',
    status_updated_by: null,
    status_updated_at: '',
    note: 'Filter cleaning',
    created_at: '',
  },
];

describe('StudentHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
        created_at: '',
        updated_at: '',
      },
      session: {} as never,
      role: 'student',
      isLoading: false,
      error: null,
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: mockSignOut,
      refreshProfile: jest.fn(),
    });
  });

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

    const { getByTestId, getByText } = await render(<StudentHomeScreen />);
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

    const { getByTestId, getByText } = await render(<StudentHomeScreen />);
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

    const { getByText, getByTestId } = await render(<StudentHomeScreen />);

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

  it('navigates to start screen when an available machine is pressed', async () => {
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

    const { getByLabelText } = await render(<StudentHomeScreen />);

    const availableTile = getByLabelText(/Machine 01, 6.5 kilograms, Available/);
    await act(async () => {
      fireEvent.press(availableTile);
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

    const { getByLabelText, getByText } = await render(<StudentHomeScreen />);
    expect(getByLabelText('Offline banner')).toBeTruthy();
    expect(getByText(/Offline · Last synced/)).toBeTruthy();
  });

  it('triggers sign out when log out header action is pressed', async () => {
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

    const { getByLabelText } = await render(<StudentHomeScreen />);
    await act(async () => {
      fireEvent.press(getByLabelText('Sign out'));
    });

    expect(mockSignOut).toHaveBeenCalled();
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

    const { getByTestId, getByText } = await render(<StudentHomeScreen />);
    expect(getByTestId('active-session-banner')).toBeTruthy();
    expect(getByText(/Machine 01/)).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('active-session-banner'));
    });

    expect(mockPush).toHaveBeenCalledWith('/(student)/timer/session-active-1');
  });

  it('allows students to report an issue directly from the machine tile', async () => {
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

    const { getByTestId, getByText } = await render(<StudentHomeScreen />);
    expect(getByTestId('report-issue-tile-01')).toBeTruthy();

    // Tap report issue icon on Machine 01 tile
    await act(async () => {
      fireEvent.press(getByTestId('report-issue-tile-01'));
    });

    expect(getByTestId('tile-report-issue-modal')).toBeTruthy();
    expect(getByText(/Report machine issue/)).toBeTruthy();

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

    expect(reportSpy).toHaveBeenCalledWith('m1', 'Water puddling under drum', '01');
    expect(getByTestId('tile-issue-success')).toBeTruthy();
  });
});
