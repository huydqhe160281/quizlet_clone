'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAiGenerateJobStore } from '@/features/sets/ai-generate-job-store';
import { aiGenerateErrorMessage } from '@/features/sets/lib/ai-generate-error-message';
import { useTranslations } from '@/lib/i18n/LocaleProvider';

/**
 * Announces a finished AI set generation that the modal is not showing (it was closed while
 * the job ran), with the same persistent toast style as the PWA update prompt. Mounted once
 * in the app layout so it works on any page.
 */
export function AiGenerateJobNotifier() {
  const t = useTranslations();
  const router = useRouter();
  const tRef = useRef(t);
  tRef.current = t;
  const routerRef = useRef(router);
  routerRef.current = router;
  const running = useAiGenerateJobStore((state) => state.job?.status === 'running');

  useEffect(
    () =>
      useAiGenerateJobStore.subscribe((state, prev) => {
        const job = state.job;
        if (!job || job === prev.job || job.status === 'running' || state.watched) return;
        const translate = tRef.current;
        state.clear();

        if (job.status === 'succeeded') {
          toast.success(translate('aiGenerate.readyTitle'), {
            description: translate('aiGenerate.readyDescription', {
              title: job.set.title,
              count: job.cards.length,
            }),
            duration: Infinity,
            action: {
              label: translate('aiGenerate.readyOpen'),
              onClick: () => routerRef.current.push(`/sets/${job.set.id}`),
            },
          });
          return;
        }

        toast.error(translate('aiGenerate.failedTitle'), {
          description: aiGenerateErrorMessage(translate, job.error),
          duration: Infinity,
          closeButton: true,
        });
      }),
    []
  );

  // A reload or tab close would drop the running request.
  useEffect(() => {
    if (!running) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [running]);

  return null;
}
