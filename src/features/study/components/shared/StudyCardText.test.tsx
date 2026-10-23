/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudyCardText, isDenseStudyText } from '@/features/study/components/shared/StudyCardText';

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

  it('uses compact left-aligned text for a long single-line definition', () => {
    const long =
      'A long definition sentence that would overflow a fixed-height card on a phone screen';
    const { container } = render(<StudyCardText text={long} side="back" />);

    const paragraph = container.querySelector('p');
    expect(paragraph).toHaveClass('text-left');
    expect(paragraph).toHaveClass('break-words');
    expect(paragraph).not.toHaveClass('text-xl');
  });

  it('flags only multi-line or long text as dense', () => {
    expect(isDenseStudyText('ア')).toBe(false);
    expect(isDenseStudyText('x'.repeat(60))).toBe(false);
    expect(isDenseStudyText('x'.repeat(61))).toBe(true);
    expect(isDenseStudyText('a\nb')).toBe(true);
  });
});
