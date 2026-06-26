import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { requireUserId } from '@/server/auth/auth-utils';
import {
  importCsv,
  importJson,
  importCsvToExisting,
  importJsonToExisting,
} from '@/server/services/sets/import.service';

export const POST = withErrorHandler(async (req) => {
  assertApiRateLimit(req);
  const userId = await requireUserId();

  const { searchParams } = new URL(req.url);
  const setId = searchParams.get('setId');

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.startsWith('multipart/form-data')) {
    // ── CSV upload ──────────────────────────────────────────────────────────
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return Response.json(
        { error: 'VALIDATION_ERROR', message: 'Missing file field' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();

    if (setId) {
      const result = await importCsvToExisting(userId, setId, buffer);
      return Response.json({ data: result }, { status: 201 });
    }

    const meta = {
      format: 'csv',
      title: form.get('title'),
      description: form.get('description') ?? undefined,
      language: form.get('language') ?? undefined,
      visibility: form.get('visibility') ?? undefined,
    };

    const result = await importCsv(userId, meta, buffer);
    return Response.json({ data: result }, { status: 201 });
  }

  if (contentType.startsWith('application/json')) {
    // ── JSON import ─────────────────────────────────────────────────────────
    const body = await req.json();

    if (setId) {
      const result = await importJsonToExisting(userId, setId, body);
      return Response.json({ data: result }, { status: 201 });
    }

    const result = await importJson(userId, body);
    return Response.json({ data: result }, { status: 201 });
  }

  return Response.json(
    {
      error: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Content-Type must be application/json or multipart/form-data',
    },
    { status: 415 }
  );
});
