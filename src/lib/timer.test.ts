import {
  calculateWashDuration,
  formatDuration,
  formatRemainingTime,
  calculateRemainingMinutes,
  calculateProgressPercent,
} from './timer';

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

describe('calculateRemainingMinutes', () => {
  it('calculates remaining minutes correctly when cycle is active', () => {
    const now = new Date('2026-11-20T10:00:00Z');
    const endsAt = new Date('2026-11-20T10:14:30Z');

    const remaining = calculateRemainingMinutes(endsAt, now);
    expect(remaining).toBe(15); // ceiling of 14.5 minutes
  });

  it('returns 0 when cycle has ended or is past endsAt', () => {
    const now = new Date('2026-11-20T10:30:00Z');
    const endsAt = new Date('2026-11-20T10:20:00Z');

    expect(calculateRemainingMinutes(endsAt, now)).toBe(0);
  });

  it('handles invalid dates gracefully returning 0', () => {
    expect(calculateRemainingMinutes('invalid-date')).toBe(0);
  });
});

describe('calculateProgressPercent', () => {
  it('calculates progress percentage accurately', () => {
    const startedAt = new Date('2026-11-20T10:00:00Z');
    const endsAt = new Date('2026-11-20T10:50:00Z'); // 50 min total
    const now = new Date('2026-11-20T10:25:00Z'); // 25 min elapsed (50%)

    expect(calculateProgressPercent(startedAt, endsAt, now)).toBe(50);
  });

  it('returns 0 if current time is before or at start', () => {
    const startedAt = new Date('2026-11-20T10:00:00Z');
    const endsAt = new Date('2026-11-20T10:50:00Z');
    const now = new Date('2026-11-20T09:55:00Z');

    expect(calculateProgressPercent(startedAt, endsAt, now)).toBe(0);
  });

  it('caps at 100% when current time is after endsAt', () => {
    const startedAt = new Date('2026-11-20T10:00:00Z');
    const endsAt = new Date('2026-11-20T10:50:00Z');
    const now = new Date('2026-11-20T11:00:00Z');

    expect(calculateProgressPercent(startedAt, endsAt, now)).toBe(100);
  });

  it('returns 0 for invalid inputs', () => {
    expect(calculateProgressPercent('invalid', 'date')).toBe(0);
  });
});
