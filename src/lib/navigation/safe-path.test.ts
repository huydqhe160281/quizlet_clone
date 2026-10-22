import { describe, expect, it } from 'vitest';
import { isSafeInternalPath, safeInternalPath } from '@/lib/navigation/safe-path';
import { parseInlineMarkdown } from '@/features/guide/lib/assistant-markdown';
import { sanitizeAssistantLinks } from '@/features/guide/lib/assistant.links';

describe('isSafeInternalPath', () => {
  it.each(['/dashboard', '/sets/abc?tab=cards', '/today#goal'])('accepts %s', (path) => {
    expect(isSafeInternalPath(path)).toBe(true);
  });

  it.each([
    '//evil.com',
    '/\\evil.com',
    '/\\/evil.com',
    '/\tevil.com',
    '/%0a/evil.com'.replace('%0a', '\n'),
    'https://evil.com',
    'javascript:alert(1)',
    'dashboard',
    '',
    null,
  ])('rejects %j', (path) => {
    expect(isSafeInternalPath(path)).toBe(false);
  });

  it('falls back for an open-redirect callbackUrl', () => {
    expect(safeInternalPath('/\\evil.com', '/dashboard')).toBe('/dashboard');
  });
});

describe('assistant links', () => {
  it('renders protocol-relative and backslash links as plain text', () => {
    for (const href of ['//evil.com', '/\\evil.com']) {
      expect(parseInlineMarkdown(`[go](${href})`)).toEqual([{ kind: 'text', value: 'go' }]);
    }
  });

  it('keeps allowed internal links and strips the rest', () => {
    expect(sanitizeAssistantLinks('[Sets](/sets) [x](//evil.com)', ['/sets', '//evil.com'])).toBe(
      '[Sets](/sets) x'
    );
  });
});
