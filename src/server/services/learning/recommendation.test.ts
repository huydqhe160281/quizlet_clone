import { describe, expect, it } from 'vitest';
import { buildRecommendation } from '@/server/services/learning/recommendation';
import type { LearningQueueItem } from '@/features/today/types';

const item = (
  cardId: string,
  setId: string,
  reason: LearningQueueItem['reason'] = 'due'
): LearningQueueItem => ({
  cardId,
  setId,
  setTitle: setId,
  reason,
  dueDate: null,
  easeFactor: 2.0,
});

describe('recommendation', () => {
  it('Scenario: Multi-set due prefers spaced', () => {
    const items = [item('1', 'set-a'), item('2', 'set-b')];
    const rec = buildRecommendation(items, 2);
    expect(rec.kind).toBe('spaced');
    expect(rec.href).toBe('/study?source=today');
  });

  it('Scenario: Single-set dominance prefers set session', () => {
    const items = Array.from({ length: 10 }, (_, i) => item(`c-${i}`, 'set-a'));
    const rec = buildRecommendation(items, 10);
    expect(rec.kind).toBe('set-session');
    expect(rec.setId).toBe('set-a');
    expect(rec.mode).toBe('LEARN');
    expect(rec.href).toBe('/sets/set-a/learn');
  });

  it('Scenario: Single weak card still resolves to set-session', () => {
    const items = [item('w-1', 'set-a', 'weak')];
    const rec = buildRecommendation(items, 1);
    expect(rec.kind).toBe('set-session');
    expect(rec.setId).toBe('set-a');
  });

  it('Scenario: Two sets with lopsided counts still prefers spaced', () => {
    const items = [
      ...Array.from({ length: 29 }, (_, i) => item(`a-${i}`, 'set-a')),
      item('b-0', 'set-b'),
    ];
    const rec = buildRecommendation(items, 30);
    expect(rec.kind).toBe('spaced');
  });

  it('Scenario: Empty queue', () => {
    const rec = buildRecommendation([], 0);
    expect(rec.kind).toBe('empty');
    expect(rec.href).toBe('/sets');
  });

  it('Scenario: No auto-create on Today load', () => {
    // buildRecommendation is pure — no createSession side effect.
    const rec = buildRecommendation([item('1', 'set-a')], 1);
    expect(rec.kind).toBe('set-session');
    expect(typeof rec).toBe('object');
  });

  it('Scenario: Reused endpoint only', () => {
    const rec = buildRecommendation([item('1', 'set-a')], 1);
    expect(rec.href).toBe('/sets/set-a/learn');
    // Client must POST /api/v1/study/sessions — recommendation never invents a new endpoint.
    expect(rec.href.includes('/api/')).toBe(false);
  });
});
