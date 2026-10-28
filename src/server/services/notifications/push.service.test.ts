import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  pushSubscription: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  },
}));
const sendNotification = vi.hoisted(() => vi.fn());

vi.mock('@/server/db', () => ({ prisma: prismaMock }));
vi.mock('web-push', async (importOriginal) => {
  const actual = await importOriginal<typeof import('web-push')>();
  return { ...actual, sendNotification };
});

import { WebPushError } from 'web-push';
import {
  buildStudyReminder,
  isAllowedPushEndpoint,
  reminderStreak,
  savePushSubscription,
  sendDailyStudyReminders,
} from './push.service';

const VN = 'Asia/Ho_Chi_Minh';
// 13:00 UTC = 20:00 in Vietnam on 2026-10-28.
const cronRun = new Date('2026-10-28T13:00:00.000Z');
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function subscription(id: string, stats: Record<string, unknown> | null, locale = 'vi') {
  return {
    id,
    endpoint: `https://push.example/${id}`,
    p256dh: 'p',
    auth: 'a',
    user: { preferredLocale: locale, stats },
  };
}

describe('reminderStreak', () => {
  it('skips a user who already studied today in their time zone', () => {
    const stats = { currentStreak: 3, lastStudiedDate: day('2026-10-28'), preferredTimezone: VN };
    expect(reminderStreak(stats, cronRun)).toBeNull();
  });

  it('returns the streak at risk when the user studied yesterday', () => {
    const stats = { currentStreak: 3, lastStudiedDate: day('2026-10-27'), preferredTimezone: VN };
    expect(reminderStreak(stats, cronRun)).toBe(3);
  });

  it('returns 0 for a broken streak or a user without stats', () => {
    const stats = { currentStreak: 5, lastStudiedDate: day('2026-10-20'), preferredTimezone: VN };
    expect(reminderStreak(stats, cronRun)).toBe(0);
    expect(reminderStreak(null, cronRun)).toBe(0);
  });

  it('stays quiet outside local daytime hours', () => {
    const stats = {
      currentStreak: 1,
      lastStudiedDate: day('2026-10-27'),
      preferredTimezone: 'Asia/Tokyo',
    };
    // 13:00 UTC = 22:00 in Tokyo.
    expect(reminderStreak(stats, cronRun)).toBeNull();
  });
});

describe('isAllowedPushEndpoint', () => {
  it('accepts the browsers push services', () => {
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(
      true
    );
    expect(isAllowedPushEndpoint('https://web.push.apple.com/QF8')).toBe(true);
    expect(isAllowedPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=x')).toBe(true);
  });

  it('rejects arbitrary or look-alike hosts', () => {
    expect(isAllowedPushEndpoint('https://attacker.example/hook')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com.attacker.example/x')).toBe(false);
    expect(isAllowedPushEndpoint('https://evilfcm.googleapis.com.evil/x')).toBe(false);
    expect(isAllowedPushEndpoint('http://fcm.googleapis.com/fcm/send/abc')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com:8443/x')).toBe(false);
    expect(isAllowedPushEndpoint('https://user@fcm.googleapis.com/x')).toBe(false);
    expect(isAllowedPushEndpoint('not a url')).toBe(false);
  });
});

describe('buildStudyReminder', () => {
  it('mentions the streak in the user locale and links to /today', () => {
    const payload = buildStudyReminder('en', 4);
    expect(payload.title).toContain('4-day');
    expect(payload.url).toBe('/today');
  });

  it('falls back to Vietnamese copy without a streak', () => {
    expect(buildStudyReminder(null, 0).title).toBe('Đến giờ ôn bài rồi 📚');
  });
});

describe('push subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VAPID_PUBLIC_KEY', 'BPublicKey');
    vi.stubEnv('VAPID_PRIVATE_KEY', 'private-key');
    prismaMock.pushSubscription.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('upserts by endpoint so a device moves to the signed-in account', async () => {
    await savePushSubscription('user-2', {
      endpoint: 'https://push.example/x',
      keys: { p256dh: 'p', auth: 'a' },
    });
    expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example/x' },
      create: { endpoint: 'https://push.example/x', userId: 'user-2', p256dh: 'p', auth: 'a' },
      update: { userId: 'user-2', p256dh: 'p', auth: 'a' },
    });
  });

  it('does nothing when VAPID keys are missing', async () => {
    vi.stubEnv('VAPID_PRIVATE_KEY', '');
    await expect(sendDailyStudyReminders(cronRun)).resolves.toMatchObject({ configured: false });
    expect(prismaMock.pushSubscription.findMany).not.toHaveBeenCalled();
  });

  it('sends to due users, skips studied ones and deletes expired endpoints', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      subscription('due', {
        currentStreak: 2,
        lastStudiedDate: day('2026-10-27'),
        preferredTimezone: VN,
      }),
      subscription('studied', {
        currentStreak: 2,
        lastStudiedDate: day('2026-10-28'),
        preferredTimezone: VN,
      }),
      subscription('gone', null),
      subscription('flaky', null),
    ]);
    sendNotification.mockImplementation(async ({ endpoint }: { endpoint: string }) => {
      if (endpoint.endsWith('/gone')) throw new WebPushError('Gone', 410, {}, '', endpoint);
      if (endpoint.endsWith('/flaky')) throw new Error('network');
      return { statusCode: 201 };
    });

    const result = await sendDailyStudyReminders(cronRun);

    expect(result).toEqual({ configured: true, sent: 1, skipped: 1, removed: 1, failed: 1 });
    expect(sendNotification).toHaveBeenCalledTimes(3);
    const [, body] = sendNotification.mock.calls[0];
    expect(JSON.parse(body as string)).toMatchObject({ url: '/today' });
    expect(prismaMock.pushSubscription.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['due'] } },
      data: { lastSentAt: cronRun },
    });
    expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['gone'] } },
    });
  });
});
