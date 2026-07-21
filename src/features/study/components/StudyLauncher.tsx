'use client';

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
import { STUDY_MODE_DESC_KEY, STUDY_MODE_LABEL_KEY } from '@/features/study/lib/study-mode-i18n';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type StudyLauncherProps = {
  setId: string;
  cardCount: number;
  newWordCount?: number;
};

type ModeConfig = {
  value: StudyModeValue;
  href: string;
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
    icon: Layers,
    accentClass: 'hover:border-primary/30 hover:bg-primary/5',
    iconClass: 'bg-primary/10 text-primary',
    recommended: true,
  },
  {
    value: 'LEARN',
    href: 'learn',
    icon: HelpCircle,
    accentClass: 'hover:border-emerald-500/30 hover:bg-emerald-500/5',
    iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    value: 'WRITE',
    href: 'write',
    icon: Edit3,
    accentClass: 'hover:border-amber-500/30 hover:bg-amber-500/5',
    iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    value: 'TEST',
    href: 'test',
    icon: FileCheck,
    accentClass: 'hover:border-rose-500/30 hover:bg-rose-500/5',
    iconClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    value: 'DRAW',
    href: 'draw',
    icon: PenLine,
    accentClass: 'hover:border-violet-500/30 hover:bg-violet-500/5',
    iconClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
];

export function StudyLauncher({ setId, cardCount, newWordCount = 0 }: StudyLauncherProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hoveredMode, setHoveredMode] = useState<StudyModeValue | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<StudyModeValue>('FLASHCARD');
  const [hideModeSelect, setHideModeSelect] = useState(false);

  useEffect(() => {
    if (searchParams.get('studySettings') === '1') {
      setHideModeSelect(false);
      setInitialMode('FLASHCARD');
      setSettingsOpen(true);
      router.replace(`/sets/${setId}`, { scroll: false });
    }
  }, [router, searchParams, setId]);

  const openSettings = (mode?: StudyModeValue) => {
    if (mode) {
      setInitialMode(mode);
      setHideModeSelect(true);
    } else {
      setInitialMode('FLASHCARD');
      setHideModeSelect(false);
    }
    setSettingsOpen(true);
  };

  if (cardCount === 0) {
    return (
      <Card className="glass-panel overflow-hidden rounded-xl border-border/50">
        <CardHeader>
          <CardTitle>{t('study.practice')}</CardTitle>
          <CardDescription>{t('study.needCards')}</CardDescription>
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
            <h2 className="text-lg font-extrabold tracking-tight">{t('study.chooseMethod')}</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl shadow-sm"
            aria-label={t('study.customizeSession')}
            onClick={() => openSettings()}
          >
            <Settings2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('study.customizeSession')}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MODES.map((mode, index) => {
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
                    <span className="text-base font-extrabold">
                      {t(STUDY_MODE_LABEL_KEY[mode.value])}
                    </span>
                    {mode.recommended && (
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                        {t('study.recommended')}
                      </Badge>
                    )}
                    {isDrawDisabled && (
                      <Badge variant="outline" className="text-[10px]">
                        {t('study.needsNewWord')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t(STUDY_MODE_DESC_KEY[mode.value])}
                  </p>
                </div>
              </>
            );

            if (disabled) {
              return (
                <div
                  key={mode.value}
                  className="glass-panel flex cursor-not-allowed items-start gap-4 rounded-xl border border-border/50 p-5 opacity-60"
                >
                  {content}
                </div>
              );
            }

            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => openSettings(mode.value)}
                onMouseEnter={() => setHoveredMode(mode.value)}
                onMouseLeave={() => setHoveredMode(null)}
                className={cn(
                  'glass-panel group flex items-start gap-4 rounded-xl border border-border/50 p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4 zoom-in-[0.98] fill-mode-both',
                  mode.accentClass
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {content}
                <Sparkles className="ml-auto hidden h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block" />
              </button>
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
        hideModeSelect={hideModeSelect}
      />
    </>
  );
}
