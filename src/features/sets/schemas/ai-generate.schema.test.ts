import { describe, expect, it } from 'vitest';
import {
  aiGenerateInputSchema,
  buildAiFlashcardOutputSchema,
  trimAiFlashcardOutput,
} from '@/features/sets/schemas/ai-generate.schema';
import {
  DEFAULT_MOTAPI_SET_MODELS,
  MOTAPI_DEFAULT_BASE_URL,
  parseModelList,
  resolveMotapiApiKey,
  resolveMotapiBaseUrl,
} from '@/config/motapi-env';

describe('ai-generate.schema', () => {
  it('Scenario: Invalid card count above max', () => {
    const result = aiGenerateInputSchema.safeParse({
      prompt: 'Create vocabulary for travel',
      cardCount: 201,
    });
    expect(result.success).toBe(false);
  });

  it('Scenario: Invalid card count below min', () => {
    const result = aiGenerateInputSchema.safeParse({
      prompt: 'Create vocabulary for travel',
      cardCount: 4,
    });
    expect(result.success).toBe(false);
  });

  it('Scenario: Invalid prompt too short', () => {
    const result = aiGenerateInputSchema.safeParse({
      prompt: 'short',
      cardCount: 10,
    });
    expect(result.success).toBe(false);
  });

  it('allows missing cardCount for unlimited generation mode', () => {
    const result = aiGenerateInputSchema.safeParse({
      prompt: 'Create vocabulary for travel and family topics',
    });
    expect(result.success).toBe(true);
  });

  it('Scenario: Invalid prompt too long', () => {
    const result = aiGenerateInputSchema.safeParse({
      prompt: 'a'.repeat(10001),
      cardCount: 10,
    });
    expect(result.success).toBe(false);
  });

  it('buildAiFlashcardOutputSchema requires at least one card', () => {
    const schema = buildAiFlashcardOutputSchema(5);
    expect(
      schema.safeParse({
        title: 'Test',
        description: 'Desc',
        cards: Array.from({ length: 5 }, (_, i) => ({
          front: `term-${i}`,
          back: `def-${i}`,
        })),
      }).success
    ).toBe(true);
    expect(
      schema.safeParse({
        title: 'Test',
        description: 'Desc',
        cards: [],
      }).success
    ).toBe(false);
  });

  it('trimAiFlashcardOutput keeps only the requested card count', () => {
    const trimmed = trimAiFlashcardOutput(
      {
        title: 'Test',
        description: 'Desc',
        cards: Array.from({ length: 20 }, (_, i) => ({
          front: `term-${i}`,
          back: `def-${i}`,
        })),
      },
      15
    ) as { cards: unknown[] };

    expect(trimmed.cards).toHaveLength(15);
    expect(buildAiFlashcardOutputSchema(15).safeParse(trimmed).success).toBe(true);
  });
});

describe('motapi-env', () => {
  it('Scenario: Missing MotAPI key', () => {
    expect(() => resolveMotapiApiKey(undefined)).toThrow(
      'Missing required environment variable: MOTAPI_KEY'
    );
    expect(() => resolveMotapiApiKey('  ')).toThrow('MOTAPI_KEY');
    expect(resolveMotapiApiKey(' key ')).toBe('key');
  });

  it('defaults the base URL and strips a trailing slash', () => {
    expect(resolveMotapiBaseUrl(undefined)).toBe(MOTAPI_DEFAULT_BASE_URL);
    expect(resolveMotapiBaseUrl('https://proxy.example.com/v1/')).toBe(
      'https://proxy.example.com/v1'
    );
  });

  it('parses an ordered, de-duplicated model list from env', () => {
    expect(parseModelList(' a, b ,,a,c ', DEFAULT_MOTAPI_SET_MODELS)).toEqual(['a', 'b', 'c']);
    expect(parseModelList('', DEFAULT_MOTAPI_SET_MODELS)).toBe(DEFAULT_MOTAPI_SET_MODELS);
    expect(parseModelList(undefined, ['x'])).toEqual(['x']);
  });

  it('never defaults to a model known to be broken or wasteful', () => {
    for (const bad of ['claude-sonnet-4-6', 'grok-4.6', 'claude-sonnet-5', 'hy3', 'hy4-preview']) {
      expect(DEFAULT_MOTAPI_SET_MODELS).not.toContain(bad);
    }
  });
});

describe('normalizeAiFlashcardOutput', () => {
  it('trims, clips to the shared limits and drops empty cards', async () => {
    const { normalizeAiFlashcardOutput } =
      await import('@/features/sets/schemas/ai-generate.schema');
    const { CARD_FRONT_MAX } = await import('@/features/sets/cards/schemas/card.schema');
    const { SET_TITLE_MAX } = await import('@/features/sets/schemas/set.schema');

    const result = normalizeAiFlashcardOutput({
      title: 't'.repeat(SET_TITLE_MAX + 50),
      description: '  desc  ',
      cards: [
        { front: '  term ', back: ' def ', example: '   ' },
        { front: 'f'.repeat(CARD_FRONT_MAX + 10), back: 'b' },
        { front: '   ', back: 'orphan' },
      ],
    });

    expect(result?.title).toHaveLength(SET_TITLE_MAX);
    expect(result?.description).toBe('desc');
    expect(result?.cards).toEqual([
      { front: 'term', back: 'def' },
      { front: 'f'.repeat(CARD_FRONT_MAX), back: 'b' },
    ]);
  });

  it('returns null when no card survives', async () => {
    const { normalizeAiFlashcardOutput } =
      await import('@/features/sets/schemas/ai-generate.schema');
    expect(
      normalizeAiFlashcardOutput({
        title: 'x',
        description: '',
        cards: [{ front: ' ', back: 'b' }],
      })
    ).toBeNull();
  });
});
