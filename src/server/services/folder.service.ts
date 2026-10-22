import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';
import { invalidateSetCache } from '@/server/services/sets/set-cache';

export async function listFolders(userId: string) {
  return prisma.folder.findMany({
    where: { userId },
    include: { _count: { select: { sets: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createFolder(userId: string, name: string) {
  return prisma.folder.create({
    data: { name, userId },
  });
}

export async function deleteFolder(folderId: string, userId: string) {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) {
    throw new ApiError('NOT_FOUND', 'Folder not found', 404);
  }
  if (folder.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'You do not have access to this folder', 403);
  }
  await prisma.folder.delete({ where: { id: folderId } });
  // Cached folder-filtered set lists (getSets?folderId=) are tagged per user.
  invalidateSetCache(userId, 'PRIVATE');
}

export async function addSetToFolder(folderId: string, userId: string, setId: string) {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) {
    throw new ApiError('NOT_FOUND', 'Folder not found', 404);
  }
  if (folder.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'You do not have access to this folder', 403);
  }

  const set = await prisma.flashcardSet.findUnique({ where: { id: setId } });
  if (!set || set.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'Set not found or not owned by you', 403);
  }

  const link = await prisma.folderSet.upsert({
    where: { folderId_setId: { folderId, setId } },
    create: { folderId, setId },
    update: {},
  });
  invalidateSetCache(userId, 'PRIVATE');
  return link;
}

export async function removeSetFromFolder(folderId: string, userId: string, setId: string) {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) {
    throw new ApiError('NOT_FOUND', 'Folder not found', 404);
  }
  if (folder.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'You do not have access to this folder', 403);
  }

  await prisma.folderSet.deleteMany({ where: { folderId, setId } });
  invalidateSetCache(userId, 'PRIVATE');
}

export async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } });
}
