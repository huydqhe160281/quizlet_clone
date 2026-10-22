import type { Visibility } from '@prisma/client';
import { revalidateTag } from 'next/cache';

export type SetCacheChange = {
  /** The set whose own cached views (public preview) must be refreshed. */
  setId?: string;
  /**
   * 'list' (default): something list views show changed — title, visibility, tags,
   * card count, a set added or removed. 'content': only card text or order changed,
   * which list views (library, search, "my sets") do not include.
   */
  scope?: 'list' | 'content';
};

export function invalidateSetCache(
  userId: string,
  visibility: Visibility | 'PUBLIC' | 'PRIVATE',
  change: SetCacheChange = {}
) {
  const listChanged = change.scope !== 'content';
  if (listChanged) {
    revalidateTag(`sets-${userId}`);
  }
  if (visibility !== 'PUBLIC') return;
  if (change.setId) {
    revalidateTag(`public-set-${change.setId}`);
  }
  // The shared public tag covers every library/search page, so only flush it when a
  // list view can actually differ.
  if (listChanged) {
    revalidateTag('public-sets');
  }
}
