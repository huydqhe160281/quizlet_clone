import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  getVapidPublicKey: vi.fn(),
  savePushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
}));
vi.mock('@/server/services/notifications/push.service', () => service);
vi.mock('@/server/auth/auth-utils', () => ({ requireUserId: vi.fn(async () => 'user-1') }));
vi.mock('@/lib/rate-limit/rate-limit-guard', () => ({ assertApiRateLimit: vi.fn(async () => {}) }));

import { DELETE, GET, POST } from './route';

const ctx = { params: Promise.resolve({}) };
const json = (method: string, body: unknown) =>
  new Request('http://localhost/api/v1/user/push-subscription', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const valid = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };

describe('/api/v1/user/push-subscription', () => {
  beforeEach(() => {
    service.getVapidPublicKey.mockReturnValue('BPublicKey');
  });
  afterEach(() => vi.clearAllMocks());

  it('GET returns the public key, or null when push is not configured', async () => {
    expect(await (await GET(new Request('http://localhost/x'), ctx)).json()).toEqual({
      data: { publicKey: 'BPublicKey' },
    });
    service.getVapidPublicKey.mockReturnValue(null);
    expect(await (await GET(new Request('http://localhost/x'), ctx)).json()).toEqual({
      data: { publicKey: null },
    });
  });

  it('POST stores a valid subscription for the signed-in user', async () => {
    const res = await POST(json('POST', valid), ctx);
    expect(res.status).toBe(200);
    expect(service.savePushSubscription).toHaveBeenCalledWith('user-1', valid);
  });

  it('POST rejects non-https endpoints and missing keys', async () => {
    expect(
      (await POST(json('POST', { ...valid, endpoint: 'http://push.example/a' }), ctx)).status
    ).toBe(400);
    expect((await POST(json('POST', { endpoint: valid.endpoint }), ctx)).status).toBe(400);
    expect(service.savePushSubscription).not.toHaveBeenCalled();
  });

  it('POST answers 503 when push is not configured', async () => {
    service.getVapidPublicKey.mockReturnValue(null);
    expect((await POST(json('POST', valid), ctx)).status).toBe(503);
  });

  it('DELETE removes only the caller’s subscription', async () => {
    await DELETE(json('DELETE', { endpoint: valid.endpoint }), ctx);
    expect(service.deletePushSubscription).toHaveBeenCalledWith('user-1', valid.endpoint);
  });
});
