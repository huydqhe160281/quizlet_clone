import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RouteContext = { params: Promise<Record<string, string>> };

type RouteHandler = (req: Request, ctx: RouteContext) => Promise<Response> | Response;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        return Response.json(
          { error: error.code, message: error.message, details: error.details },
          { status: error.status }
        );
      }
      if (error instanceof ZodError) {
        return Response.json(
          { error: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten() },
          { status: 400 }
        );
      }
      console.error(error);
      return Response.json(
        { error: 'INTERNAL_ERROR', message: 'Something went wrong' },
        { status: 500 }
      );
    }
  };
}
