/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeDevicePushSubscription } from './push-subscription';

function stubServiceWorker(
  subscription: { endpoint: string; unsubscribe: () => Promise<boolean> } | null
) {
  const registration = { pushManager: { getSubscription: vi.fn(async () => subscription) } };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn(async () => registration) },
  });
}

describe('removeDevicePushSubscription', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('deletes the server row and unsubscribes the browser', async () => {
    const unsubscribe = vi.fn(async () => true);
    stubServiceWorker({ endpoint: 'https://fcm.googleapis.com/fcm/send/x', unsubscribe });
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(removeDevicePushSubscription()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/user/push-subscription',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/x' }),
      })
    );
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('still unsubscribes the browser when the server call fails', async () => {
    const unsubscribe = vi.fn(async () => true);
    stubServiceWorker({ endpoint: 'https://fcm.googleapis.com/fcm/send/x', unsubscribe });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 }))
    );

    await removeDevicePushSubscription();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('does nothing without a subscription or service worker support', async () => {
    stubServiceWorker(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(removeDevicePushSubscription()).resolves.toBe(false);
    Reflect.deleteProperty(navigator, 'serviceWorker');
    await expect(removeDevicePushSubscription()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
