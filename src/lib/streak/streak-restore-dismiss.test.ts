/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

async function loadClient() {
  vi.resetModules();
  return import('@/lib/streak/streak-client');
}

describe('streak restore prompt dismissal', () => {
  it('hides the prompt only until the next page load', async () => {
    const client = await loadClient();
    client.dismissStreakRestore('u1');
    expect(client.isStreakRestoreDismissed('u1')).toBe(true);
    expect(client.isStreakRestoreDismissed('u2')).toBe(false);
    // Nothing persists across a reload.
    expect(localStorage.length).toBe(0);

    const reloaded = await loadClient();
    expect(reloaded.isStreakRestoreDismissed('u1')).toBe(false);
  });

  it('reopening clears the dismissal and notifies the prompt', async () => {
    const client = await loadClient();
    const listener = vi.fn();
    window.addEventListener(client.OPEN_STREAK_RESTORE_EVENT, listener);
    client.dismissStreakRestore('u1');

    client.openStreakRestorePrompt('u1');

    expect(client.isStreakRestoreDismissed('u1')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(client.OPEN_STREAK_RESTORE_EVENT, listener);
  });
});
