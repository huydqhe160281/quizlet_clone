import { withErrorHandler } from '@/lib/api-error';
import { libraryQuerySchema } from '@/features/search/schemas/search.schema';
import { getPublicLibrary } from '@/server/services/search.service';

export const GET = withErrorHandler(async (req) => {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const query = libraryQuerySchema.parse(params);
  const result = await getPublicLibrary(query);
  return Response.json(result);
});
