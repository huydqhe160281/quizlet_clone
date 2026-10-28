import { afterEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({ getStreakRestoreStatus: vi.fn(), restoreStreak: vi.fn() }));
vi.mock('@/server/services/user/streak-restore.service', () => service);
vi.mock('@/server/auth/auth-utils', () => ({ requireUserId: vi.fn(async () => 'user-1') }));
vi.mock('@/lib/rate-limit/rate-limit-guard', () => ({ assertApiRateLimit: vi.fn(async () => {}) }));

import { ApiError } from '@/lib/api-error';
import { GET, POST } from './route';

const ctx = { params: Promise.resolve({}) };
const url = 'http://localhost/api/v1/user/streak/restore';

describe('/api/v1/user/streak/restore', () => {
  afterEach(() => vi.clearAllMocks());

  it('GET returns the restore status of the signed-in user', async () => {
    service.getStreakRestoreStatus.mockResolvedValue({ balance: 5, offer: null });
    const res = await GET(new Request(url), ctx);
    expect(await res.json()).toEqual({ data: { balance: 5, offer: null } });
    expect(service.getStreakRestoreStatus).toHaveBeenCalledWith('user-1');
  });

  it('POST restores and maps a missing offer to 409', async () => {
    service.restoreStreak.mockResolvedValue({ currentStreak: 12, balance: 1 });
    expect((await POST(new Request(url, { method: 'POST' }), ctx)).status).toBe(200);

    service.restoreStreak.mockRejectedValue(new ApiError('CONFLICT', 'No streak to restore', 409));
    expect((await POST(new Request(url, { method: 'POST' }), ctx)).status).toBe(409);
  });
});
