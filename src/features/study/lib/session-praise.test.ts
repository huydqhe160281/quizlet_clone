import { describe, expect, it } from 'vitest';
import { praiseKey, praisePercent, praiseTier } from './session-praise';

describe('praiseTier', () => {
  it.each([
    [0, 'low'],
    [20, 'low'],
    [39, 'low'],
    [40, 'fair'],
    [59, 'fair'],
    [60, 'good'],
    [70, 'good'],
    [79, 'good'],
    [80, 'great'],
    [99, 'great'],
    [100, 'perfect'],
  ])('maps %i%% to %s', (percent, tier) => {
    expect(praiseTier(percent)).toBe(tier);
  });
});

describe('praisePercent', () => {
  it('scores correct answers over answered ones', () => {
    expect(praisePercent(7, 10)).toBe(70);
    expect(praiseTier(praisePercent(2, 3))).toBe('good');
    expect(praiseTier(praisePercent(9, 10))).toBe('great');
  });

  it('is 0 when nothing was answered', () => {
    expect(praisePercent(0, 0)).toBe(0);
  });
});

describe('praiseKey', () => {
  it('picks one of three session variants from the seed', () => {
    expect(praiseKey(100, 0)).toBe('study.praise.perfect1');
    expect(praiseKey(60, 0.5)).toBe('study.praise.good2');
    expect(praiseKey(10, 0.999)).toBe('study.praise.low3');
  });

  it('uses the round catalog with four variants', () => {
    expect(praiseKey(100, 0, 'round')).toBe('study.roundPraise.perfect1');
    expect(praiseKey(70, 0.5, 'round')).toBe('study.roundPraise.good3');
    expect(praiseKey(20, 0.999, 'round')).toBe('study.roundPraise.low4');
  });

  it('rotates the variant by step so consecutive rounds differ', () => {
    const keys = [0, 1, 2, 3, 4].map((step) => praiseKey(70, 0.6, 'round', step));
    expect(keys).toEqual([
      'study.roundPraise.good3',
      'study.roundPraise.good4',
      'study.roundPraise.good1',
      'study.roundPraise.good2',
      'study.roundPraise.good3',
    ]);
  });

  it('clamps an out-of-range seed', () => {
    expect(praiseKey(50, 1, 'round')).toBe('study.roundPraise.fair4');
    expect(praiseKey(50, -0.1, 'round')).toBe('study.roundPraise.fair1');
  });
});
