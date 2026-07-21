import { describe, expect, it } from 'vitest';
import { renderPasswordResetEmail, resolveEmailLocale } from '../email';

describe('auth email localization', () => {
  it('Scenario: Password-reset email in English', () => {
    const content = renderPasswordResetEmail('https://example.com/reset', 'en');
    expect(content.subject).toContain('QuizFree');
    expect(content.subject.toLowerCase()).toContain('reset');
    expect(content.html).toContain('Click here');
  });

  it('Scenario: Fallback email locale for null preference', () => {
    expect(resolveEmailLocale(null, 'ja')).toBe('ja');
    const content = renderPasswordResetEmail('https://example.com/reset', 'ja');
    expect(content.subject).toContain('パスワード');
  });
});
