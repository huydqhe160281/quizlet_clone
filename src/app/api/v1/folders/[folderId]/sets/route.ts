import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit-guard';
import { addSetToFolderSchema } from '@/features/folders/schemas/folder.schema';
import { requireUserId } from '@/server/auth-utils';
import { addSetToFolder } from '@/server/services/folder.service';

export const POST = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { folderId } = await params;
  const userId = await requireUserId();
  const body = await req.json();
  const { setId } = addSetToFolderSchema.parse(body);
  const link = await addSetToFolder(folderId, userId, setId);
  return Response.json({ data: link }, { status: 201 });
});
