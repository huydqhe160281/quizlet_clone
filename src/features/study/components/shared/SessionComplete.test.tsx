/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { SessionComplete } from './SessionComplete';
import { renderWithLocale } from '@/test/render-with-locale';

describe('SessionComplete (Flashcard)', () => {
  afterEach(cleanup);

  it('never reports more reviewed cards than the set has when cards were requeued', () => {
    renderWithLocale(
      <SessionComplete mode="FLASHCARD" correctCount={0} reviewedCount={13} total={10} setId="s" />,
      { locale: 'en' }
    );
    expect(screen.getByText('10/10')).toBeInTheDocument();
  });
});
