import { describe, expect, it } from 'vitest';
import { APP_NAV_ITEMS } from '@/lib/navigation-data';

describe('APP_NAV_ITEMS', () => {
  it('exports five primary navigation entries', () => {
    expect(APP_NAV_ITEMS).toHaveLength(5);
    expect(APP_NAV_ITEMS.map((item) => item.href)).toEqual([
      '/dashboard',
      '/sets',
      '/study',
      '/search',
      '/library',
    ]);
  });

  it('assigns unique guideTargetId values', () => {
    const ids = APP_NAV_ITEMS.map((item) => item.guideTargetId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
