import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERRED_TIMEZONE,
  isValidTimeZone,
  resolveTimeZoneForMath,
  zonedCalendarDay,
} from '@/server/services/learning/zoned-day';

describe('zoned day helpers', () => {
  it('Scenario: Local day includes UTC previous evening (VN)', () => {
    const review = new Date('2026-07-27T17:30:00.000Z'); // 00:30 VN on 28th
    expect(zonedCalendarDay(review, 'Asia/Ho_Chi_Minh').toISOString()).toBe(
      '2026-07-28T00:00:00.000Z'
    );
  });

  it('Scenario: DST spring-forward boundary', () => {
    // US DST spring-forward 2026-03-08 (America/New_York)
    const now = new Date('2026-03-08T18:00:00.000Z');
    expect(zonedCalendarDay(now, 'America/New_York').toISOString()).toBe(
      '2026-03-08T00:00:00.000Z'
    );
  });

  it('accepts Asia/Ho_Chi_Minh and UTC', () => {
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(isValidTimeZone('Not/A_Zone')).toBe(false);
  });

  it('Scenario: Corrupt stored timezone falls back for math', () => {
    expect(resolveTimeZoneForMath('Bogus/Zone')).toBe(DEFAULT_PREFERRED_TIMEZONE);
    const now = new Date('2026-07-28T23:00:00.000Z');
    expect(zonedCalendarDay(now, 'Bogus/Zone').toISOString()).toBe('2026-07-28T00:00:00.000Z');
  });

  it('zonedCalendarDay: encodes the local date as UTC midnight', () => {
    const instant = new Date('2026-10-27T23:00:00.000Z'); // 06:00 Oct 28 in Vietnam
    expect(zonedCalendarDay(instant, 'Asia/Ho_Chi_Minh').toISOString()).toBe(
      '2026-10-28T00:00:00.000Z'
    );
    expect(zonedCalendarDay(instant, 'UTC').toISOString()).toBe('2026-10-27T00:00:00.000Z');
  });
});
