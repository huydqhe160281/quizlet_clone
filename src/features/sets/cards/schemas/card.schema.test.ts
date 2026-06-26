import { describe, expect, it } from 'vitest';
import { createCardSchema, updateCardSchema } from './card.schema';

describe('card.schema type field', () => {
  it('createCardSchema accepts new-word type', () => {
    const result = createCardSchema.parse({
      front: '大',
      back: 'big',
      type: 'new-word',
    });
    expect(result.type).toBe('new-word');
  });

  it('createCardSchema accepts null type', () => {
    const result = createCardSchema.parse({
      front: '大',
      back: 'big',
      type: null,
    });
    expect(result.type).toBeNull();
  });

  it('createCardSchema rejects invalid type', () => {
    expect(() =>
      createCardSchema.parse({
        front: '大',
        back: 'big',
        type: 'invalid',
      })
    ).toThrow();
  });

  it('updateCardSchema accepts type updates', () => {
    expect(updateCardSchema.parse({ type: 'new-word' }).type).toBe('new-word');
    expect(updateCardSchema.parse({ type: null }).type).toBeNull();
  });

  it('updateCardSchema does not default type on empty patch', () => {
    expect(updateCardSchema.parse({})).toEqual({});
  });
});
