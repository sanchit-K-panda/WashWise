import { supabase } from './supabase';
import { mapRpcError } from '@/lib/errors';
import {
  VerifyMachineParams,
  ForceClearMachineParams,
  StatusLogEntry,
  IssueReportWithMachine,
  ResolveIssueParams,
  Machine,
  IssueReport,
} from '@/types';

/**
 * Updates a machine status and note as a verified caretaker action via RPC set_machine_status.
 * Also stamps verification and cancels any running session if machine status is changed.
 * All writes go through the RPC; no direct table writes.
 */
export async function updateMachineStatus(
  params: VerifyMachineParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('set_machine_status', {
      p_machine: params.machineId,
      p_status: params.status,
      p_note: params.note || null,
    });

    if (error) {
      return { success: false, error: mapRpcError(error, 'Failed to update machine status') };
    }

    return { success: true };
  } catch (err) {
    const msg = mapRpcError(err, 'Failed to update machine status');
    return { success: false, error: msg };
  }
}

/**
 * Caretaker action: "Status is correct, just verify" via RPC verify_machine.
 * Stamps verified_at and verified_by on the machine row without modifying status.
 */
export async function verifyMachine(
  machineId: string
): Promise<{ success: boolean; error?: string; machine?: Machine }> {
  try {
    const { data, error } = await supabase.rpc('verify_machine', {
      p_machine: machineId,
    });

    if (error) {
      return { success: false, error: mapRpcError(error, 'Failed to verify machine') };
    }

    return { success: true, machine: data as Machine };
  } catch (err) {
    const msg = mapRpcError(err, 'Failed to verify machine');
    return { success: false, error: msg };
  }
}

/**
 * Force-clears a stuck in-use machine via RPC set_machine_status to 'available'.
 * Automatically cancels any running sessions and sets verified_at.
 */
export async function forceClearMachine(
  params: ForceClearMachineParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('set_machine_status', {
      p_machine: params.machineId,
      p_status: 'available',
      p_note: params.reason || 'Force cleared by caretaker',
    });

    if (error) {
      return { success: false, error: mapRpcError(error, 'Failed to force-clear machine') };
    }

    return { success: true };
  } catch (err) {
    const msg = mapRpcError(err, 'Failed to force-clear machine');
    return { success: false, error: msg };
  }
}

/**
 * Fetches the audit log of status transitions for a specific machine.
 * Throws visibly on error.
 */
export async function fetchMachineStatusLogs(machineId: string): Promise<StatusLogEntry[]> {
  const { data, error } = await supabase
    .from('status_log')
    .select('*, profiles:changed_by(name)')
    .eq('machine_id', machineId)
    .order('changed_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch machine audit logs');
  }

  return (data || []) as unknown as StatusLogEntry[];
}

/**
 * Fetches open student issue reports for the caretaker's hostel block.
 * Throws visibly on error — no mock or fallback data.
 */
export async function fetchBlockIssues(blockId: string): Promise<IssueReportWithMachine[]> {
  const { data, error } = await supabase
    .from('issue_reports')
    .select('*, machines!inner(id, label, block_id, status)')
    .eq('machines.block_id', blockId)
    .is('resolved_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch issue reports');
  }

  return (data || []) as unknown as IssueReportWithMachine[];
}

/**
 * Marks an issue report as resolved by the caretaker via atomic RPC resolve_issue,
 * with optional machine status update and note.
 * No direct table writes.
 */
export async function resolveIssue(
  params: ResolveIssueParams | string
): Promise<{ success: boolean; error?: string; report?: IssueReport }> {
  try {
    const issueId = typeof params === 'string' ? params : params.issueId;
    const resultingStatus = typeof params === 'object' ? params.resultingMachineStatus : null;
    const resolutionNote = typeof params === 'object' ? params.resolutionNote : null;

    const { data, error } = await supabase.rpc('resolve_issue', {
      p_report: issueId,
      p_new_status: resultingStatus || null,
      p_note: resolutionNote || null,
    });

    if (error) {
      return { success: false, error: mapRpcError(error, 'Failed to resolve issue') };
    }

    return { success: true, report: data as IssueReport };
  } catch (err) {
    const msg = mapRpcError(err, 'Failed to resolve issue');
    return { success: false, error: msg };
  }
}
