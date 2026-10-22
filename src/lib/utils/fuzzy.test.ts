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

  it('treats Vietnamese tone marks as meaningful', () => {
    expect(fuzzyMatch('má', 'mà')).toBe(false);
    expect(fuzzyMatch('ma', 'mà')).toBe(false);
    expect(fuzzyMatch('con meo', 'con mèo')).toBe(false);
    expect(fuzzyMatch('đất nuớc', 'đất nước')).toBe(false);
  });

  it('treats Japanese dakuten/handakuten as meaningful', () => {
    expect(fuzzyMatch('かき', 'かぎ')).toBe(false);
    expect(fuzzyMatch('はん', 'ぱん')).toBe(false);
  });

  it('still tolerates case, spacing, and ordinary typos with diacritics intact', () => {
    expect(fuzzyMatch('  Đất   Nước ', 'đất nước')).toBe(true);
    expect(fuzzyMatch('thành phố hồ chí mnh', 'thành phố hồ chí minh')).toBe(true);
  });

  it('matches regardless of Unicode composition (NFC vs NFD input)', () => {
    expect(fuzzyMatch('mà'.normalize('NFD'), 'mà'.normalize('NFC'))).toBe(true);
  });

  it('test_fuzzy_match_wrong: rejects unrelated answers', () => {
    expect(fuzzyMatch('dictator', 'democracy')).toBe(false);
    expect(fuzzySimilarity('dictator', 'democracy')).toBeLessThan(0.85);
  });
});
