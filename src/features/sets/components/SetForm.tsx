'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSetMutations } from '@/features/sets/hooks/useSets';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

type SetFormProps = {
  mode?: 'create' | 'edit';
  setId?: string;
  initial?: {
    title: string;
    description?: string | null;
    language?: string | null;
    visibility?: 'PRIVATE' | 'PUBLIC';
  };
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
};

export function SetForm({
  mode = 'create',
  setId,
  initial,
  onSuccess,
  onCancel,
  isModal = false,
}: SetFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { createSet, updateSet } = useSetMutations();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [language, setLanguage] = useState(initial?.language ?? '');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>(
    initial?.visibility ?? 'PRIVATE'
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = {
      title,
      description: description || undefined,
      language: language || undefined,
      visibility,
    };

    if (mode === 'edit' && setId) {
      updateSet.mutate(
        { setId, input: payload },
        {
          onSuccess: () => {
            if (onSuccess) onSuccess();
            else router.push(`/sets/${setId}`);
          },
          onError: (err) => setError(err.message),
        }
      );
      return;
    }

    createSet.mutate(payload, {
      onSuccess: (result) => {
        if (onSuccess) onSuccess();
        router.push(`/sets/${result.data.id}`);
      },
      onError: (err) => setError(err.message),
    });
  };

  const loading = createSet.isPending || updateSet.isPending;

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t('setsPage.formTitle')}</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t('setsPage.formDescription')}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="language">{t('setsPage.formLanguage')}</Label>
          <Input
            id="language"
            placeholder={t('setsPage.languagePlaceholder')}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">{t('setsPage.formVisibility')}</Label>
          <Select
            value={visibility}
            onValueChange={(v) => setVisibility(v as 'PRIVATE' | 'PUBLIC')}
          >
            <SelectTrigger id="visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRIVATE">{t('ui.private')}</SelectItem>
              <SelectItem value="PUBLIC">{t('ui.public')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.back())}
          disabled={loading}
        >
          {t('ui.cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? t('setsPage.saving')
            : mode === 'create'
              ? t('setsPage.createSet')
              : t('setsPage.saveChanges')}
        </Button>
      </div>
    </form>
  );

  if (isModal) {
    return formContent;
  }

  return (
    <Card className="glass-panel overflow-hidden rounded-2xl border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? t('setsPage.createTitle') : t('setsPage.editTitle')}
        </CardTitle>
        <CardDescription>{t('setsPage.formHint')}</CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
