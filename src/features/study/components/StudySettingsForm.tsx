'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Settings2 } from 'lucide-react';
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
import { notifyStreakUpdated, type StreakUpdatedDetail } from '@/lib/streak/streak-client';

type StudySettingsFormProps = {
  setId: string;
  totalCards: number;
  /** Cards tagged new-word (eligible for Draw mode) */
  newWordCount: number;
  variant?: 'page' | 'modal';
  initialMode?: StudyModeValue;
  onClose?: () => void;
};

export function StudySettingsForm({
  setId,
  totalCards,
  newWordCount,
  variant = 'page',
  initialMode = 'FLASHCARD',
  onClose,
}: StudySettingsFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<StudyModeValue>(initialMode);
  const [settings, setSettings] = useState<StudySessionSettings>({
    ...STUDY_SESSION_SETTINGS_DEFAULTS,
    cardsPerRound: Math.min(STUDY_SESSION_SETTINGS_DEFAULTS.cardsPerRound, totalCards),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxPerRound = Math.min(50, totalCards);

  const modes: { value: StudyModeValue; label: string; disabled?: boolean }[] = [
    { value: 'FLASHCARD', label: 'Thẻ ghi nhớ' },
    { value: 'LEARN', label: 'Học & Nhớ' },
    { value: 'WRITE', label: 'Gõ đáp án' },
    { value: 'TEST', label: 'Kiểm tra' },
    { value: 'DRAW', label: 'Viết chữ (CJK)', disabled: newWordCount === 0 },
  ];

  useEffect(() => {
    setMode(initialMode);
    setSettings({
      ...STUDY_SESSION_SETTINGS_DEFAULTS,
      cardsPerRound: Math.min(STUDY_SESSION_SETTINGS_DEFAULTS.cardsPerRound, totalCards),
    });
    setError(null);
  }, [initialMode, totalCards]);

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
      setError(payload.message ?? 'Không thể bắt đầu phiên học');
      return;
    }

    const payload = (await response.json()) as {
      data: { id: string };
      streak?: StreakUpdatedDetail;
    };
    if (payload.streak) {
      notifyStreakUpdated(payload.streak);
    }
    onClose?.();
    const modeParam = mode.toLowerCase();
    router.push(`/sets/${setId}/${modeParam}?sessionId=${payload.data.id}`);
  };

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="study-mode">Chế độ học</Label>
        <Select value={mode} onValueChange={(value) => setMode(value as StudyModeValue)}>
          <SelectTrigger id="study-mode" className="rounded-xl">
            <SelectValue placeholder="Chọn chế độ" />
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
            Không có thẻ &quot;từ mới&quot; trong bộ này — chế độ Viết chữ bị vô hiệu hóa.
          </p>
        )}
      </div>

      {mode === 'LEARN' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="question-style">Kiểu câu hỏi</Label>
            <Select
              value={settings.presentation ?? 'multiple_choice'}
              onValueChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  presentation: value as 'default' | 'multiple_choice',
                }))
              }
            >
              <SelectTrigger id="question-style" className="rounded-xl">
                <SelectValue placeholder="Chọn kiểu câu hỏi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                <SelectItem value="default">Tự viết / Tự luận</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.presentation !== 'default' && (
            <div className="space-y-2">
              <Label htmlFor="mc-direction">Hướng trắc nghiệm</Label>
              <Select
                value={settings.mcDirection ?? 'front_to_back'}
                onValueChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    mcDirection: value as 'front_to_back' | 'back_to_front',
                  }))
                }
              >
                <SelectTrigger id="mc-direction" className="rounded-xl">
                  <SelectValue placeholder="Chọn hướng câu hỏi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front_to_back">
                    Câu hỏi (mặt trước) → chọn đáp án (mặt sau)
                  </SelectItem>
                  <SelectItem value="back_to_front">
                    Câu hỏi (mặt sau) → chọn thuật ngữ (mặt trước)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      <div className="glass-panel space-y-3 rounded-2xl border border-border/50 p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="cards-per-round-input">Số thẻ mỗi vòng</Label>
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
              className="w-16 rounded-lg border border-input bg-transparent px-2 py-1 text-right text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <span className="text-sm text-muted-foreground">thẻ</span>
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
        <p className="text-xs text-muted-foreground">1–{maxPerRound} thẻ mỗi vòng</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="randomize"
            checked={settings.randomize}
            onCheckedChange={(checked) =>
              setSettings((current) => ({ ...current, randomize: checked === true }))
            }
          />
          <Label htmlFor="randomize" className="cursor-pointer font-normal">
            Xáo trộn thứ tự thẻ
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
          <Label htmlFor="requeue-wrong" className="cursor-pointer font-normal">
            Ôn lại câu sai ở vòng tiếp theo
          </Label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        id="start-study-btn"
        className="w-full rounded-xl font-bold"
        onClick={handleStart}
        disabled={loading}
      >
        <Compass className="mr-2 h-4 w-4" />
        {loading ? 'Đang bắt đầu…' : 'Bắt đầu học'}
      </Button>
    </>
  );

  if (variant === 'modal') {
    return <div className="space-y-6">{formFields}</div>;
  }

  return (
    <Card className="glass-panel mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border-border/50 shadow-lg">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle>Tùy chỉnh phiên học</CardTitle>
        </div>
        <CardDescription>
          Chọn chế độ và cấu hình vòng luyện tập — {totalCards} thẻ sẵn sàng.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{formFields}</CardContent>
    </Card>
  );
}
