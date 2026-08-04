export type OfflineStudyCard = {
  sessionCardId: string;
  cardId: string;
  front: string;
  back: string;
  example: string | null;
  imageUrl: string | null;
};

export type CachedSetEntry = {
  setId: string;
  userId: string;
  sessionId: string;
  setTitle: string;
  cards: OfflineStudyCard[];
  cachedAt: number;
  lastAccessedAt: number;
};

export type MutationKind = 'session-answer' | 'session-complete' | 'srs-review';

export type MutationStatus = 'pending' | 'failed';

export type QueuedMutation = {
  localId?: number;
  clientMutationId: string;
  userId: string;
  kind: MutationKind;
  clientTimestamp: number;
  payload: Record<string, unknown>;
  status: MutationStatus;
  failReason?: string;
};

export type StampedPendingAnswer = {
  cardId: string;
  isCorrect: boolean;
  clientMutationId: string;
  clientTimestamp: number;
};
