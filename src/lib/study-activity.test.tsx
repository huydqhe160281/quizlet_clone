/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { act, cleanup, render } from '@testing-library/react';
import { QueryProvider } from '@/components/providers/query-provider';
import { notifyStudyActivity } from '@/lib/study-activity';
import { todayKeys } from '@/features/today/query-keys';
import { setKeys } from '@/features/sets/query-keys';

vi.mock('@tanstack/react-query-devtools', () => ({ ReactQueryDevtools: () => null }));

describe('study activity invalidation', () => {
  afterEach(() => {
    cleanup();
  });

  it('marks Today and due-card queries stale after study, leaving set queries alone', () => {
    let client: QueryClient | undefined;
    function Capture() {
      client = useQueryClient();
      return null;
    }
    render(
      <QueryProvider>
        <Capture />
      </QueryProvider>
    );
    client!.setQueryData(todayKeys.plan(), { goal: 1 });
    client!.setQueryData(['study', 'due-cards'], { data: [] });
    client!.setQueryData(setKeys.list(), { data: [] });

    act(() => {
      notifyStudyActivity();
    });

    expect(client!.getQueryState(todayKeys.plan())?.isInvalidated).toBe(true);
    expect(client!.getQueryState(['study', 'due-cards'])?.isInvalidated).toBe(true);
    expect(client!.getQueryState(setKeys.list())?.isInvalidated).toBe(false);
  });
});
