import { describe, expect, it } from 'vitest';
import {
  sanitizeAssistantLinks,
  stripExternalAndUnsafeLinks,
} from '@/features/guide/lib/assistant.links';

describe('assistant.links', () => {
  const allowed = ['/sets/new', '/dashboard'];

  it('preserves valid internal links', () => {
    const input = 'Vào [Tạo bộ thẻ](/sets/new) để bắt đầu.';
    expect(sanitizeAssistantLinks(input, allowed)).toBe(input);
  });

  it('strips invalid internal links', () => {
    const input = 'Vào [Admin](/admin/secret) để bắt đầu.';
    expect(sanitizeAssistantLinks(input, allowed)).toBe('Vào Admin để bắt đầu.');
  });

  it('strips javascript URIs', () => {
    const input = '[click](javascript:alert(1))';
    expect(stripExternalAndUnsafeLinks(input, allowed)).toBe('click');
  });

  it('strips external http links', () => {
    const input = '[Google](https://google.com)';
    expect(stripExternalAndUnsafeLinks(input, allowed)).toBe('Google');
  });
});
