import { auth } from '@/server/auth';
import { ApiError, withErrorHandler } from '@/lib/api-error';

export const GET = withErrorHandler(async () => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError('UNAUTHORIZED', 'Not authenticated', 401);
  }

  return Response.json({
    data: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    },
  });
});
