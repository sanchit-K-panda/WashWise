import { supabase } from './supabase';
import { MachineWithSession, HostelBlock, Machine, WashSession } from '@/types';
import { calculateRemainingMinutes, calculateProgressPercent } from '@/lib/timer';

/**
 * Fetches all machines in a hostel block with active wash sessions and computed remaining time.
 */
export async function fetchMachines(blockId: string): Promise<MachineWithSession[]> {
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

    const machines = (machinesRes.data || []) as Machine[];
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
    const message = err instanceof Error ? err.message : 'Failed to fetch machines';
    throw new Error(message);
  }
}

/**
 * Fetches hostel block metadata (name, etc.).
 */
export async function fetchHostelBlock(blockId: string): Promise<HostelBlock | null> {
  try {
    const { data, error } = await supabase
      .from('hostel_blocks')
      .select('*')
      .eq('id', blockId)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data as HostelBlock | null;
  } catch {
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
