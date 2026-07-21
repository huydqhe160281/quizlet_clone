import { describe, it, expect } from 'vitest';
import { t } from '../t';
import { loadCatalog } from '../catalog';

describe('t', () => {
  it('Scenario: Translate nested key', () => {
    const catalog = loadCatalog('en');
    expect(t(catalog, 'app.name')).toBe('QuizFree');
  });

  it('Scenario: Interpolate values', () => {
    const catalog = loadCatalog('en');
    expect(t(catalog, 'greeting', { name: 'Ada' })).toBe('Hello Ada');
  });

  it('Scenario: Missing key returns the key', () => {
    const catalog = loadCatalog('en');
    expect(t(catalog, 'missing.key')).toBe('missing.key');
  });
});
