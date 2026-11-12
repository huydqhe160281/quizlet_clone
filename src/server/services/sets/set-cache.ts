import type { Visibility } from '@prisma/client';
import { revalidateTag } from 'next/cache';

/** Library and anonymous search pages. */
export const PUBLIC_SET_LISTS_TAG = 'public-set-lists';
/** One public set's preview page. */
export const publicSetTag = (setId: string) => `public-set-${setId}`;

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
    revalidateTag(publicSetTag(change.setId));
  }
  // The list tag covers every library/search page, so only flush it when a list view
  // can actually differ. Previews of other sets keep their own tag and stay cached.
  if (listChanged) {
    revalidateTag(PUBLIC_SET_LISTS_TAG);
  }
}
