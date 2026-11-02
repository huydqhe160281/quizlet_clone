import { describe, expect, it } from 'vitest';
import { APP_NAV_ITEMS, STUDY_NAV_ENABLED } from '@/lib/navigation/navigation-data';

describe('APP_NAV_ITEMS', () => {
  it('exports primary navigation entries', () => {
    const expectedHrefs = [
      '/dashboard',
      '/sets',
      ...(STUDY_NAV_ENABLED ? ['/study'] : []),
      '/search',
      '/library',
    ];
    expect(APP_NAV_ITEMS).toHaveLength(expectedHrefs.length);
    expect(APP_NAV_ITEMS.map((item) => item.href)).toEqual(expectedHrefs);
  });

  it('assigns unique guideTargetId values', () => {
    const ids = APP_NAV_ITEMS.map((item) => item.guideTargetId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
