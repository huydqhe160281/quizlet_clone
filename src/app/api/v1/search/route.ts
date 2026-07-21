import { withErrorHandler } from '@/lib/api-error';
import { searchQuerySchema } from '@/features/search/schemas/search.schema';
import { optionalUserId } from '@/server/auth/auth-utils';
import { getCachedSearchPublicSets } from '@/server/services/search.service';

export const GET = withErrorHandler(async (req) => {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const query = searchQuerySchema.parse(params);
  const userId = await optionalUserId();
  const result = await getCachedSearchPublicSets(query, userId);
  return Response.json(result);
});
