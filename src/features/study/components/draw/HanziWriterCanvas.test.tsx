/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HanziWriterCanvas } from './HanziWriterCanvas';

vi.mock('hanzi-writer', () => ({
  default: {
    create: () => ({
      quiz: vi.fn(),
      cancelQuiz: vi.fn(),
    }),
  },
}));

describe('HanziWriterCanvas', () => {
  it('shows validation feedback when submitting empty free draw', () => {
    render(<HanziWriterCanvas character="あ" back="a" onComplete={vi.fn()} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xong' }));
    expect(screen.getByText(/Hãy vẽ ký tự trước/i)).toBeInTheDocument();
  });
});
