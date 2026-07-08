'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Compass,
  Edit3,
  FileCheck,
  HelpCircle,
  Layers,
  PenLine,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';
import { StudySettingsModal } from '@/features/study/components/StudySettingsModal';
import { cn } from '@/lib/utils';

type StudyLauncherProps = {
  setId: string;
  cardCount: number;
  newWordCount?: number;
};

type ModeConfig = {
  value: StudyModeValue;
  href: string;
  label: string;
  description: string;
  icon: typeof Layers;
  accentClass: string;
  iconClass: string;
  disabled?: boolean;
  recommended?: boolean;
};

const MODES: ModeConfig[] = [
  {
    value: 'FLASHCARD',
    href: 'flashcard',
    label: 'Thẻ ghi nhớ',
    description: 'Lật thẻ để ôn thuật ngữ và định nghĩa, kèm phát âm trực tiếp trên trình duyệt.',
    icon: Layers,
    accentClass: 'hover:border-primary/30 hover:bg-primary/5',
    iconClass: 'bg-primary/10 text-primary',
    recommended: true,
  },
  {
    value: 'LEARN',
    href: 'learn',
    label: 'Học & Nhớ',
    description: 'Trắc nghiệm thông minh giúp bạn ghi nhớ nhanh hơn qua từng vòng luyện tập.',
    icon: HelpCircle,
    accentClass: 'hover:border-emerald-500/30 hover:bg-emerald-500/5',
    iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    value: 'WRITE',
    href: 'write',
    label: 'Gõ đáp án',
    description: 'Gõ trực tiếp đáp án đúng để rèn luyện trí nhớ và chính tả.',
    icon: Edit3,
    accentClass: 'hover:border-amber-500/30 hover:bg-amber-500/5',
    iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    value: 'TEST',
    href: 'test',
    label: 'Kiểm tra',
    description: 'Bài kiểm tra tổng hợp gồm trắc nghiệm, đúng/sai và gõ đáp án.',
    icon: FileCheck,
    accentClass: 'hover:border-rose-500/30 hover:bg-rose-500/5',
    iconClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    value: 'DRAW',
    href: 'draw',
    label: 'Viết chữ (CJK)',
    description: 'Luyện viết ký tự Hán với hướng dẫn nét bút tương tác.',
    icon: PenLine,
    accentClass: 'hover:border-violet-500/30 hover:bg-violet-500/5',
    iconClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
];

export function StudyLauncher({ setId, cardCount, newWordCount = 0 }: StudyLauncherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hoveredMode, setHoveredMode] = useState<StudyModeValue | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<StudyModeValue>('FLASHCARD');

  useEffect(() => {
    if (searchParams.get('studySettings') === '1') {
      setSettingsOpen(true);
      router.replace(`/sets/${setId}`, { scroll: false });
    }
  }, [router, searchParams, setId]);

  const openSettings = (mode: StudyModeValue = 'FLASHCARD') => {
    setInitialMode(mode);
    setSettingsOpen(true);
  };

  if (cardCount === 0) {
    return (
      <Card className="glass-panel overflow-hidden rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle>Luyện tập</CardTitle>
          <CardDescription>Thêm ít nhất một thẻ trước khi bắt đầu học.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div id="study-modes" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold tracking-tight">Lựa chọn phương pháp học</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl shadow-sm"
            onClick={() => openSettings()}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Tùy chỉnh phiên học
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MODES.map((mode) => {
            const isDrawDisabled = mode.value === 'DRAW' && newWordCount === 0;
            const disabled = mode.disabled || isDrawDisabled;
            const Icon = mode.icon;

            const content = (
              <>
                <div
                  className={cn(
                    'shrink-0 rounded-xl p-3.5 transition-colors',
                    mode.iconClass,
                    hoveredMode === mode.value && !disabled && 'scale-105'
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-extrabold">{mode.label}</span>
                    {mode.recommended && (
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                        Gợi ý
                      </Badge>
                    )}
                    {isDrawDisabled && (
                      <Badge variant="outline" className="text-[10px]">
                        Cần thẻ từ mới
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {mode.description}
                  </p>
                </div>
              </>
            );

            if (disabled) {
              return (
                <div
                  key={mode.value}
                  className="glass-panel flex cursor-not-allowed items-start gap-4 rounded-2xl border border-border/50 p-5 opacity-60"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={mode.value}
                href={`/sets/${setId}/${mode.href}`}
                onMouseEnter={() => setHoveredMode(mode.value)}
                onMouseLeave={() => setHoveredMode(null)}
                className={cn(
                  'glass-panel group flex items-start gap-4 rounded-2xl border border-border/50 p-5 text-left shadow-sm transition-all hover:shadow-md',
                  mode.accentClass
                )}
              >
                {content}
                <Sparkles className="ml-auto hidden h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
              </Link>
            );
          })}
        </div>
      </div>

      <StudySettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        setId={setId}
        totalCards={cardCount}
        newWordCount={newWordCount}
        initialMode={initialMode}
      />
    </>
  );
}
