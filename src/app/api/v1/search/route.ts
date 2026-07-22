import { withErrorHandler } from '@/lib/api-error';
import { parseQueryParams } from '@/lib/http/parse-query-params';
import { searchQuerySchema } from '@/features/search/schemas/search.schema';
import { optionalUserId } from '@/server/auth/auth-utils';
import { getCachedSearchPublicSets } from '@/server/services/search.service';

export const GET = withErrorHandler(async (req) => {
  const params = parseQueryParams(req);
  const query = searchQuerySchema.parse(params);
  const userId = await optionalUserId();
  const result = await getCachedSearchPublicSets(query, userId);
  return Response.json(result);
});
