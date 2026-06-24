export type PaginatedResponse<T> = {
  data: T[];
  pagination: { nextCursor: string | null; hasMore: boolean };
};

export type FlashcardSetSummary = {
  id: string;
  title: string;
  description: string | null;
  language: string | null;
  visibility: 'PRIVATE' | 'PUBLIC';
  coverImage: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count: { cards: number };
  tags: Array<{ tag: { id: string; name: string } }>;
};

export type FlashcardItem = {
  id: string;
  setId: string;
  front: string;
  back: string;
  example: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  type: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? 'Request failed');
  }
  return payload;
}

export async function fetchSets(cursor?: string) {
  const params = new URLSearchParams();
  if (cursor) {
    params.set('cursor', cursor);
  }
  const response = await fetch(`/api/v1/sets?${params.toString()}`);
  return parseJson<PaginatedResponse<FlashcardSetSummary>>(response);
}

export async function fetchSet(setId: string) {
  const response = await fetch(`/api/v1/sets/${setId}`);
  const payload = await parseJson<{ data: FlashcardSetSummary }>(response);
  return payload.data;
}

export async function fetchCards(setId: string) {
  const response = await fetch(`/api/v1/sets/${setId}/cards`);
  const payload = await parseJson<{ data: FlashcardItem[] }>(response);
  return payload.data;
}
