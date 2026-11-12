import type { Locale } from '@/lib/i18n/constants';
import { prisma } from '@/server/db';

export async function getPreferredLocale(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredLocale: true },
  });
  return user?.preferredLocale ?? null;
}

export async function setPreferredLocale(userId: string, preferredLocale: Locale) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { preferredLocale },
    select: { preferredLocale: true },
  });
  return user.preferredLocale;
}
