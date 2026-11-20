import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CaretakerMachineLogScreen from '../[id]';
import * as washService from '@/services/wash';
import * as caretakerService from '@/services/caretaker';
import { Machine, StatusLogEntry } from '@/types';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    id: 'm1',
  }),
}));

const mockMachine: Machine = {
  id: 'm1',
  block_id: 'block-a',
  label: '03',
  capacity_kg: 7.5,
  status: 'maintenance',
  status_updated_by: 'caretaker-1',
  status_updated_at: '2026-11-20T14:30:00Z',
  note: 'Motor diagnostic scheduled',
  created_at: '',
};

const mockLogs: StatusLogEntry[] = [
  {
    id: 'log-1',
    machine_id: 'm1',
    old_status: 'available',
    new_status: 'in_use',
    changed_by: 'user-1',
    changed_at: '2026-11-20T10:00:00Z',
    profiles: { name: 'Student Alice' },
  },
  {
    id: 'log-2',
    machine_id: 'm1',
    old_status: 'in_use',
    new_status: 'maintenance',
    changed_by: 'caretaker-1',
    changed_at: '2026-11-20T14:30:00Z',
    profiles: { name: 'John Caretaker' },
  },
];

describe('CaretakerMachineLogScreen', () => {
  let queryClient: QueryClient;

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
        <CaretakerMachineLogScreen />
      </QueryClientProvider>
    );

  it('renders current machine details and audit log entries', async () => {
    jest.spyOn(washService, 'fetchMachineById').mockResolvedValue(mockMachine);
    jest.spyOn(caretakerService, 'fetchMachineStatusLogs').mockResolvedValue(mockLogs);

    const { getByText, getByTestId } = await renderScreen();

    await waitFor(() => {
      expect(getByText('Machine 03')).toBeTruthy();
      expect(getByTestId('status-logs-list')).toBeTruthy();
    });

    expect(getByText('“Motor diagnostic scheduled”')).toBeTruthy();
    expect(getByTestId('log-entry-log-1')).toBeTruthy();
    expect(getByTestId('log-entry-log-2')).toBeTruthy();
    expect(getByText(/Student Alice/)).toBeTruthy();
    expect(getByText(/John Caretaker/)).toBeTruthy();
  });

  it('renders empty state when no status changes are logged', async () => {
    jest.spyOn(washService, 'fetchMachineById').mockResolvedValue(mockMachine);
    jest.spyOn(caretakerService, 'fetchMachineStatusLogs').mockResolvedValue([]);

    const { getByTestId, getByText } = await renderScreen();

    await waitFor(() => {
      expect(getByTestId('no-logs-state')).toBeTruthy();
    });

    expect(getByText('No status changes logged')).toBeTruthy();
  });
});
