/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/render-with-locale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';
import {
  GuideQuickPrompts,
  QUICK_PROMPT_KEYS,
  VISIBLE_PROMPT_COUNT,
} from '@/features/guide/components/GuideQuickPrompts';

const promptButtons = () =>
  screen.getAllByRole('button').filter((button) => !button.hasAttribute('aria-expanded'));

describe('GuideQuickPrompts', () => {
  afterEach(cleanup);

  it('shows a few questions, then the rest behind the "…" toggle', () => {
    renderWithLocale(<GuideQuickPrompts onSelect={vi.fn()} />);
    expect(promptButtons()).toHaveLength(VISIBLE_PROMPT_COUNT);

    const toggle = screen.getByRole('button', { expanded: false });
    fireEvent.click(toggle);
    expect(promptButtons()).toHaveLength(QUICK_PROMPT_KEYS.length);

    fireEvent.click(screen.getByRole('button', { expanded: true }));
    expect(promptButtons()).toHaveLength(VISIBLE_PROMPT_COUNT);
  });

  it('sends the question text when one is picked', () => {
    const onSelect = vi.fn();
    renderWithLocale(<GuideQuickPrompts onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(promptButtons().at(-1)!);
    expect(onSelect).toHaveBeenCalledWith(expect.any(String));
    expect(onSelect.mock.calls[0]![0]).not.toMatch(/^guideUi\./);
  });

  it('has every question translated in all locales', () => {
    for (const locale of ['vi', 'en', 'ja'] as const) {
      const catalog = loadCatalog(locale);
      for (const key of [...QUICK_PROMPT_KEYS, 'guideUi.morePrompts', 'guideUi.fewerPrompts']) {
        expect(t(catalog, key), `${locale} ${key}`).not.toBe(key);
      }
    }
  });
});
