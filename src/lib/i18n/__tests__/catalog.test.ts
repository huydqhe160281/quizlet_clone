import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../catalog';

describe('loadCatalog', () => {
  it('Scenario: Load active locale only', () => {
    expect(loadCatalog('en').greeting).toBe('Hello {name}');
    expect(loadCatalog('ja').greeting).toBe('こんにちは {name}');
    expect(loadCatalog('vi').greeting).toBe('Xin chào {name}');
  });

  it('Scenario: Missing locale falls back to Vietnamese', () => {
    expect(loadCatalog('xx').greeting).toBe('Xin chào {name}');
  });
});
