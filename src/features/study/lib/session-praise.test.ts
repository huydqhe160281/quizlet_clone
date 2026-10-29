import { describe, expect, it } from 'vitest';
import { praiseKey, praiseTier } from './session-praise';

describe('praiseTier', () => {
  it.each([
    [0, 'start'],
    [24, 'start'],
    [25, 'quarter'],
    [49, 'quarter'],
    [50, 'half'],
    [74, 'half'],
    [75, 'great'],
    [99, 'great'],
    [100, 'perfect'],
  ])('maps %i%% to %s', (percent, tier) => {
    expect(praiseTier(percent)).toBe(tier);
  });
});

describe('praiseKey', () => {
  it('picks one of three variants from the seed', () => {
    expect(praiseKey(100, 0)).toBe('study.praise.perfect1');
    expect(praiseKey(60, 0.5)).toBe('study.praise.half2');
    expect(praiseKey(10, 0.999)).toBe('study.praise.start3');
  });
});
