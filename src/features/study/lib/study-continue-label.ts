/** Label for the post-answer continue CTA in study modes. */
export function studyContinueLabel(roundEnded: boolean, midRoundLabel = 'Tiếp tục'): string {
  return roundEnded ? 'Vòng tiếp theo' : midRoundLabel;
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
