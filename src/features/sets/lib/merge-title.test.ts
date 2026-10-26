import { describe, expect, it } from 'vitest';
import { SET_TITLE_MAX } from '@/features/sets/schemas/set.schema';
import { suggestMergedTitle } from './merge-title';

describe('suggestMergedTitle', () => {
  it('collapses parts of the same split into one title', () => {
    expect(suggestMergedTitle(['Vocab (3/5)', 'Vocab (1/5)', 'Vocab (2/5)'])).toBe(
      'Vocab (1, 2, 3/5)'
    );
  });

  it('joins unrelated titles with a plus sign', () => {
    expect(suggestMergedTitle(['Animals', 'Food (1/2)'])).toBe('Animals + Food (1/2)');
    expect(suggestMergedTitle(['A (1/5)', 'A (2/4)'])).toBe('A (1/5) + A (2/4)');
  });

  it('keeps the result within the title limit', () => {
    const long = 'x'.repeat(SET_TITLE_MAX);
    expect(suggestMergedTitle([long, long])).toHaveLength(SET_TITLE_MAX);
    const merged = suggestMergedTitle([`${'y'.repeat(195)} (1/9)`, `${'y'.repeat(195)} (2/9)`]);
    expect(merged.length).toBeLessThanOrEqual(SET_TITLE_MAX);
    expect(merged.endsWith(' (1, 2/9)')).toBe(true);
  });

  it('returns an empty title when nothing is selected', () => {
    expect(suggestMergedTitle([])).toBe('');
  });
});
