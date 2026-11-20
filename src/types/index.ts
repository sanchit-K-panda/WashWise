export type MachineStatus = 'available' | 'in_use' | 'broken' | 'maintenance';
export type UserRole = 'student' | 'caretaker';
export type WashSessionStatus = 'running' | 'done' | 'collected' | 'cancelled';

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  hostel_block_id: string | null;
}

export interface HostelBlock {
  id: string;
  name: string;
}

export interface Machine {
  id: string;
  block_id: string;
  label: string;
  capacity_kg: number;
  status: MachineStatus;
  status_updated_by: string | null;
  status_updated_at: string;
  note: string | null;
}

export interface WashProgram {
  id: string;
  name: string;
  base_minutes: number;
  per_kg_minutes: number;
  active: boolean;
}

export interface TempAdjustment {
  temp: string;
  minutes: number;
}

export interface SpinAdjustment {
  spin: string;
  minutes: number;
}

export interface WashSession {
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
  status: WashSessionStatus;
}

export interface IssueReport {
  id: string;
  machine_id: string;
  reported_by: string;
  description: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface StatusLog {
  id: string;
  machine_id: string;
  old_status: MachineStatus;
  new_status: MachineStatus;
  changed_by: string;
  changed_at: string;
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
