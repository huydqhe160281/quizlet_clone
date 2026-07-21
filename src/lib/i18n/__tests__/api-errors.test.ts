import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../catalog';
import { t } from '../t';

describe('localized API errors', () => {
  it('Scenario: Validation error in resolved locale', () => {
    const catalog = loadCatalog('ja');
    expect(t(catalog, 'errors.validation')).toContain('入力');
  });

  it('Scenario: Unsupported locale falls back to Vietnamese', () => {
    const catalog = loadCatalog('fr');
    expect(t(catalog, 'errors.generic')).toBe('Đã xảy ra lỗi');
  });
});
