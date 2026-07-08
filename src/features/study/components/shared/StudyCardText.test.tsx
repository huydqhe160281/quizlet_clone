/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudyCardText } from '@/features/study/components/shared/StudyCardText';

describe('StudyCardText', () => {
  it('preserves line breaks for multiline quiz content', () => {
    const { container } = render(
      <StudyCardText text={'Câu hỏi?\n\na. Một\nb. Hai\nc. Ba\nd. Bốn'} side="front" />
    );

    const paragraph = container.querySelector('p');
    expect(paragraph).toHaveClass('whitespace-pre-line');
    expect(paragraph).toHaveClass('text-left');
    expect(screen.getByText(/Câu hỏi\?/)).toBeInTheDocument();
    expect(screen.getByText(/a\. Một/)).toBeInTheDocument();
  });

  it('keeps compact styling for single-line flashcards', () => {
    const { container } = render(<StudyCardText text="Hello" side="front" />);

    const paragraph = container.querySelector('p');
    expect(paragraph).toHaveClass('text-center');
    expect(paragraph).toHaveClass('text-3xl');
  });
});
