import { z } from 'zod';

export const IMAGE_MAX_BYTES = 5_242_880;
export const AUDIO_MAX_BYTES = 10_485_760;

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
const audioMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'] as const;

export const presignedUrlSchema = z.object({
  fileType: z.enum(['image', 'audio']),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1),
  fileSize: z.number().int().positive(),
});

export function validateUploadRequest(input: z.infer<typeof presignedUrlSchema>) {
  const maxSize = input.fileType === 'image' ? IMAGE_MAX_BYTES : AUDIO_MAX_BYTES;
  if (input.fileSize > maxSize) {
    return { ok: false as const, code: 'FILE_TOO_LARGE' as const };
  }

  const allowed =
    input.fileType === 'image'
      ? imageMimeTypes.includes(input.mimeType as (typeof imageMimeTypes)[number])
      : audioMimeTypes.includes(input.mimeType as (typeof audioMimeTypes)[number]);

  if (!allowed) {
    return { ok: false as const, code: 'INVALID_MIME_TYPE' as const };
  }

  return { ok: true as const };
}

export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;
