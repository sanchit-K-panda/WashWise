import {
  fetchMachineById,
  fetchWashConfig,
  startWash,
  collectWash,
  cancelWash,
  reportMachineIssue,
  fetchActiveUserSession,
  fetchSessionDetails,
} from '../wash';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('Wash Service', () => {
  const machineId = 'b0000000-0000-0000-0000-000000000001';
  const sessionId = 'session-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchMachineById', () => {
    it('returns machine details when machine exists', async () => {
      const mockMachine = {
        id: machineId,
        label: '01',
        capacity_kg: 7,
        status: 'available',
        block_id: 'block-1',
        status_updated_by: null,
        status_updated_at: '',
        verified_at: null,
        verified_by: null,
        note: null,
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockMachine, error: null }),
      });

      const machine = await fetchMachineById(machineId);
      expect(machine).toEqual(mockMachine);
    });

    it('throws when supabase returns error', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValueOnce({ data: null, error: { message: 'Database error' } }),
      });

      await expect(fetchMachineById(machineId)).rejects.toThrow('Database error');
    });
  });

  describe('fetchWashConfig', () => {
    it('returns wash programs, temp and spin adjustments', async () => {
      const mockPrograms = [
        { id: 'prog-1', name: 'Normal', base_minutes: 35, per_kg_minutes: 2, active: true },
      ];
      const mockTemps = [
        { temp: 'cold', minutes: 0 },
        { temp: '40', minutes: 8 },
      ];
      const mockSpins = [
        { spin: 'low', minutes: 0 },
        { spin: 'high', minutes: 5 },
      ];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'wash_programs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValueOnce({ data: mockPrograms, error: null }),
          };
        }
        if (table === 'temp_adjustments') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValueOnce({ data: mockTemps, error: null }),
          };
        }
        if (table === 'spin_adjustments') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValueOnce({ data: mockSpins, error: null }),
          };
        }
        return {};
      });

      const config = await fetchWashConfig();
      expect(config.programs).toEqual(mockPrograms);
      expect(config.tempAdjustments).toEqual(mockTemps);
      expect(config.spinAdjustments).toEqual(mockSpins);
    });
  });

  describe('startWash', () => {
    const params = {
      machineId,
      programId: 'prog-1',
      temp: '40',
      spin: 'high',
      weightKg: 5,
    };

    it('calls start_wash RPC and returns session payload on success', async () => {
      const mockSession = {
        id: 'sess-123',
        machine_id: machineId,
        user_id: 'user-1',
        program_id: 'prog-1',
        temp: '40',
        spin: 'high',
        weight_kg: 5,
        started_at: '2026-11-20T10:00:00Z',
        ends_at: '2026-11-20T10:48:00Z',
        collected_at: null,
        status: 'running',
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await startWash(params);
      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
      expect(supabase.rpc).toHaveBeenCalledWith('start_wash', {
        p_machine: machineId,
        p_program: 'prog-1',
        p_temp: '40',
        p_spin: 'high',
        p_weight: 5,
      });
    });

    it('detects race condition when machine is unavailable', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: {
          message: 'machine_unavailable',
        },
      });

      const result = await startWash(params);
      expect(result.success).toBe(false);
      expect(result.isRaceConflict).toBe(true);
    });

    it('detects overload when weight exceeds capacity', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: {
          message: 'overload',
        },
      });

      const result = await startWash(params);
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds machine capacity');
    });
  });

  describe('endWash and collectWash', () => {
    it('calls end_wash RPC with outcome collected', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { id: sessionId, status: 'collected' },
        error: null,
      });

      const result = await collectWash(sessionId);
      expect(supabase.rpc).toHaveBeenCalledWith('end_wash', {
        p_session: sessionId,
        p_outcome: 'collected',
      });
      expect(result.success).toBe(true);
    });

    it('calls end_wash RPC with outcome cancelled', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { id: sessionId, status: 'cancelled' },
        error: null,
      });

      const result = await cancelWash(sessionId);
      expect(supabase.rpc).toHaveBeenCalledWith('end_wash', {
        p_session: sessionId,
        p_outcome: 'cancelled',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('reportMachineIssue', () => {
    it('calls report_issue RPC with machine and description', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { id: 'issue-1', machine_id: machineId },
        error: null,
      });

      const result = await reportMachineIssue(machineId, 'Door latch broken');
      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('report_issue', {
        p_machine: machineId,
        p_description: 'Door latch broken',
      });
    });
  });

  describe('fetchActiveUserSession and fetchSessionDetails', () => {
    it('fetches active user session with machine and program details', async () => {
      const mockSession = {
        id: sessionId,
        machine_id: machineId,
        program_id: 'prog-1',
        status: 'running',
        started_at: '2026-11-20T10:00:00Z',
        ends_at: '2026-11-20T10:40:00Z',
      };
      const mockMachine = { id: machineId, label: '01' };
      const mockProgram = { id: 'prog-1', name: 'Normal' };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'wash_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockSession, error: null }),
          };
        }
        if (table === 'machines') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockMachine, error: null }),
          };
        }
        if (table === 'wash_programs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockProgram, error: null }),
          };
        }
        return {};
      });

      const session = await fetchActiveUserSession('user-1');
      expect(session).not.toBeNull();
      expect(session?.id).toBe(sessionId);
      expect(session?.machine).toEqual(mockMachine);
      expect(session?.program).toEqual(mockProgram);

      const sessionById = await fetchSessionDetails(sessionId);
      expect(sessionById).not.toBeNull();
      expect(sessionById?.id).toBe(sessionId);
    });
  });
});
