import { describe, expect, it } from 'vitest';
import { aggregateWeakSets, computeAccuracy } from '@/server/services/learning/retention-insights';
import type { LearningQueueItem } from '@/features/today/types';

describe('retention insights', () => {
  it('Scenario: Accuracy with mixed grades', () => {
    // 8 GOOD/EASY out of 10 → 0.8
    expect(computeAccuracy(8, 10)).toBe(0.8);
  });

  it('Scenario: Zero reviews window', () => {
    expect(computeAccuracy(0, 0)).toBe(0);
  });

  it('Scenario: Weak sets ranking', () => {
    const items: LearningQueueItem[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        cardId: `a-${i}`,
        setId: 'set-a',
        setTitle: 'A',
        reason: 'due' as const,
        dueDate: null,
        easeFactor: 2.0,
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        cardId: `b-${i}`,
        setId: 'set-b',
        setTitle: 'B',
        reason: 'weak' as const,
        dueDate: null,
        easeFactor: 1.8,
      })),
    ];

    const weakSets = aggregateWeakSets(items);
    expect(weakSets[0]?.setId).toBe('set-a');
    expect(weakSets[0]?.count).toBe(5);
  });

  it('Scenario: Weak sets tie-break', () => {
    const items: LearningQueueItem[] = ['c', 'd', 'e', 'f'].flatMap((id) =>
      Array.from({ length: 4 }, (_, i) => ({
        cardId: `${id}-${i}`,
        setId: `set-${id}`,
        setTitle: id.toUpperCase(),
        reason: 'due' as const,
        dueDate: null,
        easeFactor: 2.0,
      }))
    );

    const weakSets = aggregateWeakSets(items);
    expect(weakSets).toHaveLength(3);
    expect(weakSets[0]?.setId).toBe('set-c');
    expect(weakSets.map((w) => w.setId)).toEqual(['set-c', 'set-d', 'set-e']);
  });
});
