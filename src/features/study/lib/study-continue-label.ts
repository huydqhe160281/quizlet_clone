/** i18n key for the post-answer continue CTA when the round ends. */
export const STUDY_CONTINUE_NEXT_ROUND_KEY = 'study.nextRound';

/** Default mid-round continue CTA key. */
export const STUDY_CONTINUE_DEFAULT_KEY = 'studyUi.continue';

/** Mid-round continue CTA for test mode (next question). */
export const STUDY_CONTINUE_NEXT_QUESTION_KEY = 'studyUi.nextQuestion';

/** Return an i18n key for the post-answer continue CTA; callers should `t()` it. */
export function studyContinueKey(
  roundEnded: boolean,
  midRoundKey: string = STUDY_CONTINUE_DEFAULT_KEY
): string {
  return roundEnded ? STUDY_CONTINUE_NEXT_ROUND_KEY : midRoundKey;
}

/** Keep progress on the finished round while feedback is still visible. */
export function studyProgressWhileFeedback(
  roundEnded: boolean,
  finishedRoundTotal: number,
  currentIndex: number,
  currentRoundTotal: number
) {
  if (roundEnded && finishedRoundTotal > 0) {
    return { current: finishedRoundTotal, total: finishedRoundTotal };
  }
  return { current: currentIndex + 1, total: Math.max(currentRoundTotal, 1) };
}
