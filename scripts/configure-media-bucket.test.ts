import { describe, expect, it } from 'vitest';
import { MEDIA_BUCKET_OPTIONS } from './configure-media-bucket.mjs';
import {
  MEDIA_EXTENSION_BY_MIME,
  MEDIA_MAX_BYTES,
  MEDIA_MIME_TYPES,
} from '@/features/upload/schemas/upload.schema';

describe('media bucket limits', () => {
  it('match the upload schema', () => {
    expect([...MEDIA_BUCKET_OPTIONS.allowedMimeTypes].sort()).toEqual([...MEDIA_MIME_TYPES].sort());
    expect(MEDIA_BUCKET_OPTIONS.fileSizeLimit).toBe(MEDIA_MAX_BYTES);
  });

  it('maps every allowed type to a stored extension', () => {
    for (const mime of MEDIA_MIME_TYPES) {
      expect(MEDIA_EXTENSION_BY_MIME[mime]).toMatch(/^[a-z0-9]+$/);
    }
  });
});
