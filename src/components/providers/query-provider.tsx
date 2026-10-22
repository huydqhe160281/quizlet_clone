'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState, type ReactNode } from 'react';
import { isDevelopment } from '@/config/runtime-env';
import { defaultQueryOptions } from '@/lib/react-query-config';
import { STUDY_ACTIVITY_EVENT, invalidateStudyActivityQueries } from '@/lib/study-activity';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: defaultQueryOptions,
      })
  );

  useEffect(() => {
    const onStudyActivity = () => invalidateStudyActivityQueries(queryClient);
    window.addEventListener(STUDY_ACTIVITY_EVENT, onStudyActivity);
    return () => window.removeEventListener(STUDY_ACTIVITY_EVENT, onStudyActivity);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
