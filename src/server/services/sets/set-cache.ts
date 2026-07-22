import type { Visibility } from '@prisma/client';
import { revalidateTag } from 'next/cache';

export function invalidateSetCache(userId: string, visibility: Visibility | 'PUBLIC' | 'PRIVATE') {
  revalidateTag(`sets-${userId}`);
  if (visibility === 'PUBLIC') {
    revalidateTag('public-sets');
  }
}
