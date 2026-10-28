export const PUSH_SUBSCRIPTION_ENDPOINT = '/api/v1/user/push-subscription';

export async function sendPushSubscription(method: 'POST' | 'DELETE', body: unknown) {
  const response = await fetch(PUSH_SUBSCRIPTION_ENDPOINT, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`push-subscription ${method} ${response.status}`);
}

/**
 * Drop this browser's push subscription on the server and in the browser, so reminders stop
 * here (turning the toggle off, or signing out on a shared device). Resolves false when there
 * was nothing to remove.
 */
export async function removeDevicePushSubscription(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return false;
  await sendPushSubscription('DELETE', { endpoint: subscription.endpoint }).catch(() => {});
  await subscription.unsubscribe();
  return true;
}
