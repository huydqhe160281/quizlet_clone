import { withErrorHandler } from '@/lib/api-error';
import { listTags } from '@/server/services/folder.service';

export const GET = withErrorHandler(async () => {
  const tags = await listTags();
  return Response.json({ data: tags });
});
