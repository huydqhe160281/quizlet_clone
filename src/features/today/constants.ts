/** Shared Adaptive Learning Coach constants (safe for client + server). */

export const WEAK_EASE_THRESHOLD = 2.0;
export const WEAK_LOOKBACK_DAYS = 7;
export const QUEUE_DEFAULT_LIMIT = 30;
export const QUEUE_MAX_LIMIT = 50;
export const GOAL_MIN = 1;
export const GOAL_MAX = 200;
export const GOAL_DEFAULT = 20;

/** Reserved for future partial-dominance tuning; unused in Phase 1. */
export const SET_DOMINANCE_THRESHOLD = 0.7;

export const RANK_WEIGHT_OVERDUE_DAYS = 10;
export const RANK_WEIGHT_LOW_EASE = 5;
export const RANK_BONUS_RECENT_FAIL = 8;
export const RANK_BOOST_NEW = 1;
export const RANK_EASE_PIVOT = 2.5;

export const WEAK_SETS_LIMIT = 3;
