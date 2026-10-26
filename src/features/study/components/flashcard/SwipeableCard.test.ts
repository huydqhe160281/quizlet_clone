import { describe, expect, it } from 'vitest';
import { resolveSwipe, SWIPE_OFFSET_THRESHOLD, SWIPE_VELOCITY_THRESHOLD } from './SwipeableCard';

describe('resolveSwipe', () => {
  it('returns right when offset or velocity exceeds positive threshold', () => {
    expect(resolveSwipe(SWIPE_OFFSET_THRESHOLD + 1, 0)).toBe('right');
    expect(resolveSwipe(10, SWIPE_VELOCITY_THRESHOLD + 1)).toBe('right');
  });

  it('returns left when offset or velocity exceeds negative threshold', () => {
    expect(resolveSwipe(-(SWIPE_OFFSET_THRESHOLD + 1), 0)).toBe('left');
    expect(resolveSwipe(-10, -(SWIPE_VELOCITY_THRESHOLD + 1))).toBe('left');
  });

  it('returns null for small drags so the card snaps back', () => {
    expect(resolveSwipe(0, 0)).toBeNull();
    expect(resolveSwipe(SWIPE_OFFSET_THRESHOLD, 0)).toBeNull();
    expect(resolveSwipe(-SWIPE_OFFSET_THRESHOLD, 0)).toBeNull();
  });
});
