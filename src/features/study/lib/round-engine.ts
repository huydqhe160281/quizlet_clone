/**
 * Round Engine — pure, side-effect-free round queue logic.
 *
 * Implements the batched study algorithm from design-brief Decision 3:
 *  1. Build initial deck order (shuffle if randomize)
 *  2. Round N queue = [...remediationQueue, ...next slice from deck] capped at cardsPerRound
 *  3. On answer wrong + requeueWrong: push cardId to remediationQueue (dedupe)
 *  4. Round complete when all cards in round answered → increment roundIndex, pull next
 *  5. Run complete when deck exhausted AND remediationQueue empty
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type RoundEngineState = {
  /** All card IDs in initial deck order */
  deckIds: string[];
  /** Index into deckIds — how many cards have been "dealt" into rounds so far */
  deckCursor: number;
  /** Queue of card IDs to show again (wrong answers, deduplicated) */
  remediationQueue: string[];
  /** Current round number (0-indexed) */
  roundIndex: number;
  /** Cards in the current round */
  currentRound: string[];
  /** How many cards answered in the current round */
  answeredInRound: number;
  /** Max cards per round */
  cardsPerRound: number;
  /** Whether to requeue wrong answers */
  requeueWrong: boolean;
  /** Whether the entire run is complete */
  isRunComplete: boolean;
};

export type RoundSummary = {
  roundIndex: number;
  totalInRound: number;
  correctInRound: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initRoundEngine(
  cardIds: string[],
  options: { randomize: boolean; cardsPerRound: number; requeueWrong: boolean }
): RoundEngineState {
  const deckIds = options.randomize ? shuffleArray(cardIds) : [...cardIds];
  const cardsPerRound = Math.max(1, Math.min(50, options.cardsPerRound));

  const state: RoundEngineState = {
    deckIds,
    deckCursor: 0,
    remediationQueue: [],
    roundIndex: 0,
    currentRound: [],
    answeredInRound: 0,
    cardsPerRound,
    requeueWrong: options.requeueWrong,
    isRunComplete: false,
  };

  return buildNextRound(state);
}

// ── Round building ────────────────────────────────────────────────────────────

/**
 * Builds the next round queue: remediationQueue first, then deck slice.
 * Mutates and returns a new state object (pure — original is not modified).
 */
export function buildNextRound(state: RoundEngineState): RoundEngineState {
  const { deckIds, deckCursor, remediationQueue, cardsPerRound } = state;

  const remainingDeck = deckIds.length - deckCursor;
  const hasMore = remainingDeck > 0 || remediationQueue.length > 0;

  if (!hasMore) {
    return { ...state, isRunComplete: true, currentRound: [] };
  }

  // Fill round: remediation first, then fresh deck cards
  const round: string[] = [...remediationQueue];
  let newCursor = deckCursor;

  while (round.length < cardsPerRound && newCursor < deckIds.length) {
    round.push(deckIds[newCursor]!);
    newCursor++;
  }

  return {
    ...state,
    deckCursor: newCursor,
    remediationQueue: [], // cleared — already folded into current round
    currentRound: round.slice(0, cardsPerRound),
    answeredInRound: 0,
    isRunComplete: false,
  };
}

// ── Answer recording ──────────────────────────────────────────────────────────

export type AnswerResult = {
  state: RoundEngineState;
  /** True if the round just completed with this answer */
  roundComplete: boolean;
};

export function recordAnswer(
  state: RoundEngineState,
  cardId: string,
  isCorrect: boolean
): AnswerResult {
  if (state.isRunComplete) {
    return { state, roundComplete: false };
  }

  let newRemediationQueue = [...state.remediationQueue];

  if (!isCorrect && state.requeueWrong) {
    // Dedupe: only add if not already in the queue
    if (!newRemediationQueue.includes(cardId)) {
      newRemediationQueue = [...newRemediationQueue, cardId];
    }
  }

  const newAnsweredInRound = state.answeredInRound + 1;
  const roundComplete = newAnsweredInRound >= state.currentRound.length;

  if (roundComplete) {
    // Advance to next round
    const nextState = buildNextRound({
      ...state,
      remediationQueue: newRemediationQueue,
      roundIndex: state.roundIndex + 1,
      answeredInRound: newAnsweredInRound,
    });
    return { state: nextState, roundComplete: true };
  }

  return {
    state: {
      ...state,
      remediationQueue: newRemediationQueue,
      answeredInRound: newAnsweredInRound,
    },
    roundComplete: false,
  };
}

// ── Run completion check ──────────────────────────────────────────────────────

export function isRunComplete(state: RoundEngineState): boolean {
  return state.isRunComplete;
}
