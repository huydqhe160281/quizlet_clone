/** Study-mode route segments under `/sets/[setId]/` (see `src/app/(app)/sets/[setId]`). */
const STUDY_SESSION_SEGMENTS = ['flashcard', 'learn', 'write', 'test', 'draw', 'gravity'] as const;

const STUDY_SESSION_PATH = new RegExp(`^/sets/[^/]+/(${STUDY_SESSION_SEGMENTS.join('|')})/?$`);

/**
 * True on an active study screen. Phones use it for "focus mode": the bottom nav
 * and guide chat FAB are hidden so the card and its controls fit the viewport
 * (the study header keeps an Exit control).
 */
export function isStudySessionPath(pathname: string | null | undefined): boolean {
  return Boolean(pathname && STUDY_SESSION_PATH.test(pathname));
}
