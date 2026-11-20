import { calculateWashDuration, formatDuration, formatRemainingTime } from './timer';

describe('calculateWashDuration', () => {
  const baseParams = {
    baseMinutes: 30,
    perKgMinutes: 2,
    weightKg: 4,
    capacityKg: 7,
    tempMinutes: 5,
    spinMinutes: 3,
    startedAt: new Date('2026-11-20T10:00:00Z'),
  };

  it('calculates duration correctly with all adjustments', () => {
    // 30 (base) + 5 (temp) + 3 (spin) + (4 * 2 = 8 load) = 46 minutes
    const result = calculateWashDuration(baseParams);

    expect(result.isValid).toBe(true);
    expect(result.isOverloaded).toBe(false);
    expect(result.durationMinutes).toBe(46);
    expect(result.endsAt.toISOString()).toBe('2026-11-20T10:46:00.000Z');
  });

  it('blocks start when load weight exceeds machine capacity', () => {
    const overloadedParams = {
      ...baseParams,
      weightKg: 8,
      capacityKg: 7,
    };

    const result = calculateWashDuration(overloadedParams);

    expect(result.isValid).toBe(false);
    expect(result.isOverloaded).toBe(true);
    expect(result.error).toContain('exceeds machine capacity');
  });

  it('blocks start when load weight is zero or negative', () => {
    const invalidParams = {
      ...baseParams,
      weightKg: 0,
    };

    const result = calculateWashDuration(invalidParams);

    expect(result.isValid).toBe(false);
    expect(result.isOverloaded).toBe(false);
    expect(result.error).toContain('greater than 0');
  });

  it('handles optional temp and spin adjustments defaulting to 0', () => {
    const minimalParams = {
      baseMinutes: 20,
      perKgMinutes: 1.5,
      weightKg: 2,
      capacityKg: 6,
      startedAt: new Date('2026-11-20T12:00:00Z'),
    };

    // 20 + 0 + 0 + round(2 * 1.5 = 3) = 23
    const result = calculateWashDuration(minimalParams);

    expect(result.isValid).toBe(true);
    expect(result.durationMinutes).toBe(23);
    expect(result.endsAt.toISOString()).toBe('2026-11-20T12:23:00.000Z');
  });
});

describe('formatDuration and formatRemainingTime', () => {
  it('formats duration in minutes', () => {
    expect(formatDuration(48)).toBe('48 min');
  });

  it('formats remaining seconds in mm:ss format', () => {
    expect(formatRemainingTime(125)).toBe('02:05');
    expect(formatRemainingTime(0)).toBe('00:00');
    expect(formatRemainingTime(-10)).toBe('00:00');
  });
});
