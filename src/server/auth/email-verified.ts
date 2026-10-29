import { ApiError } from '@/lib/api-error';
import {
  STUDY_LIMIT_REACHED,
  UNVERIFIED_STUDY_LIMIT,
  type StudyLimitStatus,
} from '@/features/study/lib/study-limit';
import { prisma } from '@/server/db';
import { countReviewActivity } from '@/server/services/study/review-activity';

/**
 * Verification policy. Only password sign-ups confirm by email; an OAuth-only account
 * (no password) counts as verified because the provider (Google) vouched for the address.
 * Unverified accounts can sign in and study up to UNVERIFIED_STUDY_LIMIT reviews, cannot
 * publish sets and get a smaller AI generation quota.
 */
export function isEmailConsideredVerified(user: {
  emailVerified: Date | null;
  passwordHash: string | null;
}): boolean {
  return user.emailVerified !== null || user.passwordHash === null;
}

export async function hasVerifiedEmail(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, passwordHash: true },
  });
  return user !== null && isEmailConsideredVerified(user);
}

/** Publishing exposes the set to everyone, so it needs a confirmed owner address. */
export async function assertCanPublish(userId: string): Promise<void> {
  if (!(await hasVerifiedEmail(userId))) {
    throw new ApiError('EMAIL_NOT_VERIFIED', 'Verify your email before making a set public', 403);
  }
}

/**
 * Review budget of an unverified account, or null once the email counts as verified.
 * Counts the same lifetime reviews as the activity heatmap, old and new cards alike.
 */
export async function getStudyLimitStatus(userId: string): Promise<StudyLimitStatus | null> {
  if (await hasVerifiedEmail(userId)) return null;
  return countStudyLimit(userId);
}

/** Budget for a user already known to be unverified (skips the account lookup). */
export async function countStudyLimit(userId: string): Promise<StudyLimitStatus> {
  const used = await countReviewActivity(userId);
  return { used, limit: UNVERIFIED_STUDY_LIMIT, reached: used >= UNVERIFIED_STUDY_LIMIT };
}

/**
 * Gate for starting new study (a session or the spaced-review queue). Answers inside a
 * study already started are never rejected, so a session that crosses the limit still
 * finishes and offline replays are not lost.
 */
export async function assertCanStartStudy(userId: string): Promise<void> {
  const status = await getStudyLimitStatus(userId);
  if (status?.reached) {
    throw new ApiError(STUDY_LIMIT_REACHED, 'Verify your email to keep studying', 403, {
      used: status.used,
      limit: status.limit,
    });
  }
}
