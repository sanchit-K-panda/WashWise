import { Tables, Views, WashSessionStatus, MachineStatus } from './database';

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
export type MachineBoardRow = Views<'machine_board'>;

export interface StatusLogEntry extends StatusLog {
  profiles?: {
    name: string | null;
  } | null;
}

export interface VerifyMachineParams {
  machineId: string;
  status: MachineStatus;
  note?: string | null;
}

export interface ForceClearMachineParams {
  machineId: string;
  reason?: string;
}

export interface ResolveIssueParams {
  issueId: string;
  resultingMachineStatus?: MachineStatus | null;
  resolutionNote?: string | null;
}

export interface IssueReportWithMachine extends IssueReport {
  machines?: {
    id: string;
    label: string;
    block_id: string;
    status: MachineStatus;
  } | null;
}

export interface ActiveWashSession {
  id: string;
  machine_id: string;
  started_at: string;
  ends_at: string;
  status: WashSessionStatus;
}

export interface MachineWithSession extends MachineBoardRow {
  activeSession?: ActiveWashSession | null;
  timeLeftMinutes?: number;
  progressPercent?: number;
}

export interface WashConfig {
  programs: WashProgram[];
  tempAdjustments: TempAdjustment[];
  spinAdjustments: SpinAdjustment[];
}

export interface StartWashParams {
  machineId: string;
  programId: string;
  temp: string;
  spin: string;
  weightKg: number;
}

export interface StartWashResultPayload {
  session_id: string;
  machine_id: string;
  machine_label: string;
  program_name: string;
  duration_minutes: number;
  started_at: string;
  ends_at: string;
  status: string;
}

export interface StartWashResponse {
  success: boolean;
  session?: StartWashResultPayload | WashSession;
  error?: string;
  isRaceConflict?: boolean;
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
