import { supabase } from './supabase';
import { sendCaretakerIssueAlert } from './notifications';
import { mapRpcError } from '@/lib/errors';
import {
  Machine,
  WashConfig,
  WashProgram,
  TempAdjustment,
  SpinAdjustment,
  WashSession,
  StartWashParams,
  StartWashResponse,
} from '@/types';

export interface WashSessionDetails {
  id: string;
  machine_id: string;
  user_id: string;
  program_id: string;
  temp: string;
  spin: string;
  weight_kg: number;
  started_at: string;
  ends_at: string;
  collected_at: string | null;
  status: 'running' | 'collected' | 'cancelled';
  machine?: Machine | null;
  program?: WashProgram | null;
}

/**
 * Fetches machine by ID from the machines table.
 * Throws visibly on error.
 */
export async function fetchMachineById(machineId: string): Promise<Machine | null> {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('id', machineId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to fetch machine');
  }
  return data as Machine | null;
}

/**
 * Fetches active wash programs, temperature adjustments, and spin speed adjustments.
 * Throws visibly on error — no mock or fallback data.
 */
export async function fetchWashConfig(): Promise<WashConfig> {
  const [progRes, tempRes, spinRes] = await Promise.all([
    supabase.from('wash_programs').select('*').eq('active', true).order('name'),
    supabase.from('temp_adjustments').select('*').order('minutes'),
    supabase.from('spin_adjustments').select('*').order('minutes'),
  ]);

  if (progRes.error) {
    throw new Error(progRes.error.message || 'Failed to fetch wash programs');
  }
  if (tempRes.error) {
    throw new Error(tempRes.error.message || 'Failed to fetch temp adjustments');
  }
  if (spinRes.error) {
    throw new Error(spinRes.error.message || 'Failed to fetch spin adjustments');
  }

  return {
    programs: (progRes.data || []) as WashProgram[],
    tempAdjustments: (tempRes.data || []) as TempAdjustment[],
    spinAdjustments: (spinRes.data || []) as SpinAdjustment[],
  };
}

/**
 * Invokes the atomic start_wash RPC on Supabase.
 * Checks error and throws or maps standard RPC error codes.
 */
export async function startWash(params: StartWashParams): Promise<StartWashResponse> {
  const { data, error } = await supabase.rpc('start_wash', {
    p_machine: params.machineId,
    p_program: params.programId,
    p_temp: params.temp,
    p_spin: params.spin,
    p_weight: params.weightKg,
  });

  if (error) {
    const friendlyError = mapRpcError(error, 'Failed to start wash cycle.');
    const rawMsg = error.message || '';
    return {
      success: false,
      isRaceConflict: rawMsg.includes('machine_unavailable') || rawMsg.includes('not available'),
      error: friendlyError,
    };
  }

  return {
    success: true,
    session: data as WashSession,
  };
}

/**
 * Ends a wash session via atomic RPC end_wash with outcome 'collected' | 'cancelled'.
 * All writes go through the RPC; no direct table writes.
 */
export async function endWash(
  sessionId: string,
  outcome: 'collected' | 'cancelled'
): Promise<WashSession> {
  const { data, error } = await supabase.rpc('end_wash', {
    p_session: sessionId,
    p_outcome: outcome,
  });

  if (error) {
    throw new Error(mapRpcError(error, `Failed to end wash session as ${outcome}`));
  }

  return data as WashSession;
}

/**
 * Marks a wash session as collected via RPC end_wash.
 */
export async function collectWash(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await endWash(sessionId, 'collected');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to collect wash';
    return { success: false, error: msg };
  }
}

/**
 * Cancels a wash session via RPC end_wash.
 */
export async function cancelWash(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await endWash(sessionId, 'cancelled');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to cancel wash';
    return { success: false, error: msg };
  }
}

/**
 * Submits an issue report for a machine via atomic RPC report_issue.
 * No direct table insert.
 */
export async function reportMachineIssue(
  machineId: string,
  description: string,
  machineLabel?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = description.trim();
    if (!trimmed || trimmed.length < 3) {
      return { success: false, error: 'Please enter at least 3 characters for description' };
    }

    const { error } = await supabase.rpc('report_issue', {
      p_machine: machineId,
      p_description: trimmed,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (machineLabel) {
      sendCaretakerIssueAlert(machineLabel, trimmed).catch(() => {});
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to report issue';
    return { success: false, error: msg };
  }
}

/**
 * Fetches the active running wash session for a user from the server.
 * Source of truth: wash_sessions where status='running' and user_id=me.
 */
export async function fetchActiveUserSession(userId: string): Promise<WashSessionDetails | null> {
  const { data: session, error } = await supabase
    .from('wash_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to fetch active wash session');
  }
  if (!session) return null;

  const [machineRes, progRes] = await Promise.all([
    supabase.from('machines').select('*').eq('id', session.machine_id).maybeSingle(),
    supabase.from('wash_programs').select('*').eq('id', session.program_id).maybeSingle(),
  ]);

  if (machineRes.error) throw new Error(machineRes.error.message);
  if (progRes.error) throw new Error(progRes.error.message);

  return {
    ...session,
    machine: machineRes.data as Machine | null,
    program: progRes.data as WashProgram | null,
  };
}

/**
 * Fetches full details for a session by session ID.
 */
export async function fetchSessionDetails(
  sessionIdOrMachineId: string
): Promise<WashSessionDetails | null> {
  let { data: session, error } = await supabase
    .from('wash_sessions')
    .select('*')
    .eq('id', sessionIdOrMachineId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to fetch session details');
  }

  // Fallback by machine ID for active running session
  if (!session) {
    const res = await supabase
      .from('wash_sessions')
      .select('*')
      .eq('machine_id', sessionIdOrMachineId)
      .eq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (res.error) throw new Error(res.error.message);
    session = res.data;
  }

  if (!session) return null;

  const [machineRes, progRes] = await Promise.all([
    supabase.from('machines').select('*').eq('id', session.machine_id).maybeSingle(),
    supabase.from('wash_programs').select('*').eq('id', session.program_id).maybeSingle(),
  ]);

  if (machineRes.error) throw new Error(machineRes.error.message);
  if (progRes.error) throw new Error(progRes.error.message);

  return {
    ...session,
    machine: machineRes.data as Machine | null,
    program: progRes.data as WashProgram | null,
  };
}

/**
 * Fetches completed/past wash history for a user.
 */
export async function fetchUserHistory(userId?: string): Promise<WashSessionDetails[]> {
  let query = supabase
    .from('wash_sessions')
    .select('*')
    .in('status', ['collected', 'cancelled'])
    .order('started_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(mapRpcError(error, 'Failed to fetch wash history'));
  }

  const [machinesRes, progsRes] = await Promise.all([
    supabase.from('machines').select('*'),
    supabase.from('wash_programs').select('*'),
  ]);

  const machinesMap = new Map((machinesRes.data || []).map((m) => [m.id, m]));
  const progsMap = new Map((progsRes.data || []).map((p) => [p.id, p]));

  return (data || []).map((s) => ({
    ...s,
    machine: (machinesMap.get(s.machine_id) as Machine) || null,
    program: (progsMap.get(s.program_id) as WashProgram) || null,
  }));
}
