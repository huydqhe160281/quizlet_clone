import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit-guard';
import { createFolderSchema } from '@/features/folders/schemas/folder.schema';
import { requireUserId } from '@/server/auth-utils';
import { createFolder, listFolders } from '@/server/services/folder.service';

export const GET = withErrorHandler(async () => {
  const userId = await requireUserId();
  const folders = await listFolders(userId);
  return Response.json({ data: folders });
});

export const POST = withErrorHandler(async (req) => {
  assertApiRateLimit(req);
  const userId = await requireUserId();
  const body = await req.json();
  const { name } = createFolderSchema.parse(body);
  const folder = await createFolder(userId, name);
  return Response.json({ data: folder }, { status: 201 });
});
