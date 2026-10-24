import { memo } from 'react';
import { HelpCircle, Keyboard, Volume2 } from 'lucide-react';
import type { GravityDirection, GravityFeedbackPill } from '@/features/study/lib/gravity-engine';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type GravityControlsProps = {
  feedbackPill: GravityFeedbackPill | null;
  hintDisabled: boolean;
  direction: GravityDirection;
  /** Touch screens have no visible text field; this button raises the keyboard. */
  showTypeButton: boolean;
  onHint: () => void;
  onToggleDirection: () => void;
  onSpeak: (text: string) => void;
  onFocusInput: () => void;
};

/** Bottom strip: last word feedback, hint, answer direction and (on phones) a "type" button. */
export const GravityControls = memo(function GravityControls({
  feedbackPill,
  hintDisabled,
  direction,
  showTypeButton,
  onHint,
  onToggleDirection,
  onSpeak,
  onFocusInput,
}: GravityControlsProps) {
  const t = useTranslations();

  return (
    <div className="absolute inset-x-0 bottom-2.5 z-20 mx-auto flex w-full max-w-xl flex-col items-center gap-1.5 px-3">
      {feedbackPill && (
        <div
          className={cn(
            'inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1 text-xs font-bold shadow-[0_8px_24px_rgba(0,0,0,0.65)] sm:text-sm',
            feedbackPill.kind === 'hit' && 'border-emerald-400/50 bg-slate-950 text-emerald-200',
            feedbackPill.kind === 'hint' && 'border-amber-400/50 bg-slate-950 text-amber-200',
            feedbackPill.kind === 'miss' && 'border-rose-400/60 bg-rose-950 text-rose-200'
          )}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSpeak(feedbackPill.front);
            }}
            className="rounded-full bg-indigo-500/40 p-1 text-indigo-100 transition hover:bg-indigo-500/70"
            aria-label={t('studyUi.speakTermAria')}
          >
            <Volume2 className="h-3 w-3" />
          </button>
          <span className="truncate font-extrabold text-white">{feedbackPill.front}</span>
          <span className="text-slate-400">=</span>
          <span className="truncate text-slate-100">{feedbackPill.back}</span>
        </div>
      )}

      <div className="relative flex items-center gap-2 rounded-full border border-sky-300/30 bg-[#060b1e] px-3 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.75),0_0_20px_rgba(56,189,248,0.22)]">
        <span className="hidden text-[11px] font-semibold text-slate-300 sm:inline">
          {t('studyUi.gravityShortcuts')}
        </span>

        {showTypeButton && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFocusInput();
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-400 px-3 py-1 text-xs font-extrabold text-slate-950 transition hover:bg-sky-300"
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span>{t('studyUi.gravityTapToType')}</span>
          </button>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onHint();
          }}
          disabled={hintDisabled}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-900 shadow-[0_4px_12px_rgba(255,255,255,0.25)] transition hover:scale-[1.03] hover:bg-slate-100 disabled:opacity-50"
        >
          <HelpCircle className="h-3.5 w-3.5 text-slate-700" />
          <span>{t('studyUi.gravityHint')}</span>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleDirection();
          }}
          title={
            direction === 'back_to_front'
              ? t('studyUi.gravityDirectionTerm')
              : t('studyUi.gravityDirectionDef')
          }
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-slate-800 px-2.5 py-1 text-xs font-extrabold text-slate-100 transition hover:border-sky-400/40 hover:bg-slate-700"
        >
          {direction === 'back_to_front' ? '汉 / A' : 'A → B'}
        </button>
      </div>
    </div>
  );
});
