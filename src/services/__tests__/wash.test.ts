import {
  fetchMachineById,
  fetchWashConfig,
  startWash,
  collectWash,
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
        note: null,
        created_at: '',
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockMachine, error: null }),
      });

      const machine = await fetchMachineById(machineId);
      expect(machine).toEqual(mockMachine);
    });
  });

  describe('fetchWashConfig', () => {
    it('returns wash programs, temp and spin adjustments', async () => {
      const mockPrograms = [
        { id: 'normal', name: 'Normal', base_minutes: 35, per_kg_minutes: 2, active: true },
      ];
      const mockTemps = [
        { temp: 'Cold', minutes: 0 },
        { temp: '40', minutes: 5 },
      ];
      const mockSpins = [
        { spin: 'Low', minutes: 0 },
        { spin: 'High', minutes: 4 },
      ];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'wash_programs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValueOnce({ data: mockPrograms, error: null }),
          };
        }
        if (table === 'temp_adjustments') {
          return {
            select: jest.fn().mockResolvedValueOnce({ data: mockTemps, error: null }),
          };
        }
        if (table === 'spin_adjustments') {
          return {
            select: jest.fn().mockResolvedValueOnce({ data: mockSpins, error: null }),
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
      programId: 'normal',
      temp: '40',
      spin: 'High',
      weightKg: 5,
    };

    it('calls start_wash RPC and returns session payload on success', async () => {
      const mockSession = {
        session_id: 'sess-123',
        machine_id: machineId,
        machine_label: '01',
        program_name: 'Normal',
        duration_minutes: 48,
        started_at: '2026-11-20T10:00:00Z',
        ends_at: '2026-11-20T10:48:00Z',
        status: 'running',
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await startWash(params);
      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
    });

    it('detects race condition when machine is already occupied (WW001)', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: {
          code: 'WW001',
          message: 'Machine is not available (current status: in_use)',
        },
      });

      const result = await startWash(params);
      expect(result.success).toBe(false);
      expect(result.isRaceConflict).toBe(true);
    });
  });

  describe('collectWash', () => {
    it('calls collect_wash RPC and returns success', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const result = await collectWash(sessionId);
      expect(supabase.rpc).toHaveBeenCalledWith('collect_wash', {
        p_session_id: sessionId,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('reportMachineIssue', () => {
    it('inserts issue report for machine when user is signed in', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockResolvedValueOnce({ error: null }),
      });

      const result = await reportMachineIssue(machineId, 'Door latch broken');
      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('issue_reports');
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
            in: jest.fn().mockReturnThis(),
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
