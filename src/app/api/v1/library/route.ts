import { withErrorHandler } from '@/lib/api-error';
import { parseQueryParams } from '@/lib/http/parse-query-params';
import { libraryQuerySchema } from '@/features/search/schemas/search.schema';
import { getCachedPublicLibrary } from '@/server/services/search.service';

export const GET = withErrorHandler(async (req) => {
  const params = parseQueryParams(req);
  const query = libraryQuerySchema.parse(params);
  const result = await getCachedPublicLibrary(query);
  return Response.json(result);
});
