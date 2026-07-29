import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { APP_NAV_ITEMS } from '@/lib/navigation/navigation-data';

function loadTodayKeys(locale: string): Set<string> {
  const raw = JSON.parse(
    readFileSync(path.join(process.cwd(), 'messages', locale, 'today.json'), 'utf-8')
  ) as { todayPage: Record<string, string> };
  return new Set(Object.keys(raw.todayPage).map((k) => `todayPage.${k}`));
}

describe('Today i18n & nav', () => {
  it('Scenario: Locale catalog parity', () => {
    const en = loadTodayKeys('en');
    const vi = loadTodayKeys('vi');
    const ja = loadTodayKeys('ja');
    expect([...en].sort()).toEqual([...vi].sort());
    expect([...en].sort()).toEqual([...ja].sort());
  });

  it('Scenario: Locale catalog parity (new keys)', () => {
    const en = loadTodayKeys('en');
    expect(en.has('todayPage.timezoneLabel')).toBe(true);
    expect(en.has('todayPage.startSetSessionFocus')).toBe(true);
    expect(en.has('todayPage.streakUtcNote')).toBe(true);
  });

  it('Scenario: Today visible in nav', () => {
    const today = APP_NAV_ITEMS.find((item) => item.id === 'today');
    expect(today).toBeDefined();
    expect(today?.href).toBe('/today');
    expect(today?.labelKey).toBe('nav.today');
  });
});
