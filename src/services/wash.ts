import { supabase } from './supabase';
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

      // Check if machine is no longer available (race condition / concurrency)
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

      // Check if overloaded
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
