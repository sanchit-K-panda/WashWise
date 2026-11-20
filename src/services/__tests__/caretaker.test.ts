import {
  updateMachineStatus,
  forceClearMachine,
  fetchMachineStatusLogs,
  fetchBlockIssues,
  resolveIssue,
} from '../caretaker';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'caretaker-1' } } }),
    },
  },
}));

describe('Caretaker Service', () => {
  const machineId = 'b0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateMachineStatus', () => {
    it('calls verify_machine_status RPC with machineId, status, and note', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const result = await updateMachineStatus({
        machineId,
        status: 'maintenance',
        note: 'Filter cleaning in progress',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('verify_machine_status', {
        p_machine_id: machineId,
        p_status: 'maintenance',
        p_note: 'Filter cleaning in progress',
      });
      expect(result.success).toBe(true);
    });

    it('falls back to direct table update if RPC returns error', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC not found' },
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValueOnce({ error: null }),
        }),
      });

      const result = await updateMachineStatus({
        machineId,
        status: 'broken',
        note: 'Door latch cracked',
      });

      expect(supabase.from).toHaveBeenCalledWith('machines');
      expect(result.success).toBe(true);
    });
  });

  describe('forceClearMachine', () => {
    it('calls force_clear_machine RPC', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const result = await forceClearMachine({
        machineId,
        reason: 'Clothes abandoned after cycle',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('force_clear_machine', {
        p_machine_id: machineId,
        p_reason: 'Clothes abandoned after cycle',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('fetchMachineStatusLogs', () => {
    it('fetches ordered status log entries for a machine', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          machine_id: machineId,
          old_status: 'available',
          new_status: 'in_use',
          changed_by: 'student-1',
          changed_at: '2026-11-20T10:00:00Z',
          profiles: { name: 'Student One' },
        },
      ];

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValueOnce({ data: mockLogs, error: null }),
          }),
        }),
      });

      const logs = await fetchMachineStatusLogs(machineId);
      expect(logs).toEqual(mockLogs);
      expect(supabase.from).toHaveBeenCalledWith('status_log');
    });
  });

  describe('fetchBlockIssues and resolveIssue', () => {
    it('fetches open issue reports', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          machine_id: machineId,
          reported_by: 'student-1',
          description: 'Door locked',
          resolved_at: null,
        },
      ];

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValueOnce({ data: mockIssues, error: null }),
          }),
        }),
      });

      const issues = await fetchBlockIssues('block-1');
      expect(issues).toEqual(mockIssues);
    });

    it('resolves issue report', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValueOnce({ error: null }),
        }),
      });

      const result = await resolveIssue('issue-1');
      expect(result.success).toBe(true);
    });
  });
});
