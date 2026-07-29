import { describe, expect, it } from 'vitest';
import {
  isValidTimeZone,
  nextZonedDay,
  resolveTimeZoneForMath,
  startOfZonedDay,
  zonedLookbackWindow,
} from '@/server/services/learning/zoned-day';
import { DEFAULT_PREFERRED_TIMEZONE } from '@/server/services/learning/constants';

describe('zoned day helpers', () => {
  it('Scenario: UTC users unchanged', () => {
    const now = new Date('2026-07-28T15:00:00.000Z');
    const start = startOfZonedDay(now, 'UTC');
    const next = nextZonedDay(now, 'UTC');
    expect(start.toISOString()).toBe('2026-07-28T00:00:00.000Z');
    expect(next.toISOString()).toBe('2026-07-29T00:00:00.000Z');
  });

  it('Scenario: Local midnight boundary (VN)', () => {
    // 23:00 VN on 2026-07-28
    const now = new Date('2026-07-28T16:00:00.000Z');
    const start = startOfZonedDay(now, 'Asia/Ho_Chi_Minh');
    const next = nextZonedDay(now, 'Asia/Ho_Chi_Minh');
    // VN day 2026-07-28 is [2026-07-27T17:00:00Z, 2026-07-28T17:00:00Z)
    expect(start.toISOString()).toBe('2026-07-27T17:00:00.000Z');
    expect(next.toISOString()).toBe('2026-07-28T17:00:00.000Z');

    const reviewNextVnDay = new Date('2026-07-28T17:30:00.000Z');
    expect(reviewNextVnDay >= start && reviewNextVnDay < next).toBe(false);
  });

  it('Scenario: Local day includes UTC previous evening (VN)', () => {
    const now = new Date('2026-07-28T10:00:00.000Z'); // 17:00 VN
    const start = startOfZonedDay(now, 'Asia/Ho_Chi_Minh');
    const next = nextZonedDay(now, 'Asia/Ho_Chi_Minh');
    const review = new Date('2026-07-27T17:30:00.000Z'); // 00:30 VN on 28th
    expect(review >= start && review < next).toBe(true);
  });

  it('Scenario: DST spring-forward boundary', () => {
    // US DST spring-forward 2026-03-08 (America/New_York)
    const now = new Date('2026-03-08T18:00:00.000Z');
    expect(() => startOfZonedDay(now, 'America/New_York')).not.toThrow();
    expect(() => nextZonedDay(now, 'America/New_York')).not.toThrow();
    const start = startOfZonedDay(now, 'America/New_York');
    const next = nextZonedDay(now, 'America/New_York');
    expect(next.getTime()).toBeGreaterThan(start.getTime());
  });

  it('accepts Asia/Ho_Chi_Minh and UTC', () => {
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(isValidTimeZone('Not/A_Zone')).toBe(false);
  });

  it('Scenario: Corrupt stored timezone falls back for math', () => {
    expect(resolveTimeZoneForMath('Bogus/Zone')).toBe(DEFAULT_PREFERRED_TIMEZONE);
    const now = new Date('2026-07-28T15:00:00.000Z');
    expect(startOfZonedDay(now, 'Bogus/Zone').toISOString()).toBe('2026-07-28T00:00:00.000Z');
  });

  it('Scenario: Insights window uses preferred timezone', () => {
    const now = new Date('2026-07-27T15:30:00.000Z'); // 00:30 Tokyo Jul 28
    const { since, until } = zonedLookbackWindow(now, 'Asia/Tokyo', 7);
    const review = new Date('2026-07-27T15:10:00.000Z'); // 00:10 Tokyo Jul 28
    expect(review >= since && review < until).toBe(true);
  });
});
