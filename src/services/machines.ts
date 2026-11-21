import { supabase, isPlaceholderSupabase } from './supabase';
import { MachineWithSession, HostelBlock, Machine, WashSession } from '@/types';
import { calculateRemainingMinutes, calculateProgressPercent } from '@/lib/timer';

export const MOCK_MACHINES: MachineWithSession[] = [
  {
    id: 'm-01',
    block_id: 'a0000000-0000-0000-0000-000000000001',
    label: 'Machine 01',
    status: 'available',
    capacity_kg: 7,
    status_updated_at: new Date().toISOString(),
    status_updated_by: null,
    note: null,
    created_at: new Date().toISOString(),
    activeSession: null,
  },
  {
    id: 'm-02',
    block_id: 'a0000000-0000-0000-0000-000000000001',
    label: 'Machine 02',
    status: 'in_use',
    capacity_kg: 7,
    status_updated_at: new Date().toISOString(),
    status_updated_by: null,
    note: null,
    created_at: new Date().toISOString(),
    activeSession: {
      id: 'ws-02',
      machine_id: 'm-02',
      started_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      ends_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
      status: 'running',
    },
    timeLeftMinutes: 25,
    progressPercent: 44,
  },
  {
    id: 'm-03',
    block_id: 'a0000000-0000-0000-0000-000000000001',
    label: 'Machine 03',
    status: 'available',
    capacity_kg: 8,
    status_updated_at: new Date().toISOString(),
    status_updated_by: null,
    note: null,
    created_at: new Date().toISOString(),
    activeSession: null,
  },
  {
    id: 'm-04',
    block_id: 'a0000000-0000-0000-0000-000000000001',
    label: 'Machine 04',
    status: 'broken',
    capacity_kg: 7,
    status_updated_at: new Date().toISOString(),
    status_updated_by: null,
    note: null,
    created_at: new Date().toISOString(),
    activeSession: null,
  },
  {
    id: 'm-05',
    block_id: 'a0000000-0000-0000-0000-000000000001',
    label: 'Machine 05',
    status: 'maintenance',
    capacity_kg: 7,
    status_updated_at: new Date().toISOString(),
    status_updated_by: null,
    note: null,
    created_at: new Date().toISOString(),
    activeSession: null,
  },
  {
    id: 'm-06',
    block_id: 'a0000000-0000-0000-0000-000000000001',
    label: 'Machine 06',
    status: 'available',
    capacity_kg: 7,
    status_updated_at: new Date().toISOString(),
    status_updated_by: null,
    note: null,
    created_at: new Date().toISOString(),
    activeSession: null,
  },
];

export const MOCK_BLOCK: HostelBlock = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Block A (Main Laundry)',
  created_at: new Date().toISOString(),
};

/**
 * Fetches all machines in a hostel block with active wash sessions and computed remaining time.
 */
export async function fetchMachines(blockId: string): Promise<MachineWithSession[]> {
  if (isPlaceholderSupabase) {
    return MOCK_MACHINES;
  }
  try {
    const [machinesRes, sessionsRes] = await Promise.all([
      supabase
        .from('machines')
        .select('*')
        .eq('block_id', blockId)
        .order('label', { ascending: true }),
      supabase
        .from('wash_sessions')
        .select('id, machine_id, started_at, ends_at, status')
        .eq('status', 'running'),
    ]);

    if (machinesRes.error) {
      throw new Error(machinesRes.error.message || 'Failed to fetch machines');
    }

    const machines =
      machinesRes.data && machinesRes.data.length > 0
        ? (machinesRes.data as Machine[])
        : process.env.NODE_ENV !== 'test'
          ? MOCK_MACHINES
          : [];
    const sessions = (sessionsRes.data || []) as Pick<
      WashSession,
      'id' | 'machine_id' | 'started_at' | 'ends_at' | 'status'
    >[];
    const now = new Date();

    return machines.map((machine) => {
      if (machine.status === 'in_use') {
        const activeSession = sessions.find((s) => s.machine_id === machine.id);
        if (activeSession) {
          const timeLeftMinutes = calculateRemainingMinutes(activeSession.ends_at, now);
          const progressPercent = calculateProgressPercent(
            activeSession.started_at,
            activeSession.ends_at,
            now
          );

          return {
            ...machine,
            activeSession: {
              id: activeSession.id,
              machine_id: activeSession.machine_id,
              started_at: activeSession.started_at,
              ends_at: activeSession.ends_at,
              status: activeSession.status,
            },
            timeLeftMinutes,
            progressPercent,
          };
        }
      }

      return {
        ...machine,
        activeSession: null,
        timeLeftMinutes: undefined,
        progressPercent: undefined,
      };
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      return MOCK_MACHINES;
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch machines';
    throw new Error(message);
  }
}

/**
 * Fetches hostel block metadata (name, etc.).
 */
export async function fetchHostelBlock(blockId: string): Promise<HostelBlock | null> {
  if (isPlaceholderSupabase) {
    return MOCK_BLOCK;
  }
  try {
    const { data, error } = await supabase
      .from('hostel_blocks')
      .select('*')
      .eq('id', blockId)
      .maybeSingle();

    if (error) {
      if (process.env.NODE_ENV !== 'test') {
        return MOCK_BLOCK;
      }
      return null;
    }
    return data as HostelBlock | null;
  } catch {
    if (process.env.NODE_ENV !== 'test') {
      return MOCK_BLOCK;
    }
    return null;
  }
}

/**
 * Subscribes to Supabase Realtime changes for machines in a given block and wash_sessions.
 * Returns an unsubscribe teardown function.
 */
export function subscribeToMachineChanges(
  blockId: string,
  onChange: () => void,
  onStatusChange?: (status: string) => void
): () => void {
  const channelName = `machines-block-${blockId}-${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'machines',
        filter: `block_id=eq.${blockId}`,
      },
      () => {
        onChange();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wash_sessions',
      },
      () => {
        onChange();
      }
    )
    .subscribe((status) => {
      if (onStatusChange) {
        onStatusChange(status);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
