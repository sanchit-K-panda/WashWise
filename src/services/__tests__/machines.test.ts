import { fetchMachines, fetchHostelBlock, subscribeToMachineChanges } from '../machines';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

describe('Machines Service', () => {
  const blockId = 'a0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchMachines', () => {
    it('fetches machines and attaches active sessions with computed time and progress', async () => {
      const now = new Date();
      const startedAt = new Date(now.getTime() - 20 * 60 * 1000).toISOString(); // 20m ago
      const endsAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15m remaining

      const mockMachines = [
        {
          id: 'm1',
          block_id: blockId,
          label: '01',
          capacity_kg: 7,
          status: 'available',
          status_updated_by: null,
          status_updated_at: '',
          note: null,
          created_at: '',
        },
        {
          id: 'm2',
          block_id: blockId,
          label: '02',
          capacity_kg: 7,
          status: 'in_use',
          status_updated_by: null,
          status_updated_at: '',
          note: null,
          created_at: '',
        },
        {
          id: 'm3',
          block_id: blockId,
          label: '03',
          capacity_kg: 7,
          status: 'broken',
          status_updated_by: null,
          status_updated_at: '',
          note: 'Latch fault',
          created_at: '',
        },
      ];

      const mockSessions = [
        {
          id: 's1',
          machine_id: 'm2',
          started_at: startedAt,
          ends_at: endsAt,
          status: 'running',
        },
      ];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'machines') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValueOnce({ data: mockMachines, error: null }),
          };
        }
        if (table === 'wash_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValueOnce({ data: mockSessions, error: null }),
          };
        }
        return {};
      });

      const machines = await fetchMachines(blockId);

      expect(machines).toHaveLength(3);
      // Available machine has no session
      expect(machines[0].id).toBe('m1');
      expect(machines[0].status).toBe('available');
      expect(machines[0].activeSession).toBeNull();
      expect(machines[0].timeLeftMinutes).toBeUndefined();

      // In use machine has active session and calculated time
      expect(machines[1].id).toBe('m2');
      expect(machines[1].status).toBe('in_use');
      expect(machines[1].activeSession).not.toBeNull();
      expect(machines[1].activeSession?.id).toBe('s1');
      expect(machines[1].timeLeftMinutes).toBeGreaterThanOrEqual(14);
      expect(machines[1].progressPercent).toBeGreaterThanOrEqual(50);

      // Broken machine has no session
      expect(machines[2].id).toBe('m3');
      expect(machines[2].status).toBe('broken');
      expect(machines[2].activeSession).toBeNull();
    });

    it('throws error when supabase machine query fails', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Network connection failed' },
        }),
      });

      await expect(fetchMachines(blockId)).rejects.toThrow('Network connection failed');
    });
  });

  describe('fetchHostelBlock', () => {
    it('returns hostel block when found', async () => {
      const mockBlock = {
        id: blockId,
        name: 'Block A',
        created_at: '',
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockBlock, error: null }),
      });

      const block = await fetchHostelBlock(blockId);
      expect(block).toEqual(mockBlock);
    });

    it('returns null when block is not found or errors', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
      });

      const block = await fetchHostelBlock(blockId);
      expect(block).toBeNull();
    });
  });

  describe('subscribeToMachineChanges', () => {
    it('sets up realtime channel for machines and wash sessions', () => {
      const unsubscribeMock = jest.fn();
      interface ChannelMockType {
        on: jest.Mock;
        subscribe: jest.Mock;
      }
      const channelMock: ChannelMockType = {
        on: jest.fn(),
        subscribe: jest.fn(),
      };
      channelMock.on.mockReturnValue(channelMock);
      channelMock.subscribe.mockImplementation((callback: (status: string) => void) => {
        callback('SUBSCRIBED');
        return channelMock;
      });

      (supabase.channel as jest.Mock).mockReturnValue(channelMock);
      (supabase.removeChannel as jest.Mock).mockImplementation(unsubscribeMock);

      const onChangeMock = jest.fn();
      const onStatusChangeMock = jest.fn();

      const unsubscribe = subscribeToMachineChanges(blockId, onChangeMock, onStatusChangeMock);

      expect(supabase.channel).toHaveBeenCalledWith(
        expect.stringContaining(`machines-block-${blockId}`)
      );
      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ table: 'machines' }),
        expect.any(Function)
      );
      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ table: 'wash_sessions' }),
        expect.any(Function)
      );
      expect(onStatusChangeMock).toHaveBeenCalledWith('SUBSCRIBED');

      unsubscribe();
      expect(supabase.removeChannel).toHaveBeenCalledWith(channelMock);
    });
  });
});
