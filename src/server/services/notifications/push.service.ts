import { sendNotification, WebPushError } from 'web-push';
import { env } from '@/config/env';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/constants';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';
import { prisma } from '@/server/db';
import { resolveTimeZoneForMath, zonedCalendarDay } from '@/server/services/learning/zoned-day';
import { getEffectiveStreak } from '@/server/services/user/stats.service';

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type StudyReminderPayload = { title: string; body: string; url: string };

/** Reminders only go out between these local hours (inclusive start, exclusive end). */
export const REMINDER_LOCAL_HOURS = { from: 8, to: 22 } as const;
/** A cron retry within this window does not push the same device twice. */
const RESEND_GUARD_MS = 20 * 60 * 60 * 1000;
const SEND_BATCH_SIZE = 20;

export function getVapidPublicKey(): string | null {
  return env.vapidPublicKey && env.vapidPrivateKey ? env.vapidPublicKey : null;
}

/** Re-subscribing an endpoint under another account moves it to that account. */
export async function savePushSubscription(userId: string, input: PushSubscriptionInput) {
  const data = { userId, p256dh: input.keys.p256dh, auth: input.keys.auth };
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: { endpoint: input.endpoint, ...data },
    update: data,
  });
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export function localHour(now: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTimeZoneForMath(timeZone),
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return Number(hour) % 24;
}

type ReminderStats = {
  currentStreak: number;
  lastStudiedDate: Date | null;
  preferredTimezone: string;
} | null;

/** Null when this user should not be reminded now; otherwise the streak to mention. */
export function reminderStreak(stats: ReminderStats, now: Date): number | null {
  const timeZone = stats?.preferredTimezone ?? 'UTC';
  const hour = localHour(now, timeZone);
  if (hour < REMINDER_LOCAL_HOURS.from || hour >= REMINDER_LOCAL_HOURS.to) return null;
  const today = zonedCalendarDay(now, timeZone);
  if (stats?.lastStudiedDate && stats.lastStudiedDate.getTime() >= today.getTime()) return null;
  return stats ? getEffectiveStreak(stats.currentStreak, stats.lastStudiedDate, now, timeZone) : 0;
}

export function buildStudyReminder(
  preferredLocale: string | null | undefined,
  streak: number
): StudyReminderPayload {
  const catalog = loadCatalog(isLocale(preferredLocale) ? preferredLocale : DEFAULT_LOCALE);
  const key = streak > 0 ? 'studyReminder.streak' : 'studyReminder.default';
  return {
    title: t(catalog, `${key}.title`, { count: streak }),
    body: t(catalog, `${key}.body`, { count: streak }),
    url: '/today',
  };
}

function isGone(error: unknown) {
  return error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410);
}

/** Daily cron: push a reminder to every subscribed device whose user has not studied today. */
export async function sendDailyStudyReminders(now = new Date()) {
  const publicKey = getVapidPublicKey();
  if (!publicKey || !env.vapidPrivateKey) {
    return { configured: false as const, sent: 0, skipped: 0, removed: 0, failed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      OR: [{ lastSentAt: null }, { lastSentAt: { lt: new Date(now.getTime() - RESEND_GUARD_MS) } }],
    },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
      user: {
        select: {
          preferredLocale: true,
          stats: {
            select: { currentStreak: true, lastStudiedDate: true, preferredTimezone: true },
          },
        },
      },
    },
  });

  const due = subscriptions.flatMap((sub) => {
    const streak = reminderStreak(sub.user.stats, now);
    return streak === null
      ? []
      : [{ sub, payload: buildStudyReminder(sub.user.preferredLocale, streak) }];
  });

  const sentIds: string[] = [];
  const goneIds: string[] = [];
  let failed = 0;
  const vapidDetails = { subject: env.vapidSubject, publicKey, privateKey: env.vapidPrivateKey };

  for (let i = 0; i < due.length; i += SEND_BATCH_SIZE) {
    const batch = due.slice(i, i + SEND_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(({ sub, payload }) =>
        sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { vapidDetails, TTL: 4 * 60 * 60, urgency: 'normal', topic: 'study-reminder' }
        )
      )
    );
    results.forEach((result, index) => {
      const id = batch[index].sub.id;
      if (result.status === 'fulfilled') sentIds.push(id);
      else if (isGone(result.reason)) goneIds.push(id);
      else failed += 1;
    });
  }

  if (sentIds.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: sentIds } },
      data: { lastSentAt: now },
    });
  }
  if (goneIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: goneIds } } });
  }

  return {
    configured: true as const,
    sent: sentIds.length,
    skipped: subscriptions.length - due.length,
    removed: goneIds.length,
    failed,
  };
}
