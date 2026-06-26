import { describe, expect, it } from 'vitest';
import {
  normalizeAssistantContent,
  parseAssistantMarkdown,
  parseInlineMarkdown,
} from '@/features/guide/lib/assistant-markdown';

describe('assistant-markdown', () => {
  it('parses bold and links inline', () => {
    const segments = parseInlineMarkdown('Vào **My Sets** tại [đây](/sets)');
    expect(segments).toEqual(
      expect.arrayContaining([
        { kind: 'text', value: 'Vào ' },
        { kind: 'bold', value: 'My Sets' },
        { kind: 'text', value: ' tại ' },
        { kind: 'link', label: 'đây', href: '/sets' },
      ])
    );
  });

  it('parses ordered and bullet lists', () => {
    const blocks = parseAssistantMarkdown(
      'Chào bạn!\n\n1. **Bước 1:** Làm A\n2. **Bước 2:** Làm B\n\n- **Flashcards:** học thẻ'
    );

    expect(blocks[0]?.kind).toBe('paragraph');
    expect(blocks[1]?.kind).toBe('ordered');
    expect(blocks.some((block) => block.kind === 'bullet')).toBe(true);
  });

  it('merges numbered steps split by blank lines', () => {
    const blocks = parseAssistantMarkdown(
      '1. **Bước 1:** A\n\n1. **Bước 2:** B\n\n1. **Bước 3:** C'
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe('ordered');
    if (blocks[0]?.kind === 'ordered') {
      expect(blocks[0].items).toHaveLength(3);
    }
  });

  it('normalizes inline numbered steps onto separate lines', () => {
    const normalized = normalizeAssistantContent(
      'Bắt đầu nhé: 1. **My Sets:** xem danh sách 2. **Study:** học'
    );
    expect(normalized).toContain('\n2. **Study:**');
  });
});
