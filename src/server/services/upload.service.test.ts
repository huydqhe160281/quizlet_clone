import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSignedUploadUrl = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn/${path}` } }),
      }),
    },
  }),
}));
vi.mock('@/config/env', () => ({
  env: { supabaseUrl: 'https://x.supabase.co', supabaseServiceRoleKey: 'k', mediaBucket: 'm' },
}));

import { generatePresignedUrl } from '@/server/services/upload.service';

describe('generatePresignedUrl', () => {
  beforeEach(() => {
    createSignedUploadUrl.mockReset().mockResolvedValue({
      data: { signedUrl: 'https://signed' },
      error: null,
    });
  });

  it('takes the stored extension from the validated MIME type, not the file name', async () => {
    const result = await generatePresignedUrl('user-a', {
      fileType: 'image',
      fileName: 'payload.html',
      mimeType: 'image/png',
      fileSize: 1000,
    });

    expect(result.path).toMatch(/^user-a\/image\/[0-9a-f-]+\.png$/);
  });

  it('rejects a MIME type outside the allow-list before signing', async () => {
    await expect(
      generatePresignedUrl('user-a', {
        fileType: 'image',
        fileName: 'x.svg',
        mimeType: 'image/svg+xml',
        fileSize: 1000,
      })
    ).rejects.toMatchObject({ code: 'INVALID_MIME_TYPE' });
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });
});
