/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isCoarsePointer, isTextEntryElement } from '@/lib/utils/touch';

describe('isCoarsePointer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reflects the (pointer: coarse) media query', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' }));
    expect(isCoarsePointer()).toBe(true);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(isCoarsePointer()).toBe(false);
  });
});

describe('isTextEntryElement', () => {
  it.each(['text', 'search', 'email', 'number', 'password'])(
    'treats input[type=%s] as text entry',
    (type) => {
      const input = document.createElement('input');
      input.type = type;
      expect(isTextEntryElement(input)).toBe(true);
    }
  );

  it('treats textarea as text entry', () => {
    expect(isTextEntryElement(document.createElement('textarea'))).toBe(true);
  });

  it.each(['checkbox', 'range', 'radio'])('ignores input[type=%s]', (type) => {
    const input = document.createElement('input');
    input.type = type;
    expect(isTextEntryElement(input)).toBe(false);
  });

  it('ignores buttons and null', () => {
    expect(isTextEntryElement(document.createElement('button'))).toBe(false);
    expect(isTextEntryElement(null)).toBe(false);
  });
});
