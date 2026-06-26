import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { requireUserId } from '@/server/auth/auth-utils';
import { deleteFolder } from '@/server/services/folder.service';

export const DELETE = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { folderId } = await params;
  const userId = await requireUserId();
  await deleteFolder(folderId, userId);
  return Response.json({ data: { deleted: true } });
});
