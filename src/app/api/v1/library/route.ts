import { withErrorHandler } from '@/lib/api-error';
import { parseQueryParams } from '@/lib/http/parse-query-params';
import { libraryQuerySchema } from '@/features/search/schemas/search.schema';
import { getCachedPublicLibrary } from '@/server/services/search.service';

/**
 * The library is the same for every visitor, so the CDN may serve it briefly. Kept
 * short: after a publish the client refetches this URL and should see the change soon.
 * Search is not cached here because signed-in results differ and the CDN keys on URL only.
 */
const LIBRARY_CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=60';

export const GET = withErrorHandler(async (req) => {
  const params = parseQueryParams(req);
  const query = libraryQuerySchema.parse(params);
  const result = await getCachedPublicLibrary(query);
  return Response.json(result, { headers: { 'Cache-Control': LIBRARY_CACHE_CONTROL } });
});
