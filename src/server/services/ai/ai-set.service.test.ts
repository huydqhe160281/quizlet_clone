import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  flashcardSet: {
    create: vi.fn(),
  },
}));

const generateTextMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/db', () => ({
  prisma: prismaMock,
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('ai', () => ({
  generateText: generateTextMock,
  Output: {
    json: vi.fn(() => ({ type: 'json' })),
  },
}));

vi.mock('@/config/env', () => ({
  env: { motapiSetModels: ['model-a', 'model-b', 'model-c', 'model-d'] },
}));

vi.mock('@/server/ai/motapi', () => ({
  getMotapiJsonModel: vi.fn((modelId: string) => `mock:${modelId}`),
}));

import { revalidateTag } from 'next/cache';
import { generateAiSet } from '@/server/services/ai/ai-set.service';

const validInput = {
  prompt: 'Create 5 Japanese family vocabulary words',
  cardCount: 5,
};

const mockGenerated = {
  title: 'Japanese Family',
  description: 'Basic family terms',
  cards: [
    { front: '家族', back: 'family', example: '家族は大切です。' },
    { front: '父', back: 'father' },
    { front: '母', back: 'mother' },
    { front: '兄', back: 'older brother' },
    { front: '姉', back: 'older sister' },
  ],
};

describe('ai-set.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    generateTextMock.mockResolvedValue({ output: mockGenerated });
    prismaMock.flashcardSet.create.mockResolvedValue({
      id: 'set-ai-1',
      title: mockGenerated.title,
      description: mockGenerated.description,
      visibility: 'PRIVATE',
      userId: 'user-a',
      cards: mockGenerated.cards.map((card, index) => ({
        id: `card-${index}`,
        ...card,
        example: card.example ?? null,
        sortOrder: index,
      })),
    });
  });

  it('Scenario: Successful generation', async () => {
    const result = await generateAiSet('user-a', validInput);
    expect(result.id).toBe('set-ai-1');
    expect(generateTextMock).toHaveBeenCalled();
    expect(prismaMock.flashcardSet.create).toHaveBeenCalled();
  });

  it('Scenario: Draft visibility', async () => {
    await generateAiSet('user-a', validInput);
    expect(prismaMock.flashcardSet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ visibility: 'PRIVATE' }),
      })
    );
  });

  it('disables SDK retries and passes the attempt signal', async () => {
    await generateAiSet('user-a', validInput);
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mock:model-a',
        maxRetries: 0,
        abortSignal: expect.any(AbortSignal),
      })
    );
  });

  it('switches to the next model when output is unparsable', async () => {
    generateTextMock
      .mockResolvedValueOnce({ output: { title: 'x', cards: 'not an array' } })
      .mockResolvedValueOnce({ output: mockGenerated });

    await expect(generateAiSet('user-a', validInput)).resolves.toMatchObject({ id: 'set-ai-1' });
    expect(generateTextMock.mock.calls.map((call) => call[0].model)).toEqual([
      'mock:model-a',
      'mock:model-b',
    ]);
  });

  it('switches model when every card is empty', async () => {
    generateTextMock
      .mockResolvedValueOnce({
        output: { title: 't', description: 'd', cards: [{ front: ' ', back: '' }] },
      })
      .mockResolvedValueOnce({ output: mockGenerated });

    await generateAiSet('user-a', validInput);
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after 3 models and never calls the 4th', async () => {
    generateTextMock.mockRejectedValue(new Error('500'));
    await expect(generateAiSet('user-a', validInput)).rejects.toMatchObject({
      code: 'AI_GENERATION_FAILED',
    });
    expect(generateTextMock.mock.calls.map((call) => call[0].model)).toEqual([
      'mock:model-a',
      'mock:model-b',
      'mock:model-c',
    ]);
  });

  it('Scenario: LLM returns valid structure', async () => {
    await generateAiSet('user-a', validInput);
    expect(prismaMock.flashcardSet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cards: expect.objectContaining({
            createMany: {
              data: expect.arrayContaining([
                expect.objectContaining({ front: '家族', back: 'family' }),
              ]),
            },
          }),
        }),
      })
    );
  });

  it('Scenario: LLM returns invalid structure', async () => {
    generateTextMock.mockRejectedValue(new Error('Invalid JSON'));
    await expect(generateAiSet('user-a', validInput)).rejects.toMatchObject({
      code: 'AI_GENERATION_FAILED',
      status: 502,
    });
    expect(prismaMock.flashcardSet.create).not.toHaveBeenCalled();
  });

  it('Scenario: MotAPI connection refused', async () => {
    generateTextMock.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(generateAiSet('user-a', validInput)).rejects.toMatchObject({
      code: 'AI_GENERATION_FAILED',
      status: 502,
    });
  });

  it('Scenario: New draft appears in sets list', async () => {
    await generateAiSet('user-a', validInput);
    expect(revalidateTag).toHaveBeenCalledWith('sets-user-a');
  });

  it('Scenario: Guided mode without card limit keeps all generated cards', async () => {
    const unlimitedInput = {
      prompt: 'Generate full hiragana flashcards without card limit',
    };

    await generateAiSet('user-a', unlimitedInput);

    expect(prismaMock.flashcardSet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cards: expect.objectContaining({
            createMany: { data: expect.any(Array) },
          }),
        }),
      })
    );
  });
});
