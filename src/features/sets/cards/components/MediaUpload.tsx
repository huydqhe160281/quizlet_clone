'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type MediaUploadProps = {
  fileType: 'image' | 'audio';
  onUploaded: (path: string, publicUrl: string) => void;
};

export function MediaUpload({ fileType, onUploaded }: MediaUploadProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);

    const presignedResponse = await fetch('/api/v1/upload/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileType,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      }),
    });

    if (!presignedResponse.ok) {
      const payload = (await presignedResponse.json()) as { message?: string };
      setError(payload.message ?? t('cards.uploadRequestFailed'));
      setLoading(false);
      return;
    }

    const { data } = (await presignedResponse.json()) as {
      data: { signedUrl: string; path: string; publicUrl: string };
    };

    const uploadResponse = await fetch(data.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    setLoading(false);

    if (!uploadResponse.ok) {
      setError(t('cards.uploadStorageFailed'));
      return;
    }

    onUploaded(data.path, data.publicUrl);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${fileType}-upload`}>
        {fileType === 'image' ? t('cards.imageOptional') : t('cards.audioOptional')}
      </Label>
      <Input
        id={`${fileType}-upload`}
        type="file"
        accept={
          fileType === 'image'
            ? 'image/jpeg,image/png,image/webp'
            : 'audio/mpeg,audio/wav,audio/ogg'
        }
        disabled={loading}
        onChange={(event) => {
          void handleChange(event);
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('cards.uploading')}</p>}
    </div>
  );
}
