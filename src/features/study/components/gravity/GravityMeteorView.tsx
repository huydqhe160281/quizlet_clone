import { useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import { MeteorGraphic } from '@/features/study/components/gravity/MeteorGraphic';
import {
  analyzeTypedAnswer,
  buildHintText,
  meteorTopPercent,
  type GravityMeteor,
  type GravityTypedAnalysis,
} from '@/features/study/lib/gravity-engine';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

const IDLE_ANALYSIS: GravityTypedAnalysis = {
  status: 'idle',
  matchedSlice: '',
  typoSlice: '',
  remainingCount: 0,
};

type GravityMeteorViewProps = {
  meteor: GravityMeteor;
  progress: number;
  /** The meteor the typed text is aimed at; only it shows the typed letters. */
  isTarget: boolean;
  input: string;
  isPrimed: boolean;
  hitSeq: number;
  shake: boolean;
  onLock: (meteorId: string) => void;
  onSpeak: (text: string) => void;
};

/**
 * One falling meteor and its prompt card. The meteor rides a full-height rail moved with
 * `translate3d(0, n%, 0)` — a percentage of the rail is a percentage of the play field —
 * so falling never triggers layout.
 */
export function GravityMeteorView({
  meteor,
  progress,
  isTarget,
  input,
  isPrimed,
  hitSeq,
  shake,
  onLock,
  onSpeak,
}: GravityMeteorViewProps) {
  const t = useTranslations();
  const analysis = useMemo(
    () => (isTarget ? analyzeTypedAnswer(input, meteor) : IDLE_ANALYSIS),
    [input, isTarget, meteor]
  );
  const danger = progress > 0.7;
  const isPrimedToExplode = isPrimed || analysis.status === 'primed';
  const isTypo = analysis.status === 'typo';
  const isMatchingPrefix = analysis.status === 'matching';
  const hasTyped = isTarget && input.trim().length > 0;

  return (
    <div
      className="pointer-events-none absolute inset-0 will-change-transform"
      style={{ transform: `translate3d(0, ${meteorTopPercent(progress).toFixed(2)}%, 0)` }}
    >
      <div
        data-testid="gravity-meteor"
        data-hit-seq={hitSeq}
        data-primed={isPrimedToExplode ? 'true' : 'false'}
        onPointerDown={() => onLock(meteor.id)}
        className="pointer-events-auto absolute top-0 -translate-x-1/2"
        style={{ left: `${meteor.xPercent}%` }}
      >
        <div
          key={hitSeq}
          className="flex flex-col items-center"
          style={
            hitSeq > 0
              ? { animation: 'gravityMeteorShake 240ms cubic-bezier(0.36,0.07,0.19,0.97)' }
              : undefined
          }
        >
          <MeteorGraphic
            danger={danger}
            hitSeq={hitSeq}
            isPrimedToExplode={isPrimedToExplode}
            phaseSeed={meteor.laneIndex}
          />

          <div
            className={cn(
              'relative -mt-3 flex w-max min-w-[112px] max-w-[42vw] flex-col overflow-hidden rounded-2xl border-2 bg-[#f2f9fd] px-2.5 pb-3 pt-2 text-slate-900 shadow-[0_14px_34px_rgba(0,0,0,0.65)] transition-[border-color,box-shadow,scale] sm:min-w-[214px] sm:max-w-[290px] sm:px-3.5 sm:pb-3.5 sm:pt-2.5',
              shake && 'animate-[gravityMeteorShake_240ms_ease-in-out]',
              isPrimedToExplode
                ? 'scale-[1.05] border-emerald-400 ring-2 ring-emerald-400/80 shadow-[0_0_28px_rgba(52,211,153,0.85)]'
                : isTypo
                  ? 'border-rose-400 ring-2 ring-rose-400/80 shadow-[0_0_24px_rgba(244,63,94,0.65)]'
                  : isMatchingPrefix
                    ? 'scale-[1.02] border-cyan-300 ring-2 ring-cyan-300/70 shadow-[0_0_22px_rgba(34,211,238,0.55)]'
                    : danger
                      ? 'border-rose-500 ring-2 ring-rose-500/70 shadow-[0_0_25px_rgba(244,63,94,0.55)]'
                      : isTarget
                        ? 'border-cyan-200/90 shadow-[0_14px_34px_rgba(0,0,0,0.65),0_0_18px_rgba(56,189,248,0.35)]'
                        : 'border-white/90'
            )}
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSpeak(meteor.promptText);
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_3px_10px_rgba(99,102,241,0.55)] transition hover:scale-105 hover:from-indigo-600 hover:to-violet-700 sm:h-7 sm:w-7"
                aria-label={t('studyUi.listenQuestion')}
              >
                <Volume2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>

              <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
                <p className="line-clamp-3 w-full break-words text-center text-xs font-extrabold leading-snug text-slate-900 sm:line-clamp-4 sm:text-sm">
                  {meteor.promptText}
                </p>

                {hasTyped && (
                  <div
                    data-testid="gravity-meteor-typed"
                    className="mt-1.5 flex flex-wrap items-end justify-center gap-1"
                  >
                    {Array.from(analysis.matchedSlice).map((ch, index) => (
                      <span
                        key={`m-${index}`}
                        className={cn(
                          'inline-block min-w-[11px] border-b-2 pb-0.5 text-center font-mono text-xs font-black leading-none sm:min-w-[13px] sm:text-sm',
                          isPrimedToExplode
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-teal-600/85 text-teal-700'
                        )}
                      >
                        {ch}
                      </span>
                    ))}
                    {Array.from(analysis.typoSlice).map((ch, index) => (
                      <span
                        key={`t-${index}`}
                        className="inline-block min-w-[11px] rounded-t border-b-2 border-rose-500 bg-rose-500/15 pb-0.5 text-center font-mono text-xs font-black leading-none text-rose-600 sm:min-w-[13px] sm:text-sm"
                      >
                        {ch}
                      </span>
                    ))}
                    {Array.from({ length: Math.min(8, analysis.remainingCount) }, (_, index) => (
                      <span
                        key={`r-${index}`}
                        aria-hidden="true"
                        className="inline-block h-3.5 w-2.5 border-b-2 border-slate-300/90 sm:w-3"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {meteor.hinted && (
              <div className="mt-1.5 rounded-lg border border-amber-300/80 bg-amber-100/95 px-2 py-0.5 text-center text-xs font-black tracking-wide text-amber-950">
                💡 {buildHintText(meteor.answerText)}
              </div>
            )}

            <div className="absolute inset-x-2 bottom-1 h-1 overflow-hidden rounded-full bg-slate-200/90">
              <div
                className={cn(
                  'h-full w-full origin-left rounded-full',
                  isPrimedToExplode
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    : isTypo || danger
                      ? 'bg-gradient-to-r from-orange-500 to-rose-600'
                      : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500'
                )}
                style={{ transform: `scaleX(${progress.toFixed(3)})` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
