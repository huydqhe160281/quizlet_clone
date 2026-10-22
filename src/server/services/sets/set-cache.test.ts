import { beforeEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({ revalidateTag }));

import { invalidateSetCache } from '@/server/services/sets/set-cache';

describe('invalidateSetCache', () => {
  beforeEach(() => {
    revalidateTag.mockClear();
  });

  const tags = () => revalidateTag.mock.calls.map(([tag]) => tag);

  it('card text/order edits on a public set refresh only that set preview', () => {
    invalidateSetCache('user-a', 'PUBLIC', { setId: 'set-1', scope: 'content' });
    expect(tags()).toEqual(['public-set-set-1']);
  });

  it('list-visible changes on a public set refresh lists and its preview', () => {
    invalidateSetCache('user-a', 'PUBLIC', { setId: 'set-1' });
    expect(tags().sort()).toEqual(['public-set-set-1', 'public-sets', 'sets-user-a']);
  });

  it('private sets never touch public caches', () => {
    invalidateSetCache('user-a', 'PRIVATE', { setId: 'set-1' });
    expect(tags()).toEqual(['sets-user-a']);

    revalidateTag.mockClear();
    invalidateSetCache('user-a', 'PRIVATE', { setId: 'set-1', scope: 'content' });
    expect(tags()).toEqual([]);
  });
});
