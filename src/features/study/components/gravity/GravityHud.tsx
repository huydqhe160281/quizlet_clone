import { memo } from 'react';
import Link from 'next/link';
import { ChevronLeft, Coins, Flame, Heart, Pause, Play, RotateCcw } from 'lucide-react';
import {
  GRAVITY_MAX_LIVES,
  GRAVITY_SPEED_MULTIPLIERS,
  type GravitySpeedMultiplier,
} from '@/features/study/lib/gravity-engine';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type GravityHudProps = {
  setId: string;
  lives: number;
  score: number;
  combo: number;
  speedMultiplier: GravitySpeedMultiplier;
  paused: boolean;
  onSelectSpeed: (speed: GravitySpeedMultiplier) => void;
  onTogglePause: () => void;
  onReplay: () => void;
};

const PILL =
  'inline-flex h-9 items-center rounded-full border border-white/15 bg-white/5 text-xs font-bold text-slate-200 transition sm:h-8 hover:border-white/30 hover:bg-white/15';

function nextSpeed(current: GravitySpeedMultiplier): GravitySpeedMultiplier {
  const index = GRAVITY_SPEED_MULTIPLIERS.indexOf(current);
  return GRAVITY_SPEED_MULTIPLIERS[(index + 1) % GRAVITY_SPEED_MULTIPLIERS.length] ?? 1;
}

/** Top bar: lives, score, combo, speed and game controls. Memoized — it skips the 60fps frames. */
export const GravityHud = memo(function GravityHud({
  setId,
  lives,
  score,
  combo,
  speedMultiplier,
  paused,
  onSelectSpeed,
  onTogglePause,
  onReplay,
}: GravityHudProps) {
  const t = useTranslations();
  const flameCount = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
  const hot = combo >= 2;

  return (
    <header className="relative z-30 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-white/10 bg-[#060a1e] px-2.5 py-2 sm:px-5 sm:py-2.5">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden text-base font-black tracking-tight text-white sm:inline">
          {t('studyUi.gravityTitle')}
        </span>
        <div
          className="flex items-center gap-0.5 sm:gap-1"
          aria-label={t('studyUi.gravityLivesAria', { lives })}
        >
          {Array.from({ length: GRAVITY_MAX_LIVES }, (_, index) => {
            const alive = index < lives;
            return (
              <Heart
                key={index}
                fill={alive ? '#f43f5e' : 'rgba(30, 41, 59, 0.75)'}
                color={alive ? '#fb7185' : '#334155'}
                className={cn(
                  'h-3.5 w-3.5 transition-all duration-300 sm:h-5 sm:w-5',
                  alive
                    ? 'scale-100 drop-shadow-[0_0_8px_rgba(244,63,94,0.75)]'
                    : 'scale-90 opacity-45'
                )}
              />
            );
          })}
        </div>
        <div
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 text-xs font-black text-amber-300 sm:px-3"
          aria-label={t('studyUi.gravityScoreAria', { score })}
        >
          <Coins className="h-3.5 w-3.5 fill-amber-400 text-amber-200 sm:h-4 sm:w-4" />
          <span className="tabular-nums">{score}</span>
        </div>
        <div
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-black transition-colors sm:px-3',
            hot
              ? 'border-orange-400/50 bg-orange-500/20 text-orange-200'
              : 'border-white/15 bg-white/5 text-slate-300'
          )}
          aria-label={t('studyUi.gravityComboAria', { combo })}
        >
          <div className="flex items-center -space-x-1">
            {Array.from({ length: flameCount }, (_, index) => (
              <Flame
                key={index}
                fill={hot ? '#f97316' : 'none'}
                color={hot ? '#fcd34d' : '#64748b'}
                className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', hot && 'animate-pulse')}
              />
            ))}
          </div>
          <span className="tabular-nums">X{combo}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Phones: one button cycles the speed; wider screens show every option. */}
        <button
          type="button"
          onClick={() => onSelectSpeed(nextSpeed(speedMultiplier))}
          aria-label={t('studyUi.gravitySpeedAria')}
          className={cn(PILL, 'px-2.5 tabular-nums sm:hidden')}
        >
          x{speedMultiplier}
        </button>
        <div
          data-testid="gravity-speed-selector"
          role="group"
          aria-label={t('studyUi.gravitySpeedAria')}
          className="hidden h-8 items-center gap-0.5 rounded-full border border-white/15 bg-white/5 p-1 sm:inline-flex"
        >
          {GRAVITY_SPEED_MULTIPLIERS.map((mult) => {
            const isSelected = speedMultiplier === mult;
            return (
              <button
                key={mult}
                type="button"
                data-testid={`gravity-speed-${mult}`}
                aria-pressed={isSelected}
                onClick={() => onSelectSpeed(mult)}
                className={cn(
                  'inline-flex h-full items-center justify-center rounded-full border px-2.5 text-xs font-bold tabular-nums tracking-tight transition-all',
                  isSelected
                    ? 'border-white/30 bg-white/15 text-white shadow-sm'
                    : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )}
              >
                x{mult}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onTogglePause}
          className={cn(PILL, 'w-9 justify-center sm:w-8')}
          aria-label={paused ? t('studyUi.gravityResume') : t('studyUi.gravityPause')}
          title={paused ? t('studyUi.gravityResume') : t('studyUi.gravityPause')}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          onClick={onReplay}
          aria-label={t('studyUi.gravityReplay')}
          className={cn(PILL, 'gap-1.5 px-2 sm:px-3')}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('studyUi.gravityReplay')}</span>
        </button>

        <Link
          href={`/sets/${setId}`}
          className={cn(PILL, 'gap-1 px-2 sm:px-3')}
          aria-label={t('studyUi.exitStudy')}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden md:inline">{t('studyUi.exitStudy')}</span>
        </Link>
      </div>
    </header>
  );
});
