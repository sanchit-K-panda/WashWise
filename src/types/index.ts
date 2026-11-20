import { Tables, WashSessionStatus } from './database';

export * from './database';

export type Profile = Tables<'profiles'>;
export type HostelBlock = Tables<'hostel_blocks'>;
export type Machine = Tables<'machines'>;
export type WashProgram = Tables<'wash_programs'>;
export type TempAdjustment = Tables<'temp_adjustments'>;
export type SpinAdjustment = Tables<'spin_adjustments'>;
export type WashSession = Tables<'wash_sessions'>;
export type IssueReport = Tables<'issue_reports'>;
export type StatusLog = Tables<'status_log'>;

export interface ActiveWashSession {
  id: string;
  machine_id: string;
  started_at: string;
  ends_at: string;
  status: WashSessionStatus;
}

export interface MachineWithSession extends Machine {
  activeSession?: ActiveWashSession | null;
  timeLeftMinutes?: number;
  progressPercent?: number;
}

export interface TimerCalculationParams {
  baseMinutes: number;
  perKgMinutes: number;
  weightKg: number;
  capacityKg: number;
  tempMinutes?: number;
  spinMinutes?: number;
  startedAt?: Date;
}

export interface TimerCalculationResult {
  durationMinutes: number;
  endsAt: Date;
  isValid: boolean;
  isOverloaded: boolean;
  error?: string;
}
