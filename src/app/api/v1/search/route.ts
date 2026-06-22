import { withErrorHandler } from '@/lib/api-error';
import { searchQuerySchema } from '@/features/search/schemas/search.schema';
import { searchPublicSets } from '@/server/services/search.service';

export const GET = withErrorHandler(async (req) => {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const query = searchQuerySchema.parse(params);
  const result = await searchPublicSets(query);
  return Response.json(result);
});
