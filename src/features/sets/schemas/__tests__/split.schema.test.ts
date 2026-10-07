import { describe, expect, it } from 'vitest';
import { splitSetSchema } from '../set.schema';

describe('splitSetSchema', () => {
  it('accepts a positive integer chunkSize', () => {
    const result = splitSetSchema.safeParse({ chunkSize: 20 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chunkSize).toBe(20);
    }
  });

  it('rejects zero, negative, and non-integer chunkSize', () => {
    expect(splitSetSchema.safeParse({ chunkSize: 0 }).success).toBe(false);
    expect(splitSetSchema.safeParse({ chunkSize: -1 }).success).toBe(false);
    expect(splitSetSchema.safeParse({ chunkSize: 1.5 }).success).toBe(false);
    expect(splitSetSchema.safeParse({}).success).toBe(false);
  });
});
