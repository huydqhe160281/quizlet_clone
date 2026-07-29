export type QueueReason = 'due' | 'weak' | 'new';

export type RecommendationKind = 'spaced' | 'set-session' | 'empty';

export type LearningQueueItem = {
  cardId: string;
  setId: string;
  setTitle: string;
  reason: QueueReason;
  dueDate: string | null;
  easeFactor: number | null;
  frontPreview?: string;
  score?: number;
};

export type GoalProgress = {
  target: number;
  completed: number;
  remaining: number;
  pct: number;
  preferredTimezone: string;
};

export type WeakSetInsight = {
  setId: string;
  title: string;
  count: number;
};

export type RetentionInsights = {
  reviewsLast7Days: number;
  accuracyLast7Days: number;
  currentStreak: number;
  weakSets: WeakSetInsight[];
};

export type Recommendation = {
  kind: RecommendationKind;
  href: string;
  setId: string | null;
  mode: 'LEARN' | null;
  cardIds: string[] | null;
};

export type TodayPlan = {
  goal: GoalProgress;
  queue: {
    items: LearningQueueItem[];
    returned: number;
    totalEligible: number;
  };
  insights: RetentionInsights;
  recommendation: Recommendation;
};
