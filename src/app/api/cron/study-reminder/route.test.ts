import { afterEach, describe, expect, it, vi } from 'vitest';

const sendDailyStudyReminders = vi.hoisted(() => vi.fn());
vi.mock('@/server/services/notifications/push.service', () => ({ sendDailyStudyReminders }));

import { GET } from './route';

const ctx = { params: Promise.resolve({}) };
const request = (authorization?: string) =>
  new Request('http://localhost/api/cron/study-reminder', {
    headers: authorization ? { authorization } : {},
  });

describe('GET /api/cron/study-reminder', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('refuses callers without the cron secret', async () => {
    vi.stubEnv('CRON_SECRET', 'secret');
    expect((await GET(request('Bearer wrong'), ctx)).status).toBe(401);
    vi.stubEnv('CRON_SECRET', '');
    expect((await GET(request('Bearer '), ctx)).status).toBe(401);
    expect(sendDailyStudyReminders).not.toHaveBeenCalled();
  });

  it('sends reminders for the Vercel Cron caller', async () => {
    vi.stubEnv('CRON_SECRET', 'secret');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    sendDailyStudyReminders.mockResolvedValue({ configured: true, sent: 2 });
    const res = await GET(request('Bearer secret'), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { configured: true, sent: 2 } });
  });
});
