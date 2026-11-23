import { startWash, endWash } from '../wash';
import { updateMachineStatus, verifyMachine } from '../caretaker';
import { supabase } from '../supabase';
import { mapRpcError } from '@/lib/errors';

jest.mock('../supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      uid: jest.fn(),
    },
  },
}));

describe('Data Layer Integration Tests (RPCs & RLS Security Contracts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('start_wash RPC', () => {
    it('successfully starts a wash session when machine is available and capacity is valid', async () => {
      const mockSession = {
        id: 'session-123',
        machine_id: 'm-1',
        user_id: 'user-abc',
        program_id: 'prog-1',
        temp: '40',
        spin: 'high',
        weight_kg: 5.0,
        started_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        collected_at: null,
        status: 'running',
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await startWash({
        machineId: 'm-1',
        programId: 'prog-1',
        temp: '40',
        spin: 'high',
        weightKg: 5.0,
      });

      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
      expect(supabase.rpc).toHaveBeenCalledWith('start_wash', {
        p_machine: 'm-1',
        p_program: 'prog-1',
        p_temp: '40',
        p_spin: 'high',
        p_weight: 5.0,
      });
    });

    it('maps machine_unavailable to race conflict friendly message', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'machine_unavailable' },
      });

      const result = await startWash({
        machineId: 'm-1',
        programId: 'prog-1',
        temp: 'cold',
        spin: 'low',
        weightKg: 3.0,
      });

      expect(result.success).toBe(false);
      expect(result.isRaceConflict).toBe(true);
      expect(result.error).toBe('This machine was just taken by someone else.');
    });

    it('maps overload error when weight exceeds machine capacity', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'overload' },
      });

      const result = await startWash({
        machineId: 'm-1',
        programId: 'prog-1',
        temp: 'cold',
        spin: 'low',
        weightKg: 10.0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Load weight exceeds machine capacity.');
    });

    it('maps already_running error when user already has an active session', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'already_running' },
      });

      const result = await startWash({
        machineId: 'm-1',
        programId: 'prog-1',
        temp: 'cold',
        spin: 'low',
        weightKg: 3.0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('You already have an active wash cycle in progress.');
    });
  });

  describe('end_wash RPC', () => {
    it('successfully ends wash session with collected outcome', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'collected',
        collected_at: new Date().toISOString(),
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await endWash('session-123', 'collected');
      expect(result).toEqual(mockSession);
      expect(supabase.rpc).toHaveBeenCalledWith('end_wash', {
        p_session: 'session-123',
        p_outcome: 'collected',
      });
    });

    it('throws mapped user-friendly error on session_not_found', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'session_not_found' },
      });

      await expect(endWash('bad-session', 'collected')).rejects.toThrow(
        'Wash session could not be found.'
      );
    });
  });

  describe('set_machine_status RPC & Caretaker actions', () => {
    it('allows caretaker to update machine status and stamps verified_at', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { id: 'm-1', status: 'maintenance', note: 'Door latch issue' },
        error: null,
      });

      const result = await updateMachineStatus({
        machineId: 'm-1',
        status: 'maintenance',
        note: 'Door latch issue',
      });

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('set_machine_status', {
        p_machine: 'm-1',
        p_status: 'maintenance',
        p_note: 'Door latch issue',
      });
    });

    it('rejects student attempting to call set_machine_status with forbidden error', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'forbidden' },
      });

      const result = await updateMachineStatus({
        machineId: 'm-1',
        status: 'broken',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to perform this action.');
    });

    it('verifies machine status without modifying status via verify_machine', async () => {
      const verifiedMachine = {
        id: 'm-1',
        status: 'available',
        verified_at: new Date().toISOString(),
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: verifiedMachine,
        error: null,
      });

      const result = await verifyMachine('m-1');
      expect(result.success).toBe(true);
      expect(result.machine).toEqual(verifiedMachine);
      expect(supabase.rpc).toHaveBeenCalledWith('verify_machine', {
        p_machine: 'm-1',
      });
    });
  });

  describe('RLS & Security Policy Contracts', () => {
    it('prohibits direct table updates on machines', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: {
              code: '42501',
              message: 'permission denied for table machines',
            },
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const res = await supabase.from('machines').update({ status: 'broken' }).eq('id', 'm-1');
      expect(res.error).toBeTruthy();
      expect(res.error?.code).toBe('42501');
    });

    it('prohibits students from changing their own role in profiles', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: {
              code: '42501',
              message: 'permission denied for column role of relation profiles',
            },
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const res = await supabase.from('profiles').update({ role: 'caretaker' }).eq('id', 'u-1');
      expect(res.error).toBeTruthy();
      expect(res.error?.code).toBe('42501');
    });
  });

  describe('mapRpcError helper', () => {
    it('correctly maps all known error codes', () => {
      expect(mapRpcError('machine_unavailable')).toBe(
        'This machine was just taken by someone else.'
      );
      expect(mapRpcError('overload')).toBe('Load weight exceeds machine capacity.');
      expect(mapRpcError('already_running')).toBe(
        'You already have an active wash cycle in progress.'
      );
      expect(mapRpcError('forbidden')).toBe('You do not have permission to perform this action.');
      expect(mapRpcError('session_not_found')).toBe('Wash session could not be found.');
      expect(mapRpcError('unknown_error_code', 'Default fallback')).toBe('unknown_error_code');
    });
  });
});
