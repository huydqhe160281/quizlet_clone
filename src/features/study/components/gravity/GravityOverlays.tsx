import Link from 'next/link';
import { Flame, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

export function GravityPausedOverlay({ onResume }: { onResume: () => void }) {
  const t = useTranslations();
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center backdrop-blur-md">
      <h3 className="text-2xl font-black text-white">{t('studyUi.gravityPausedTitle')}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-300">{t('studyUi.gravityPausedSubtitle')}</p>
      <Button
        type="button"
        onClick={onResume}
        className="mt-6 rounded-xl bg-emerald-500 px-6 font-bold text-slate-950 hover:bg-emerald-400"
      >
        <Play className="mr-2 h-4 w-4" />
        {t('studyUi.gravityResume')}
      </Button>
    </div>
  );
}

type GravityGameOverOverlayProps = {
  setId: string;
  score: number;
  maxCombo: number;
  destroyedCount: number;
  onReplay: () => void;
};

export function GravityGameOverOverlay({
  setId,
  score,
  maxCombo,
  destroyedCount,
  onReplay,
}: GravityGameOverOverlayProps) {
  const t = useTranslations();
  const stats = [
    { label: t('studyUi.gravityStatScore'), value: score, className: 'text-amber-400' },
    { label: t('studyUi.gravityStatCombo'), value: `X${maxCombo}`, className: 'text-orange-400' },
    {
      label: t('studyUi.gravityStatDestroyed'),
      value: destroyedCount,
      className: 'text-emerald-400',
    },
  ];

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/85 p-6 text-center backdrop-blur-md">
      <div className="max-w-md space-y-5 rounded-2xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
          <Flame className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-xl font-black text-white sm:text-2xl">
            {t('studyUi.gravityGameOverTitle')}
          </h3>
          <p className="text-xs text-slate-300 sm:text-sm">
            {t('studyUi.gravityGameOverSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-[11px] font-semibold text-slate-400">{stat.label}</p>
              <p className={`mt-0.5 text-lg font-black ${stat.className}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={onReplay}
            className="flex-1 rounded-xl bg-indigo-500 font-bold text-white hover:bg-indigo-600"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('studyUi.gravityReplay')}
          </Button>
          <Button
            variant="outline"
            asChild
            className="flex-1 rounded-xl border-white/20 bg-white/5 font-bold text-white hover:bg-white/15"
          >
            <Link href={`/sets/${setId}`}>{t('studyUi.exitStudy')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
