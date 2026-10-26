import { describe, expect, it } from 'vitest';
import { MAX_MERGE_SETS, mergeSetsSchema } from '../set.schema';

describe('mergeSetsSchema', () => {
  it('accepts two or more set ids and defaults removeDuplicates to true', () => {
    const result = mergeSetsSchema.safeParse({ setIds: ['a', 'b'], title: '  Vocab  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Vocab');
      expect(result.data.removeDuplicates).toBe(true);
    }
  });

  it('rejects too few or too many sets', () => {
    expect(mergeSetsSchema.safeParse({ setIds: ['a'], title: 'x' }).success).toBe(false);
    const tooMany = Array.from({ length: MAX_MERGE_SETS + 1 }, (_, index) => `set-${index}`);
    expect(mergeSetsSchema.safeParse({ setIds: tooMany, title: 'x' }).success).toBe(false);
  });

  it('requires a non-blank title', () => {
    expect(mergeSetsSchema.safeParse({ setIds: ['a', 'b'], title: '   ' }).success).toBe(false);
    expect(mergeSetsSchema.safeParse({ setIds: ['a', 'b'] }).success).toBe(false);
  });
});
