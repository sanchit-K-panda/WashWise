import { supabase } from './supabase';
import { MachineWithSession, HostelBlock, MachineBoardRow } from '@/types';
import { calculateRemainingMinutes, calculateProgressPercent } from '@/lib/timer';

let isMachineBoardAvailable: boolean | null = null;

async function fetchDirectMachines(): Promise<MachineWithSession[]> {
  const query = supabase.from('machines');
  if (!query || typeof query.select !== 'function') {
    return [];
  }

  const { data, error } = await query.select('*').order('label', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch machines');
  }

  return ((data as unknown as any[]) || []).map((machine) => ({
    id: machine.id as string,
    block_id: machine.block_id as string,
    label: machine.label as string,
    capacity_kg: machine.capacity_kg as number,
    status: machine.status,
    status_updated_at: machine.status_updated_at as string,
    verified_at: (machine.verified_at ?? null) as string | null,
    note: (machine.note ?? null) as string | null,
    is_finished: null,
    ends_at: null,
    started_at: null,
    session_user_id: null,
    timeLeftMinutes: undefined,
    progressPercent: undefined,
  })) as MachineWithSession[];
}

/**
 * Fetches all machines for the authenticated user's block.
 * Tries machine_board view first (has session join); falls back to direct machines table.
 * RLS on the machines table filters by block automatically via my_block().
 * Throws visibly on error — no mock or fallback data.
 */
export async function fetchMachines(_blockId?: string): Promise<MachineWithSession[]> {
  // If we already know machine_board view does not exist in DB, query machines table directly
  if (isMachineBoardAvailable === false) {
    return fetchDirectMachines();
  }

  // Try machine_board view first (has session join)
  const { data: viewData, error: viewError } = await supabase
    .from('machine_board' as any)
    .select('*')
    .order('label', { ascending: true });

  // If view exists and has no error, use it
  if (!viewError) {
    isMachineBoardAvailable = true;
    const rows = (viewData as unknown as MachineBoardRow[]) || [];
    const now = new Date();

    return rows.map((machine) => {
      if (machine.status === 'in_use' && machine.started_at && machine.ends_at) {
        const timeLeftMinutes = calculateRemainingMinutes(machine.ends_at, now);
        const progressPercent = calculateProgressPercent(machine.started_at, machine.ends_at, now);
        return { ...machine, timeLeftMinutes, progressPercent };
      }
      return { ...machine, timeLeftMinutes: undefined, progressPercent: undefined };
    }) as MachineWithSession[];
  }

  // If error is NOT a missing view in schema cache, throw immediately
  if (
    viewError.code !== 'PGRST205' &&
    !viewError.message?.toLowerCase().includes('schema cache') &&
    !viewError.message?.toLowerCase().includes('could not find the table')
  ) {
    throw new Error(viewError.message || 'Failed to fetch machines');
  }

  // Remember that view is not present to avoid repeated 404 network roundtrips
  isMachineBoardAvailable = false;
  return fetchDirectMachines();
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
 * Fetches the first available hostel block (used when profile has no block assigned).
 */
export async function fetchFirstBlock(): Promise<HostelBlock | null> {
  const { data, error } = await supabase
    .from('hostel_blocks')
    .select('*')
    .order('name', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return null;
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
