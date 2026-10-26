/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { isImeComposing } from '@/lib/utils/keyboard';

describe('isImeComposing', () => {
  it('detects composition via isComposing or keyCode 229', () => {
    expect(isImeComposing(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true }))).toBe(
      true
    );
    expect(isImeComposing(new KeyboardEvent('keydown', { key: 'Process', keyCode: 229 }))).toBe(
      true
    );
  });

  it('is false for a plain Enter', () => {
    expect(isImeComposing(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false);
  });
});
