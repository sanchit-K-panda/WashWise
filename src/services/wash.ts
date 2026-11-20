import { supabase } from './supabase';
import { sendCaretakerIssueAlert } from './notifications';
import {
  Machine,
  WashConfig,
  WashProgram,
  TempAdjustment,
  SpinAdjustment,
  StartWashParams,
  StartWashResponse,
  StartWashResultPayload,
} from '@/types';

export const FALLBACK_PROGRAMS: WashProgram[] = [
  { id: 'normal', name: 'Normal', base_minutes: 35, per_kg_minutes: 2.0, active: true },
  { id: 'quick', name: 'Quick', base_minutes: 20, per_kg_minutes: 1.0, active: true },
  { id: 'heavy', name: 'Heavy', base_minutes: 45, per_kg_minutes: 3.0, active: true },
  { id: 'delicates', name: 'Delicates', base_minutes: 30, per_kg_minutes: 1.5, active: true },
  { id: 'wool', name: 'Wool', base_minutes: 35, per_kg_minutes: 1.5, active: true },
];

export const FALLBACK_TEMPS: TempAdjustment[] = [
  { temp: 'Cold', minutes: 0 },
  { temp: '30', minutes: 3 },
  { temp: '40', minutes: 5 },
  { temp: '60', minutes: 8 },
];

export const FALLBACK_SPINS: SpinAdjustment[] = [
  { spin: 'Low', minutes: 0 },
  { spin: 'Medium', minutes: 2 },
  { spin: 'High', minutes: 4 },
];

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
  status: 'running' | 'done' | 'collected' | 'cancelled';
  machine?: Machine | null;
  program?: WashProgram | null;
}

/**
 * Fetches machine by ID.
 */
export async function fetchMachineById(machineId: string): Promise<Machine | null> {
  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data as Machine;
  } catch {
    return null;
  }
}

/**
 * Fetches wash programs, temperature adjustments, and spin speed adjustments.
 */
export async function fetchWashConfig(): Promise<WashConfig> {
  try {
    const [progRes, tempRes, spinRes] = await Promise.all([
      supabase.from('wash_programs').select('*').eq('active', true),
      supabase.from('temp_adjustments').select('*'),
      supabase.from('spin_adjustments').select('*'),
    ]);

    const programs =
      progRes.data && progRes.data.length > 0 ? (progRes.data as WashProgram[]) : FALLBACK_PROGRAMS;

    const tempAdjustments =
      tempRes.data && tempRes.data.length > 0 ? (tempRes.data as TempAdjustment[]) : FALLBACK_TEMPS;

    const spinAdjustments =
      spinRes.data && spinRes.data.length > 0 ? (spinRes.data as SpinAdjustment[]) : FALLBACK_SPINS;

    return { programs, tempAdjustments, spinAdjustments };
  } catch {
    return {
      programs: FALLBACK_PROGRAMS,
      tempAdjustments: FALLBACK_TEMPS,
      spinAdjustments: FALLBACK_SPINS,
    };
  }
}

/**
 * Invokes the atomic start_wash RPC on Supabase.
 * Handles race condition when machine status changed before start.
 */
export async function startWash(params: StartWashParams): Promise<StartWashResponse> {
  try {
    const { data, error } = await supabase.rpc('start_wash', {
      p_machine_id: params.machineId,
      p_program_id: params.programId,
      p_temp: params.temp,
      p_spin: params.spin,
      p_weight_kg: params.weightKg,
    });

    if (error) {
      const msg = error.message || '';
      const code = (error as { code?: string }).code || '';

      const isRaceConflict =
        code === 'WW001' ||
        msg.toLowerCase().includes('not available') ||
        msg.toLowerCase().includes('occupied');

      if (isRaceConflict) {
        return {
          success: false,
          isRaceConflict: true,
          error: 'This machine was just taken by someone else.',
        };
      }

      const isOverload = code === 'WW002' || msg.toLowerCase().includes('exceeds machine capacity');
      if (isOverload) {
        return {
          success: false,
          error: 'Load weight exceeds machine capacity.',
        };
      }

      return {
        success: false,
        error: msg || 'Failed to start wash cycle.',
      };
    }

    return {
      success: true,
      session: data as unknown as StartWashResultPayload,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to start wash cycle';
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Marks a wash session as collected and frees the machine via RPC collect_wash.
 */
export async function collectWash(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('collect_wash', {
      p_session_id: sessionId,
    });

    if (error) {
      // Fallback: direct update in case RPC is not yet created in local test env
      const { error: sessionError } = await supabase
        .from('wash_sessions')
        .update({ status: 'collected', collected_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (sessionError) {
        return { success: false, error: sessionError.message };
      }
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to collect wash';
    return { success: false, error: msg };
  }
}

/**
 * Submits an issue report for a machine and notifies caretakers.
 */
export async function reportMachineIssue(
  machineId: string,
  description: string,
  machineLabel?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { success: false, error: 'User must be signed in to report an issue' };
    }

    const { error } = await supabase.from('issue_reports').insert({
      machine_id: machineId,
      reported_by: userData.user.id,
      description: description.trim(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Trigger push notification to caretaker
    const label = machineLabel || '01';
    sendCaretakerIssueAlert(label, description.trim()).catch(() => {});

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to report issue';
    return { success: false, error: msg };
  }
}

/**
 * Fetches the active running or done wash session for a user to restore on app restart.
 */
export async function fetchActiveUserSession(userId: string): Promise<WashSessionDetails | null> {
  try {
    const { data: session, error } = await supabase
      .from('wash_sessions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['running', 'done'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !session) return null;

    const [machineRes, progRes] = await Promise.all([
      supabase.from('machines').select('*').eq('id', session.machine_id).maybeSingle(),
      supabase.from('wash_programs').select('*').eq('id', session.program_id).maybeSingle(),
    ]);

    return {
      ...session,
      machine: machineRes.data as Machine | null,
      program: progRes.data as WashProgram | null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches full details for a session by session ID (or machine ID fallback).
 */
export async function fetchSessionDetails(
  sessionIdOrMachineId: string
): Promise<WashSessionDetails | null> {
  try {
    // 1. Try by session ID
    let { data: session } = await supabase
      .from('wash_sessions')
      .select('*')
      .eq('id', sessionIdOrMachineId)
      .maybeSingle();

    // 2. If not found by session ID, try by machine ID for latest active session
    if (!session) {
      const res = await supabase
        .from('wash_sessions')
        .select('*')
        .eq('machine_id', sessionIdOrMachineId)
        .in('status', ['running', 'done'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      session = res.data;
    }

    if (!session) return null;

    const [machineRes, progRes] = await Promise.all([
      supabase.from('machines').select('*').eq('id', session.machine_id).maybeSingle(),
      supabase.from('wash_programs').select('*').eq('id', session.program_id).maybeSingle(),
    ]);

    return {
      ...session,
      machine: machineRes.data as Machine | null,
      program: progRes.data as WashProgram | null,
    };
  } catch {
    return null;
  }
}
