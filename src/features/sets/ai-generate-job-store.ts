import { create } from 'zustand';

export type GeneratedCard = {
  id: string;
  front: string;
  back: string;
  example: string | null;
  sortOrder: number;
};

export type GeneratedSet = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
};

export type AiGenerateRequest = { prompt: string; cardCount?: number };

export type AiGenerateJobError =
  | { kind: 'quota-unverified'; limit?: number }
  | { kind: 'rate-limit' }
  | { kind: 'api'; payload: { error?: string; message?: string } }
  | { kind: 'network' };

export type AiGenerateJob =
  | { id: number; status: 'running' }
  | { id: number; status: 'succeeded'; set: GeneratedSet; cards: GeneratedCard[] }
  | { id: number; status: 'failed'; error: AiGenerateJobError };

type AiGenerateJobState = {
  job: AiGenerateJob | null;
  /** True while the AI modal is open: it shows the result itself; otherwise a toast does. */
  watched: boolean;
  /** Starts a generation unless one is already running. Returns false when it did not start. */
  start: (request: AiGenerateRequest) => boolean;
  setWatched: (watched: boolean) => void;
  clear: () => void;
};

type GenerateResponse = {
  data?: { set: GeneratedSet; cards: GeneratedCard[] };
  error?: string;
  message?: string;
  details?: { limit?: number };
};

let nextJobId = 1;

/**
 * App-wide AI set generation job. The request lives here, not in the modal, so it keeps
 * running when the modal closes or the user navigates inside the app; `AiGenerateJobNotifier`
 * announces the result when nobody is watching. A full page reload drops it (the server may
 * still finish and save the draft set).
 */
export const useAiGenerateJobStore = create<AiGenerateJobState>((set, get) => ({
  job: null,
  watched: false,
  start: (request) => {
    if (get().job?.status === 'running') return false;
    const id = nextJobId++;
    set({ job: { id, status: 'running' } });

    const finish = (job: AiGenerateJob) => {
      // A cleared or replaced job must not be overwritten by a late response.
      if (get().job?.id === id) set({ job });
    };

    void runGenerateRequest(request).then((outcome) => finish({ id, ...outcome }));
    return true;
  },
  setWatched: (watched) => set({ watched }),
  clear: () => set({ job: null }),
}));

type JobOutcome =
  | { status: 'succeeded'; set: GeneratedSet; cards: GeneratedCard[] }
  | { status: 'failed'; error: AiGenerateJobError };

async function runGenerateRequest(request: AiGenerateRequest): Promise<JobOutcome> {
  try {
    const response = await fetch('/api/v1/ai/generate-set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const payload = (await response.json()) as GenerateResponse;

    if (!response.ok) {
      if (payload.error === 'AI_QUOTA_UNVERIFIED') {
        return {
          status: 'failed',
          error: { kind: 'quota-unverified', limit: payload.details?.limit },
        };
      }
      if (response.status === 429) {
        return { status: 'failed', error: { kind: 'rate-limit' } };
      }
      return { status: 'failed', error: { kind: 'api', payload } };
    }
    if (!payload.data) {
      return { status: 'failed', error: { kind: 'api', payload } };
    }
    return { status: 'succeeded', set: payload.data.set, cards: payload.data.cards };
  } catch {
    return { status: 'failed', error: { kind: 'network' } };
  }
}
