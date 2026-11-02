import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';

const ensureUserStatsMock = vi.hoisted(() => vi.fn());
const userStatsUpdateManyMock = vi.hoisted(() => vi.fn());
const userStatsFindUniqueMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/services/user/stats.service', () => ({
  ensureUserStats: ensureUserStatsMock,
}));

vi.mock('@/server/db', () => ({
  prisma: {
    userStats: {
      updateMany: (...args: unknown[]) => userStatsUpdateManyMock(...args),
      findUnique: (...args: unknown[]) => userStatsFindUniqueMock(...args),
    },
  },
}));

import {
  adoptDetectedTimezone,
  validatePreferredTimezone,
} from '@/server/services/user/timezone.service';

describe('timezone.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureUserStatsMock.mockResolvedValue({ preferredTimezone: 'UTC' });
  });

  it('rejects an invalid or empty timezone', () => {
    expect(() => validatePreferredTimezone('Not/A_Zone')).toThrow(ApiError);
    expect(() => validatePreferredTimezone('  ')).toThrow(ApiError);
  });

  it('accepts and trims a valid IANA timezone', () => {
    expect(validatePreferredTimezone(' Asia/Tokyo ')).toBe('Asia/Tokyo');
  });

  it('Scenario: Detected timezone only replaces the UTC default', async () => {
    userStatsUpdateManyMock.mockResolvedValue({ count: 1 });
    userStatsFindUniqueMock.mockResolvedValue({ preferredTimezone: 'Asia/Ho_Chi_Minh' });
    await expect(adoptDetectedTimezone('user-1', 'Asia/Ho_Chi_Minh')).resolves.toEqual({
      preferredTimezone: 'Asia/Ho_Chi_Minh',
    });
    expect(userStatsUpdateManyMock).toHaveBeenCalledWith({
      where: { userId: 'user-1', preferredTimezone: 'UTC' },
      data: { preferredTimezone: 'Asia/Ho_Chi_Minh' },
    });
  });

  it('Scenario: Detected timezone keeps a user-chosen zone', async () => {
    userStatsUpdateManyMock.mockResolvedValue({ count: 0 });
    userStatsFindUniqueMock.mockResolvedValue({ preferredTimezone: 'Asia/Tokyo' });
    await expect(adoptDetectedTimezone('user-1', 'Asia/Ho_Chi_Minh')).resolves.toEqual({
      preferredTimezone: 'Asia/Tokyo',
    });
  });

  it('Scenario: Detected timezone must be valid', async () => {
    await expect(adoptDetectedTimezone('user-1', 'Not/A_Zone')).rejects.toBeInstanceOf(ApiError);
    expect(userStatsUpdateManyMock).not.toHaveBeenCalled();
  });
});
