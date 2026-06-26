import { describe, expect, it } from 'vitest';
import { assistantChatRequestSchema } from '@/features/guide/schemas/assistant-chat.schema';

describe('assistantChatRequestSchema', () => {
  it('accepts multi-turn history when assistant reply exceeds user limit', () => {
    const longAssistantReply = 'a'.repeat(600);
    const parsed = assistantChatRequestSchema.safeParse({
      messages: [
        { role: 'user', content: 'nói rõ hơn về chức năng tìm kiếm' },
        { role: 'assistant', content: longAssistantReply },
        { role: 'user', content: 'thư viện là gì' },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects user messages over 500 characters', () => {
    const parsed = assistantChatRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'x'.repeat(501) }],
    });

    expect(parsed.success).toBe(false);
  });
});
