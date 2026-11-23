import { supabase } from './supabase';
import { MachineWithSession, HostelBlock, MachineBoardRow } from '@/types';
import { calculateRemainingMinutes, calculateProgressPercent } from '@/lib/timer';

/**
 * Fetches all machines for the authenticated student's block from the machine_board view.
 * The machine_board view automatically filters by public.my_block() and exposes running session ends_at.
 * Throws visibly on error — no mock or fallback data.
 */
export async function fetchMachines(_blockId?: string): Promise<MachineWithSession[]> {
  const { data, error } = await supabase
    .from('machine_board')
    .select('*')
    .order('label', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch machines');
  }

  const rows = (data || []) as MachineBoardRow[];
  const now = new Date();

  return rows.map((machine) => {
    if (machine.status === 'in_use' && machine.started_at && machine.ends_at) {
      const timeLeftMinutes = calculateRemainingMinutes(machine.ends_at, now);
      const progressPercent = calculateProgressPercent(machine.started_at, machine.ends_at, now);

      return {
        ...machine,
        timeLeftMinutes,
        progressPercent,
      };
    }

    return {
      ...machine,
      timeLeftMinutes: undefined,
      progressPercent: undefined,
    };
  });
}

/**
 * Fetches hostel block metadata. Throws visibly on error.
 */
export async function fetchHostelBlock(blockId: string): Promise<HostelBlock | null> {
  const { data, error } = await supabase
    .from('hostel_blocks')
    .select('*')
    .eq('id', blockId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to fetch hostel block');
  }
  return data as HostelBlock | null;
}

/**
 * Subscribes to Supabase Realtime changes on underlying tables ('machines' and 'issue_reports').
 * Note: Realtime subscriptions attach to tables, not views.
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
        table: 'issue_reports',
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
