import { withErrorHandler } from '@/lib/api-error';
import { parseQueryParams } from '@/lib/http/parse-query-params';
import { libraryQuerySchema } from '@/features/search/schemas/search.schema';
import { getCachedPublicLibrary } from '@/server/services/search.service';

// No CDN caching: after a publish the client refetches this URL and must see the
// change, and the server-side `unstable_cache` (tag-invalidated) already spares the DB.
export const GET = withErrorHandler(async (req) => {
  const params = parseQueryParams(req);
  const query = libraryQuerySchema.parse(params);
  const result = await getCachedPublicLibrary(query);
  return Response.json(result);
});
