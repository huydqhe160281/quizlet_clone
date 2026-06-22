import { describe, expect, it } from 'vitest';
import { fuzzyMatch, fuzzySimilarity, jaroWinkler } from '@/lib/utils/fuzzy';

describe('fuzzy matching', () => {
  it('test_fuzzy_match_exact: matches identical answers', () => {
    expect(fuzzyMatch('đất nước', 'đất nước')).toBe(true);
    expect(jaroWinkler('hello', 'hello')).toBe(1);
  });

  it('test_fuzzy_match_typo: tolerates minor typos', () => {
    const similarity = fuzzySimilarity('democarcy', 'democracy');
    expect(similarity).toBeGreaterThanOrEqual(0.85);
    expect(fuzzyMatch('democarcy', 'democracy')).toBe(true);
  });

  it('test_fuzzy_match_wrong: rejects unrelated answers', () => {
    expect(fuzzyMatch('dictator', 'democracy')).toBe(false);
    expect(fuzzySimilarity('dictator', 'democracy')).toBeLessThan(0.85);
  });
});
