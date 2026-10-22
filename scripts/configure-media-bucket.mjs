/**
 * Applies upload limits to the Supabase media bucket. Signed upload URLs cannot be bound
 * to a content type or size, so the bucket itself must reject other types and large files.
 *
 *   node --env-file=.env scripts/configure-media-bucket.mjs
 *
 * Keep these values in sync with src/features/upload/schemas/upload.schema.ts
 * (scripts/configure-media-bucket.test.ts checks it).
 */
import { createClient } from '@supabase/supabase-js';

export const MEDIA_BUCKET_OPTIONS = {
  public: true,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
  ],
  fileSizeLimit: 10_485_760,
};

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_MEDIA_BUCKET || 'flashcard-media';
  if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { error } = await supabase.storage.updateBucket(bucket, MEDIA_BUCKET_OPTIONS);
  if (error) {
    console.error(`Failed to update bucket "${bucket}": ${error.message}`);
    process.exit(1);
  }
  console.log(`Bucket "${bucket}" now accepts ${MEDIA_BUCKET_OPTIONS.allowedMimeTypes.join(', ')}`);
}

// Run only when executed directly, not when imported by the parity test.
if (process.argv[1]?.endsWith('configure-media-bucket.mjs')) {
  await main();
}
