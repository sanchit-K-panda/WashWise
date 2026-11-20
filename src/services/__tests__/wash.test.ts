import { fetchMachineById, fetchWashConfig, startWash } from '../wash';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe('Wash Service', () => {
  const machineId = 'b0000000-0000-0000-0000-000000000001';

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

    it('returns null when machine does not exist or errors', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
      });

      const machine = await fetchMachineById(machineId);
      expect(machine).toBeNull();
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

      expect(supabase.rpc).toHaveBeenCalledWith('start_wash', {
        p_machine_id: machineId,
        p_program_id: 'normal',
        p_temp: '40',
        p_spin: 'High',
        p_weight_kg: 5,
      });
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
      expect(result.error).toContain('just taken');
    });

    it('handles overload error (WW002)', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: {
          code: 'WW002',
          message: 'Load weight (8 kg) exceeds machine capacity (7 kg)',
        },
      });

      const result = await startWash(params);

      expect(result.success).toBe(false);
      expect(result.isRaceConflict).toBeFalsy();
      expect(result.error).toContain('exceeds machine capacity');
    });
  });
});
