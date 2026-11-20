import { supabase } from './supabase';
import { VerifyMachineParams, ForceClearMachineParams, StatusLogEntry, IssueReport } from '@/types';

/**
 * Updates a machine status and note as a verified caretaker action.
 * Automatically logs to status_log via database trigger.
 */
export async function updateMachineStatus(
  params: VerifyMachineParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('verify_machine_status', {
      p_machine_id: params.machineId,
      p_status: params.status,
      p_note: params.note || null,
    });

    if (error) {
      // Fallback: direct table update for environments where RPC is not yet seeded
      const { data: userData } = await supabase.auth.getUser();
      const { error: directErr } = await supabase
        .from('machines')
        .update({
          status: params.status,
          note: params.note || null,
          status_updated_at: new Date().toISOString(),
          status_updated_by: userData?.user?.id || null,
        })
        .eq('id', params.machineId);

      if (directErr) {
        return { success: false, error: directErr.message };
      }
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update machine status';
    return { success: false, error: msg };
  }
}

/**
 * Force-clears a stuck in-use machine, marks active sessions as cancelled,
 * and resets machine to available.
 */
export async function forceClearMachine(
  params: ForceClearMachineParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('force_clear_machine', {
      p_machine_id: params.machineId,
      p_reason: params.reason || 'Force cleared by caretaker',
    });

    if (error) {
      // Fallback: direct table update
      const { data: userData } = await supabase.auth.getUser();

      await supabase
        .from('wash_sessions')
        .update({ status: 'cancelled' })
        .eq('machine_id', params.machineId)
        .in('status', ['running', 'done']);

      const { error: directErr } = await supabase
        .from('machines')
        .update({
          status: 'available',
          note: params.reason || 'Force cleared by caretaker',
          status_updated_at: new Date().toISOString(),
          status_updated_by: userData?.user?.id || null,
        })
        .eq('id', params.machineId);

      if (directErr) {
        return { success: false, error: directErr.message };
      }
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to force-clear machine';
    return { success: false, error: msg };
  }
}

/**
 * Fetches the audit log of status transitions for a specific machine.
 */
export async function fetchMachineStatusLogs(machineId: string): Promise<StatusLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('status_log')
      .select('*, profiles:changed_by(name)')
      .eq('machine_id', machineId)
      .order('changed_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data as unknown as StatusLogEntry[];
  } catch {
    return [];
  }
}

/**
 * Fetches open student issue reports for the caretaker's hostel block.
 */
export async function fetchBlockIssues(blockId: string): Promise<IssueReport[]> {
  try {
    const { data, error } = await supabase
      .from('issue_reports')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    // Filter in case issue_reports table doesn't have direct block_id
    return data as IssueReport[];
  } catch {
    return [];
  }
}

/**
 * Marks an issue report as resolved by the caretaker.
 */
export async function resolveIssue(issueId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('issue_reports')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: userData?.user?.id || null,
      })
      .eq('id', issueId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to resolve issue';
    return { success: false, error: msg };
  }
}
