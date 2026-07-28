/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DueCardsAlert } from '@/features/dashboard/components/DueCardsAlert';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/i18n/LocaleProvider', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (key === 'dashboardPage.cardsDueToday') return `${params?.count} cards due today`;
    if (key === 'dashboardPage.keepStreak') return 'Keep streak';
    if (key === 'dashboardPage.startReview') return 'Start review';
    return key;
  },
}));

describe('DueCardsAlert', () => {
  it('Scenario: Due alert links to Today', () => {
    render(<DueCardsAlert dueCount={5} />);
    const link = screen.getByRole('link', { name: 'Start review' });
    expect(link).toHaveAttribute('href', '/today');
  });

  it('Scenario: No alert when none due', () => {
    const { container } = render(<DueCardsAlert dueCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
