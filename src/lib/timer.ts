import { TimerCalculationParams, TimerCalculationResult } from '@/types';

/**
 * Pure business logic for wash duration calculation.
 * Formula from PRD.md:
 * duration = base(program) + tempAdj(temp) + spinAdj(spin) + loadAdj(weight, machine.capacity_kg)
 * Overload (> capacity) blocks Start.
 */
export function calculateWashDuration(params: TimerCalculationParams): TimerCalculationResult {
  const {
    baseMinutes,
    perKgMinutes,
    weightKg,
    capacityKg,
    tempMinutes = 0,
    spinMinutes = 0,
    startedAt = new Date(),
  } = params;

  if (weightKg <= 0) {
    return {
      durationMinutes: 0,
      endsAt: startedAt,
      isValid: false,
      isOverloaded: false,
      error: 'Weight must be greater than 0 kg',
    };
  }

  if (weightKg > capacityKg) {
    return {
      durationMinutes: 0,
      endsAt: startedAt,
      isValid: false,
      isOverloaded: true,
      error: `Load weight (${weightKg} kg) exceeds machine capacity (${capacityKg} kg)`,
    };
  }

  const loadMinutes = Math.round(weightKg * perKgMinutes);
  const totalMinutes = Math.max(1, baseMinutes + tempMinutes + spinMinutes + loadMinutes);
  const endsAt = new Date(startedAt.getTime() + totalMinutes * 60 * 1000);

  return {
    durationMinutes: totalMinutes,
    endsAt,
    isValid: true,
    isOverloaded: false,
  };
}

/**
 * Formats duration into a readable "XX min" string.
 */
export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

/**
 * Formats time remaining in mm:ss for tabular display.
 */
export function formatRemainingTime(remainingSeconds: number): string {
  if (remainingSeconds <= 0) {
    return '00:00';
  }
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculates remaining minutes until endsAt from a reference time.
 * Returns 0 if already expired.
 */
export function calculateRemainingMinutes(endsAt: string | Date, now: Date = new Date()): number {
  const endMs = new Date(endsAt).getTime();
  const currentMs = now.getTime();
  if (isNaN(endMs) || endMs <= currentMs) {
    return 0;
  }
  return Math.ceil((endMs - currentMs) / (60 * 1000));
}

/**
 * Calculates the progress percentage (0 to 100) of a wash cycle.
 */
export function calculateProgressPercent(
  startedAt: string | Date,
  endsAt: string | Date,
  now: Date = new Date()
): number {
  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endsAt).getTime();
  const currentMs = now.getTime();

  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    return 0;
  }

  const totalDuration = endMs - startMs;
  const elapsed = currentMs - startMs;

  if (elapsed <= 0) return 0;
  if (elapsed >= totalDuration) return 100;

  return Math.round((elapsed / totalDuration) * 100);
}
