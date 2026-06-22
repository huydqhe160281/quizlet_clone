import { describe, it, expect } from 'vitest';
import { initRoundEngine, recordAnswer, buildNextRound, isRunComplete } from './round-engine';

const CARDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];

// ── test_round_caps_at_cards_per_round ────────────────────────────────────────
describe('Round size', () => {
  it('caps round at cardsPerRound', () => {
    const state = initRoundEngine(CARDS, {
      randomize: false,
      cardsPerRound: 3,
      requeueWrong: true,
    });
    expect(state.currentRound).toHaveLength(3);
    expect(state.currentRound).toEqual(['c1', 'c2', 'c3']);
  });

  it('round contains remaining cards when fewer than cardsPerRound', () => {
    const state = initRoundEngine(['c1', 'c2'], {
      randomize: false,
      cardsPerRound: 5,
      requeueWrong: true,
    });
    expect(state.currentRound).toHaveLength(2);
  });
});

// ── test_round_includes_remediation_first ─────────────────────────────────────
describe('Remediation queue', () => {
  it('includes wrong card at front of next round — Scenario: Wrong Card Requeued', () => {
    let state = initRoundEngine(['c1', 'c2', 'c3', 'c4', 'c5'], {
      randomize: false,
      cardsPerRound: 3,
      requeueWrong: true,
    });
    // Round 0: [c1, c2, c3] — answer c1 wrong, c2 correct, c3 correct
    ({ state } = recordAnswer(state, 'c1', false));
    ({ state } = recordAnswer(state, 'c2', true));
    const { state: afterRound, roundComplete } = recordAnswer(state, 'c3', true);

    expect(roundComplete).toBe(true);
    // Round 1 should start with c1 (remediation) then c4, c5
    expect(afterRound.currentRound[0]).toBe('c1');
    expect(afterRound.roundIndex).toBe(1);
  });

  it('deduplicates wrong cards in remediation queue', () => {
    const state = initRoundEngine(['c1', 'c2', 'c3'], {
      randomize: false,
      cardsPerRound: 3,
      requeueWrong: true,
    });
    const { state: afterFirstWrong } = recordAnswer(state, 'c1', false);
    expect(afterFirstWrong.remediationQueue).toEqual(['c1']);

    // Same round: answering c1 wrong again must not duplicate the queue entry
    const { state: afterDuplicateWrong } = recordAnswer(afterFirstWrong, 'c1', false);
    expect(afterDuplicateWrong.remediationQueue.filter((id) => id === 'c1')).toHaveLength(1);
  });
});

// ── test_requeue_disabled ─────────────────────────────────────────────────────
describe('Requeue disabled', () => {
  it('does NOT add wrong card to remediationQueue when requeueWrong=false — Scenario: Requeue Disabled', () => {
    let state = initRoundEngine(['c1', 'c2', 'c3'], {
      randomize: false,
      cardsPerRound: 3,
      requeueWrong: false,
    });
    ({ state } = recordAnswer(state, 'c1', false));
    expect(state.remediationQueue).toHaveLength(0);
  });
});

// ── Run completion ────────────────────────────────────────────────────────────
describe('Run completion', () => {
  it('marks run complete when deck exhausted and remediation empty', () => {
    let state = initRoundEngine(['c1', 'c2'], {
      randomize: false,
      cardsPerRound: 2,
      requeueWrong: false,
    });
    ({ state } = recordAnswer(state, 'c1', true));
    ({ state } = recordAnswer(state, 'c2', true));
    expect(isRunComplete(state)).toBe(true);
  });

  it('does NOT complete run while remediation queue has cards', () => {
    let state = initRoundEngine(['c1', 'c2'], {
      randomize: false,
      cardsPerRound: 2,
      requeueWrong: true,
    });
    ({ state } = recordAnswer(state, 'c1', false)); // c1 → remediation
    ({ state } = recordAnswer(state, 'c2', true)); // round ends
    // Next round: remediation [c1]
    expect(isRunComplete(state)).toBe(false);
    expect(state.currentRound).toContain('c1');
  });
});
