'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ImportResult = {
  set: { id: string; title: string };
  cardsCreated: number;
  skippedRows?: number;
};

type ImportSetWizardProps = {
  setId?: string;
  onSuccess?: () => void;
};

export function ImportSetWizard({ setId, onSuccess }: ImportSetWizardProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Shared fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');

  // JSON tab
  const [jsonText, setJsonText] = useState('');

  // CSV tab
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleJsonImport = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setError('Invalid JSON — please check the format.');
      return;
    }

    // Merge UI title/description/visibility into the JSON body
    const body = setId
      ? {
          format: 'json',
          ...(typeof parsed === 'object' && parsed !== null && 'cards' in parsed ? parsed : {}),
        }
      : {
          format: 'json',
          set: { title, description: description || undefined, visibility },
          ...(typeof parsed === 'object' && parsed !== null && 'cards' in parsed ? parsed : {}),
        };

    const url = setId ? `/api/v1/sets/import?setId=${setId}` : '/api/v1/sets/import';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return response;
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      setError('Please select a CSV file.');
      return;
    }

    const form = new FormData();
    form.append('format', 'csv');
    if (!setId) {
      form.append('title', title);
      if (description) form.append('description', description);
      form.append('visibility', visibility);
    }
    form.append('file', csvFile);

    const url = setId ? `/api/v1/sets/import?setId=${setId}` : '/api/v1/sets/import';
    const response = await fetch(url, {
      method: 'POST',
      body: form,
    });

    return response;
  };

  const handleSubmit = async (format: 'json' | 'csv') => {
    if (!setId && !title.trim()) {
      setError('Title is required.');
      return;
    }

    setLoading(true);
    setError(null);

    const response = format === 'json' ? await handleJsonImport() : await handleCsvImport();
    setLoading(false);

    if (!response || !response.ok) {
      const payload = response ? ((await response.json()) as { message?: string }) : null;
      setError(payload?.message ?? 'Import failed. Please check your file and try again.');
      return;
    }

    const { data } = (await response.json()) as { data: ImportResult };
    setResult(data);
  };

  if (result) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>✅ Import successful!</CardTitle>
          <CardDescription>
            {setId
              ? `Added ${result.cardsCreated} cards to this set.`
              : `Created "${result.set.title}" with ${result.cardsCreated} cards.`}
            {result.skippedRows ? ` (${result.skippedRows} blank rows skipped)` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            onClick={() => {
              if (setId) {
                if (onSuccess) {
                  onSuccess();
                } else {
                  window.location.reload();
                }
              } else {
                router.push(`/sets/${result.set.id}`);
              }
            }}
          >
            {setId ? 'Close' : 'View set'}
          </Button>
          {!setId && (
            <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
              Import another
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto border-0 shadow-none p-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle>{setId ? 'Import cards into this set' : 'Import flashcard set'}</CardTitle>
        <CardDescription>
          {setId
            ? 'Upload a CSV file or paste JSON to append cards to this set.'
            : 'Upload a CSV file or paste JSON to create a new set.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        {/* Shared fields */}
        {!setId && (
          <>
            <div className="space-y-2">
              <Label htmlFor="import-title">Set title *</Label>
              <Input
                id="import-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Flashcard Set"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-description">Description</Label>
              <Textarea
                id="import-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-visibility">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as 'PRIVATE' | 'PUBLIC')}
              >
                <SelectTrigger id="import-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Format tabs */}
        <Tabs defaultValue="csv">
          <TabsList className="w-full">
            <TabsTrigger value="csv" className="flex-1">
              CSV Upload
            </TabsTrigger>
            <TabsTrigger value="json" className="flex-1">
              JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              CSV must have columns: <code>front</code>, <code>back</code> (optional:{' '}
              <code>example</code>). Max 500 cards, 2MB.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              {csvFile ? csvFile.name : 'Choose CSV file'}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={() => void handleSubmit('csv')} disabled={loading}>
              {loading ? 'Importing…' : 'Import CSV'}
            </Button>
          </TabsContent>

          <TabsContent value="json" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Paste JSON with a <code>cards</code> array. Each card needs <code>front</code> and{' '}
              <code>back</code>. Max 500 cards.
            </p>
            <Textarea
              id="import-json"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={8}
              placeholder={'{\n  "cards": [\n    { "front": "Hello", "back": "Xin chào" }\n  ]\n}'}
              className="font-mono text-xs"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={() => void handleSubmit('json')} disabled={loading}>
              {loading ? 'Importing…' : 'Import JSON'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
