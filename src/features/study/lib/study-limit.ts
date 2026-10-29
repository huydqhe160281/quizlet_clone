/** Reviews an account may record before it must verify its email to start new study. */
export const UNVERIFIED_STUDY_LIMIT = 200;

/** API error code returned when an unverified account starts study past the limit. */
export const STUDY_LIMIT_REACHED = 'STUDY_LIMIT_REACHED';

export type StudyLimitStatus = { used: number; limit: number; reached: boolean };

export class StudyLimitError extends Error {
  constructor() {
    super(STUDY_LIMIT_REACHED);
    this.name = 'StudyLimitError';
  }
}

/** True for a thrown StudyLimitError or a store error string carrying the code. */
export function isStudyLimitError(error: unknown): boolean {
  return error instanceof StudyLimitError || error === STUDY_LIMIT_REACHED;
}

/** Error state for a failed study start: the limit code (to render the notice) or a message. */
export function studyStartError(error: unknown, fallback: string): string {
  if (isStudyLimitError(error)) return STUDY_LIMIT_REACHED;
  return error instanceof Error ? error.message : fallback;
}
