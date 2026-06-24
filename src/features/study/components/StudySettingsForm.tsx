'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StudyModeValue, StudySessionSettings } from '@/features/study/schemas/study.schema';
import { STUDY_SESSION_SETTINGS_DEFAULTS } from '@/features/study/schemas/study.schema';

type StudySettingsFormProps = {
  setId: string;
  totalCards: number;
  /** Cards tagged new-word (eligible for Draw mode) */
  newWordCount: number;
};

export function StudySettingsForm({ setId, totalCards, newWordCount }: StudySettingsFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<StudyModeValue>('FLASHCARD');
  const [settings, setSettings] = useState<StudySessionSettings>({
    ...STUDY_SESSION_SETTINGS_DEFAULTS,
    cardsPerRound: Math.min(STUDY_SESSION_SETTINGS_DEFAULTS.cardsPerRound, totalCards),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxPerRound = Math.min(50, totalCards);

  const modes: { value: StudyModeValue; label: string; disabled?: boolean }[] = [
    { value: 'FLASHCARD', label: 'Flashcards' },
    { value: 'LEARN', label: 'Learn' },
    { value: 'WRITE', label: 'Write' },
    { value: 'TEST', label: 'Test' },
    { value: 'DRAW', label: 'Draw (CJK)', disabled: newWordCount === 0 },
  ];

  useEffect(() => {
    if (newWordCount === 0 && mode === 'DRAW') {
      setMode('FLASHCARD');
    }
  }, [mode, newWordCount]);

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/v1/study/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId, mode, settings }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setError(payload.message ?? 'Failed to start session');
      return;
    }

    const { data } = (await response.json()) as { data: { id: string } };
    const modeParam = mode.toLowerCase();
    router.push(`/sets/${setId}/${modeParam}?sessionId=${data.id}`);
  };

  return (
    <Card className="glass-panel w-full max-w-lg mx-auto overflow-hidden rounded-2xl border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle>Study Settings</CardTitle>
        <CardDescription>
          Configure your study session — {totalCards} cards available.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="study-mode">Study mode</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as StudyModeValue)}>
            <SelectTrigger id="study-mode">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {modes.map((item) => (
                <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {newWordCount === 0 && (
            <p className="text-xs text-muted-foreground">
              Không có thẻ &quot;từ mới&quot; trong bộ này
            </p>
          )}
        </div>

        {mode === 'LEARN' && (
          <div className="space-y-2">
            <Label htmlFor="question-style">Question style</Label>
            <Select
              value={settings.presentation ?? 'multiple_choice'}
              onValueChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  presentation: value as 'default' | 'multiple_choice',
                }))
              }
            >
              <SelectTrigger id="question-style">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice (Trắc nghiệm)</SelectItem>
                <SelectItem value="default">Written (Tự viết/Tự luận)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="cards-per-round-input">Cards per round</Label>
            <div className="flex items-center gap-2">
              <input
                id="cards-per-round-input"
                type="number"
                min={1}
                max={50}
                value={settings.cardsPerRound}
                onChange={(event) => {
                  const value = parseInt(event.target.value, 10);
                  if (!Number.isNaN(value)) {
                    setSettings((current) => ({
                      ...current,
                      cardsPerRound: Math.max(1, Math.min(50, value)),
                    }));
                  }
                }}
                className="w-16 rounded-md border border-input bg-transparent px-2 py-1 text-right text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <span className="text-sm text-muted-foreground">cards</span>
            </div>
          </div>
          <Slider
            id="cards-per-round"
            min={1}
            max={maxPerRound}
            step={1}
            value={[settings.cardsPerRound]}
            onValueChange={([value]) =>
              setSettings((current) => ({
                ...current,
                cardsPerRound: value ?? current.cardsPerRound,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">1–{maxPerRound} cards per round</p>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="randomize"
            checked={settings.randomize}
            onCheckedChange={(checked) =>
              setSettings((current) => ({ ...current, randomize: checked === true }))
            }
          />
          <Label htmlFor="randomize" className="font-normal cursor-pointer">
            Randomize card order
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="requeue-wrong"
            checked={settings.requeueWrong}
            onCheckedChange={(checked) =>
              setSettings((current) => ({ ...current, requeueWrong: checked === true }))
            }
          />
          <Label htmlFor="requeue-wrong" className="font-normal cursor-pointer">
            Review wrong answers in next round
          </Label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button id="start-study-btn" className="w-full" onClick={handleStart} disabled={loading}>
          {loading ? 'Starting…' : 'Start studying'}
        </Button>
      </CardContent>
    </Card>
  );
}
