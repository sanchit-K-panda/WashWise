import React from 'react';
import { render, fireEvent, waitFor, act, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CaretakerHomeScreen from '../index';
import * as useAuthModule from '@/hooks/useAuth';
import * as useMachinesModule from '@/hooks/useMachines';
import * as caretakerService from '@/services/caretaker';
import { MachineWithSession, HostelBlock, IssueReport } from '@/types';

const mockPush = jest.fn();
const mockSignOut = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

const mockBlock: HostelBlock = {
  id: 'block-a',
  name: 'Block A',
};

const mockMachines: MachineWithSession[] = [
  {
    id: 'm1',
    block_id: 'block-a',
    label: '01',
    capacity_kg: 7,
    status: 'available',
    status_updated_at: '2026-11-20T10:30:00Z',
    verified_at: null,
    note: null,
    started_at: null,
    ends_at: null,
    is_finished: false,
  },
  {
    id: 'm2',
    block_id: 'block-a',
    label: '02',
    capacity_kg: 7,
    status: 'in_use',
    status_updated_at: '2026-11-20T09:15:00Z',
    verified_at: null,
    note: null,
    started_at: '2026-11-20T09:15:00Z',
    ends_at: '2026-11-20T10:00:00Z',
    is_finished: false,
    timeLeftMinutes: 20,
  },
  {
    id: 'm3',
    block_id: 'block-a',
    label: '03',
    capacity_kg: 8,
    status: 'broken',
    status_updated_at: '',
    verified_at: null,
    note: 'Door latch fault',
    started_at: null,
    ends_at: null,
    is_finished: false,
  },
];

const mockIssues: IssueReport[] = [
  {
    id: 'issue-1',
    machine_id: 'm3',
    reported_by: 'student-1',
    description: 'Drum not spinning during cycle',
    created_at: '2026-11-20T10:00:00Z',
    resolved_at: null,
    resolved_by: null,
  },
];

describe('CaretakerHomeScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    jest.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'caretaker-1' } as never,
      profile: {
        id: 'caretaker-1',
        name: 'John Caretaker',
        role: 'caretaker',
        hostel_block_id: 'block-a',
      },
      session: {} as never,
      role: 'caretaker',
      isLoading: false,
      error: null,
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithPassword: jest.fn(),
      signUpWithPassword: jest.fn(),
      signOut: mockSignOut,
      refreshProfile: jest.fn(),
    });

    jest.spyOn(caretakerService, 'fetchBlockIssues').mockResolvedValue(mockIssues);
    jest.spyOn(caretakerService, 'updateMachineStatus').mockResolvedValue({ success: true });
    jest.spyOn(caretakerService, 'forceClearMachine').mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  const renderScreen = async () =>
    await render(
      <QueryClientProvider client={queryClient}>
        <CaretakerHomeScreen />
      </QueryClientProvider>
    );

  it('renders machine list with machine labels and verified stamps', async () => {
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 3,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const { getByText, getByTestId } = await renderScreen();

    expect(getByText('Machine verification')).toBeTruthy();
    expect(getByTestId('caretaker-machine-row-01')).toBeTruthy();
    expect(getByTestId('caretaker-machine-row-02')).toBeTruthy();
    expect(getByTestId('caretaker-machine-row-03')).toBeTruthy();
    expect(getByText(/Not verified today/)).toBeTruthy();
  });

  it('renders empty state when no machines are registered in this hostel block', async () => {
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: [],
      block: mockBlock,
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
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const { getByTestId, getByText } = await renderScreen();

    expect(getByTestId('no-machines-state')).toBeTruthy();
    expect(getByText('No machines found')).toBeTruthy();
    expect(getByText('No washing machines are registered in this hostel block.')).toBeTruthy();
  });

  it('opens bottom sheet when a machine is tapped', async () => {
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 3,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const { getByTestId, getByText } = await renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('caretaker-machine-row-01'));
    });

    expect(getByTestId('verification-bottom-sheet')).toBeTruthy();
    expect(getByText('Machine 01')).toBeTruthy();
    expect(getByTestId('status-option-available')).toBeTruthy();
    expect(getByTestId('status-option-maintenance')).toBeTruthy();
    expect(getByTestId('status-option-broken')).toBeTruthy();
  });

  it('optimistically updates machine status on save', async () => {
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 3,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const updateSpy = jest
      .spyOn(caretakerService, 'updateMachineStatus')
      .mockResolvedValue({ success: true });

    const { getByTestId } = await renderScreen();

    // Open sheet for Machine 01
    await act(async () => {
      fireEvent.press(getByTestId('caretaker-machine-row-01'));
    });

    // Select Maintenance
    await act(async () => {
      fireEvent.press(getByTestId('status-option-maintenance'));
    });

    // Type a note
    await act(async () => {
      fireEvent.changeText(getByTestId('caretaker-note-input'), 'Routine maintenance');
    });

    // Save
    await act(async () => {
      fireEvent.press(getByTestId('save-verification-button'));
    });

    expect(updateSpy).toHaveBeenCalledWith({
      machineId: 'm1',
      status: 'maintenance',
      note: 'Routine maintenance',
    });
  });

  it('shows force-clear option for stuck in-use machine and executes force-clear', async () => {
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 3,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const forceClearSpy = jest
      .spyOn(caretakerService, 'forceClearMachine')
      .mockResolvedValue({ success: true });

    const { getByTestId } = await renderScreen();

    // Open sheet for Machine 02 (which is in_use)
    await act(async () => {
      fireEvent.press(getByTestId('caretaker-machine-row-02'));
    });

    expect(getByTestId('force-clear-card')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('force-clear-button'));
    });

    expect(forceClearSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        machineId: 'm2',
      })
    );
  });

  it('switches to issue reports tab and displays open issues', async () => {
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 3,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const { getByTestId, getByText } = await renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('tab-issues'));
    });

    await waitFor(() => {
      expect(getByTestId('issue-card-issue-1')).toBeTruthy();
    });

    expect(getByText('Drum not spinning during cycle')).toBeTruthy();
  });

  it('allows caretaker to resolve an issue report and update machine status', async () => {
    jest.spyOn(useMachinesModule, 'useMachines').mockReturnValue({
      machines: mockMachines,
      block: mockBlock,
      totalCount: 3,
      availableCount: 1,
      inUseCount: 1,
      brokenCount: 1,
      maintenanceCount: 0,
      isLoading: false,
      isRefetching: false,
      isError: false,
      error: null,
      isOffline: false,
      lastSyncedAt: new Date(),
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    const resolveSpy = jest
      .spyOn(caretakerService, 'resolveIssue')
      .mockResolvedValue({ success: true });

    const { getByTestId, getByText } = await renderScreen();

    // Switch to issues tab
    await act(async () => {
      fireEvent.press(getByTestId('tab-issues'));
    });

    await waitFor(() => {
      expect(getByTestId('resolve-issue-issue-1')).toBeTruthy();
    });

    // Tap Resolve Issue button
    await act(async () => {
      fireEvent.press(getByTestId('resolve-issue-issue-1'));
    });

    expect(getByTestId('resolve-issue-modal')).toBeTruthy();
    expect(getByText('Resolve issue')).toBeTruthy();

    // Select Available (Free) resulting status
    await act(async () => {
      fireEvent.press(getByTestId('resolve-status-available'));
    });

    // Enter note
    await act(async () => {
      fireEvent.changeText(getByTestId('resolve-note-input'), 'Motor belt realigned');
    });

    // Confirm resolution
    await act(async () => {
      fireEvent.press(getByTestId('confirm-resolve-issue-button'));
    });

    expect(resolveSpy).toHaveBeenCalledWith({
      issueId: 'issue-1',
      resultingMachineStatus: 'available',
      resolutionNote: 'Motor belt realigned',
    });
  });
});
