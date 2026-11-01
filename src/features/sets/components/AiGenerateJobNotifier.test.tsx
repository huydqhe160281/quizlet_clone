/**
 * @vitest-environment jsdom
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { loadCatalog } from '@/lib/i18n/catalog';
import { useAiGenerateJobStore } from '@/features/sets/ai-generate-job-store';

const pushMock = vi.fn();
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('sonner', () => ({ toast: toastMock }));

import { AiGenerateJobNotifier } from './AiGenerateJobNotifier';

const enCatalog = loadCatalog('en');

function renderNotifier() {
  return render(
    <LocaleProvider locale="en" catalog={enCatalog}>
      <AiGenerateJobNotifier />
    </LocaleProvider>
  );
}

const mockFetch = vi.fn();

describe('AiGenerateJobNotifier', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    pushMock.mockClear();
    toastMock.success.mockClear();
    toastMock.error.mockClear();
    useAiGenerateJobStore.setState({ job: null, watched: false });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('Scenario: Set ready while the modal is closed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        data: {
          set: { id: 'set-9', title: 'Travel', description: null, visibility: 'PRIVATE' },
          cards: [{ id: 'c1', front: 'a', back: 'b', example: null, sortOrder: 0 }],
        },
      }),
    });
    renderNotifier();

    await act(async () => {
      useAiGenerateJobStore.getState().start({ prompt: 'Travel vocabulary please' });
    });

    expect(toastMock.success).toHaveBeenCalledWith(
      'Your AI set is ready',
      expect.objectContaining({ description: 'Travel · 1 cards', duration: Infinity })
    );
    const { action } = toastMock.success.mock.calls[0]![1] as {
      action: { label: string; onClick: () => void };
    };
    expect(action.label).toBe('Open set');
    action.onClick();
    expect(pushMock).toHaveBeenCalledWith('/sets/set-9');
    expect(useAiGenerateJobStore.getState().job).toBeNull();
  });

  it('Scenario: Generation fails while the modal is closed', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'AI_GENERATION_FAILED', message: 'Failed' }),
    });
    renderNotifier();

    await act(async () => {
      useAiGenerateJobStore.getState().start({ prompt: 'Travel vocabulary please' });
    });

    expect(toastMock.error).toHaveBeenCalledWith(
      'AI set generation failed',
      expect.objectContaining({ duration: Infinity })
    );
  });

  it('stays quiet while the modal is open (it shows the result itself)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        data: {
          set: { id: 'set-9', title: 'Travel', description: null, visibility: 'PRIVATE' },
          cards: [],
        },
      }),
    });
    renderNotifier();
    useAiGenerateJobStore.setState({ watched: true });

    await act(async () => {
      useAiGenerateJobStore.getState().start({ prompt: 'Travel vocabulary please' });
    });

    expect(toastMock.success).not.toHaveBeenCalled();
    expect(useAiGenerateJobStore.getState().job?.status).toBe('succeeded');
  });

  it('does not start a second job while one is running', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { start } = useAiGenerateJobStore.getState();

    expect(start({ prompt: 'first prompt here' })).toBe(true);
    expect(start({ prompt: 'second prompt here' })).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
