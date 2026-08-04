import { beforeEach, describe, expect, it } from 'vitest';
import { useStudyStore } from '@/features/study/store';

describe('study store pending answers', () => {
  beforeEach(() => {
    useStudyStore.getState().reset();
  });

  it('Scenario: Answer is stamped when recorded, not when it fails', () => {
    useStudyStore.getState().addPendingAnswer('c1', true);
    const [answer] = useStudyStore.getState().pendingAnswers;
    expect(answer?.clientMutationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(typeof answer?.clientTimestamp).toBe('number');
  });

  it('Scenario: Requeued answers are prepended, preserving chronological order', () => {
    useStudyStore.getState().addPendingAnswer('newer', true);
    const newer = useStudyStore.getState().pendingAnswers[0]!;
    const older = {
      cardId: 'older',
      isCorrect: false,
      clientMutationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      clientTimestamp: 1,
    };
    useStudyStore.getState().requeuePendingAnswers([older]);
    const ids = useStudyStore.getState().pendingAnswers.map((a) => a.cardId);
    expect(ids).toEqual(['older', 'newer']);
    expect(useStudyStore.getState().pendingAnswers[0]?.clientMutationId).toBe(
      older.clientMutationId
    );
    expect(useStudyStore.getState().pendingAnswers[1]?.clientMutationId).toBe(
      newer.clientMutationId
    );
  });

  it('Scenario: Re-buffered answer keeps its original clientMutationId', () => {
    useStudyStore.getState().addPendingAnswer('c1', true);
    const original = useStudyStore.getState().pendingAnswers[0]!;
    useStudyStore.getState().clearPendingAnswers();
    useStudyStore.getState().requeuePendingAnswers([original]);
    useStudyStore.getState().requeuePendingAnswers([original]);
    const answers = useStudyStore.getState().pendingAnswers;
    expect(answers[0]?.clientMutationId).toBe(original.clientMutationId);
    expect(answers[1]?.clientMutationId).toBe(original.clientMutationId);
  });
});
