import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { requireUserId } from '@/server/auth/auth-utils';
import { removeSetFromFolder } from '@/server/services/folder.service';

export const DELETE = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { folderId, setId } = await params;
  const userId = await requireUserId();
  await removeSetFromFolder(folderId, userId, setId);
  return Response.json({ data: { deleted: true } });
});
