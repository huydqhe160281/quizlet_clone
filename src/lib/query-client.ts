import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';
import { defaultQueryOptions } from '@/lib/react-query-config';

export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: defaultQueryOptions,
    })
);
