import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { ApiError } from '@/lib/api-error';
import {
  MEDIA_EXTENSION_BY_MIME,
  validateUploadRequest,
  type PresignedUrlInput,
} from '@/features/upload/schemas/upload.schema';
import { env } from '@/config/env';

export function validatePresignedUpload(input: PresignedUrlInput) {
  const validation = validateUploadRequest(input);
  if (!validation.ok) {
    throw new ApiError(validation.code, validation.code.replaceAll('_', ' ').toLowerCase(), 400);
  }
}

export async function generatePresignedUrl(userId: string, input: PresignedUrlInput) {
  validatePresignedUpload(input);

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new ApiError('STORAGE_NOT_CONFIGURED', 'Media storage is not configured', 503);
  }

  // The name is client-controlled (`x.html`), so the extension comes from the MIME type
  // that passed validation. The bucket's allowedMimeTypes / fileSizeLimit (see
  // scripts/configure-media-bucket.mjs) enforce type and size on the upload itself,
  // since Supabase signed upload URLs cannot be bound to either.
  const extension = MEDIA_EXTENSION_BY_MIME[input.mimeType as keyof typeof MEDIA_EXTENSION_BY_MIME];

  const path = `${userId}/${input.fileType}/${randomUUID()}.${extension}`;
  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

  const { data, error } = await supabase.storage.from(env.mediaBucket).createSignedUploadUrl(path);

  if (error || !data) {
    throw new ApiError('STORAGE_ERROR', error?.message ?? 'Failed to create upload URL', 500);
  }

  const { data: publicData } = supabase.storage.from(env.mediaBucket).getPublicUrl(path);

  return {
    signedUrl: data.signedUrl,
    path,
    publicUrl: publicData.publicUrl,
  };
}
