import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { ApiError } from '@/lib/api-error';
import {
  validateUploadRequest,
  type PresignedUrlInput,
} from '@/features/upload/schemas/upload.schema';
import { env } from '@/lib/env';

const sanitizeFileName = (fileName: string) =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);

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

  const safeName = sanitizeFileName(input.fileName);
  const extension = safeName.includes('.')
    ? safeName.split('.').pop()
    : input.fileType === 'image'
      ? 'jpg'
      : 'mp3';

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
