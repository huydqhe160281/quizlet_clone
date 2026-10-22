import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const enqueueSessionAnswersMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/features/study-offline/queue', () => ({
  enqueueSessionAnswers: enqueueSessionAnswersMock,
}));

import { beaconSessionAnswers } from '@/features/study/lib/answer-beacon';
import type { StampedPendingAnswer } from '@/features/study/store';

const answers: StampedPendingAnswer[] = [
  { cardId: 'card-1', isCorrect: true, clientMutationId: 'm-1', clientTimestamp: 1 },
  { cardId: 'card-2', isCorrect: false, clientMutationId: 'm-2', clientTimestamp: 2 },
];

function stubNavigator(
  sendBeacon: (url: string, data?: BodyInit | null) => boolean,
  onLine = true
) {
  vi.stubGlobal('navigator', { sendBeacon: vi.fn(sendBeacon), onLine });
  return navigator.sendBeacon as unknown as ReturnType<typeof vi.fn>;
}

describe('beaconSessionAnswers', () => {
  beforeEach(() => {
    enqueueSessionAnswersMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('beacons to the session route, which accepts POST', () => {
    const sendBeacon = stubNavigator(() => true);

    beaconSessionAnswers('session-1', answers, 'user-a');

    expect(sendBeacon).toHaveBeenCalledWith('/api/v1/study/sessions/session-1', expect.any(Blob));
    expect(enqueueSessionAnswersMock).not.toHaveBeenCalled();
  });

  it('enqueues answers durably when the beacon cannot be queued', () => {
    stubNavigator(() => false);

    beaconSessionAnswers('session-1', answers, 'user-a');

    expect(enqueueSessionAnswersMock).toHaveBeenCalledWith(
      'user-a',
      'session-1',
      answers,
      expect.anything()
    );
  });

  it('enqueues answers durably while offline even if the beacon was accepted', () => {
    stubNavigator(() => true, false);

    beaconSessionAnswers('session-1', answers, 'user-a');

    expect(enqueueSessionAnswersMock).toHaveBeenCalledTimes(1);
  });

  it('keeps its own snapshot so the caller can clear the live buffer', () => {
    stubNavigator(() => false);
    const live = [...answers];

    beaconSessionAnswers('session-1', live, 'user-a');
    live.length = 0;

    expect(enqueueSessionAnswersMock.mock.calls[0]?.[2]).toHaveLength(2);
  });

  it('does nothing without answers', () => {
    const sendBeacon = stubNavigator(() => true);

    beaconSessionAnswers('session-1', [], 'user-a');

    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
