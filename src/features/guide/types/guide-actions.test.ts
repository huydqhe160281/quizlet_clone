import { describe, expect, it } from 'vitest';
import { noopGuideActions } from '@/features/guide/types/guide-actions';

describe('guide actions', () => {
  it('noop handlers do not throw', () => {
    expect(() => noopGuideActions.highlight('nav-sets')).not.toThrow();
    expect(() => noopGuideActions.navigate('/sets')).not.toThrow();
  });
});
