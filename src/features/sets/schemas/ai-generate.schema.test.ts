import { describe, expect, it } from 'vitest';
import {
  aiGenerateInputSchema,
  buildAiFlashcardOutputSchema,
  trimAiFlashcardOutput,
} from '@/features/sets/schemas/ai-generate.schema';
import { resolveOllamaBaseUrl, resolveOllamaModel } from '@/lib/ollama-env';

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

describe('ollama-env', () => {
  it('Scenario: Production missing Ollama URL', () => {
    expect(() => resolveOllamaBaseUrl('production', undefined)).toThrow(
      'Missing required environment variable: OLLAMA_BASE_URL'
    );
    expect(() => resolveOllamaModel('production', undefined)).toThrow(
      'Missing required environment variable: OLLAMA_MODEL'
    );
  });

  it('uses dev defaults in non-production', () => {
    expect(resolveOllamaBaseUrl('development')).toBe('http://localhost:11434/api');
    expect(resolveOllamaModel('development')).toBe('llama3');
  });
});
