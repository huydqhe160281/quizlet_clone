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

describe('study store round answers', () => {
  const cards = ['c0', 'c1'].map((cardId) => ({
    sessionCardId: `sc-${cardId}`,
    cardId,
    front: cardId,
    back: cardId,
    example: null,
    imageUrl: null,
  }));

  beforeEach(() => {
    useStudyStore.getState().reset();
  });

  it('brings "Still learning" cards back in legacy Flashcard sessions (null settings)', () => {
    useStudyStore
      .getState()
      .initSession({ sessionId: 's1', setId: 'set-1', mode: 'FLASHCARD', cards, settings: null });
    const [first, second] = useStudyStore.getState().currentRound;

    useStudyStore.getState().recordRoundAnswer(first!, false);
    const roundEnded = useStudyStore.getState().recordRoundAnswer(second!, true);

    expect(roundEnded).toBe(true);
    expect(useStudyStore.getState().isComplete).toBe(false);
    expect(useStudyStore.getState().currentRound).toEqual([first]);
  });

  it('keeps the V1 no-requeue fallback for other legacy modes', () => {
    useStudyStore
      .getState()
      .initSession({ sessionId: 's1', setId: 'set-1', mode: 'LEARN', cards, settings: null });
    const [first, second] = useStudyStore.getState().currentRound;

    useStudyStore.getState().recordRoundAnswer(first!, false);
    useStudyStore.getState().recordRoundAnswer(second!, true);

    expect(useStudyStore.getState().isComplete).toBe(true);
  });

  it('countAsCorrect: false passes a card without counting it as correct', () => {
    useStudyStore
      .getState()
      .initSession({ sessionId: 's1', setId: 'set-1', mode: 'FLASHCARD', cards, settings: null });
    const [first] = useStudyStore.getState().currentRound;

    useStudyStore.getState().recordRoundAnswer(first!, true, { countAsCorrect: false });

    const state = useStudyStore.getState();
    expect(state.correctCount).toBe(0);
    expect(state.correctInRound).toBe(0);
    expect(state.reviewedCount).toBe(1);
    expect(state.roundEngine?.remediationQueue).toEqual([]);
  });
});
