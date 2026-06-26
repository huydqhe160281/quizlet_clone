/**
 * @vitest-environment jsdom
 */
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { GuideChatMessage } from '@/features/guide/components/GuideChatMessage';

describe('GuideChatMessage', () => {
  afterEach(() => cleanup());

  it('renders safe internal links', () => {
    render(<GuideChatMessage role="assistant" content="Vào [Tạo bộ thẻ](/sets/new)" />);
    const link = screen.getByRole('link', { name: 'Tạo bộ thẻ' });
    expect(link).toHaveAttribute('href', '/sets/new');
  });

  it('renders bold markdown', () => {
    render(<GuideChatMessage role="assistant" content="**My Sets** là nơi quản lý bộ thẻ." />);
    expect(screen.getByText('My Sets').tagName).toBe('STRONG');
  });

  it('does not render javascript links', () => {
    render(<GuideChatMessage role="assistant" content="[click](javascript:alert(1))" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('click')).toBeInTheDocument();
  });

  it('does not render external http links', () => {
    render(<GuideChatMessage role="assistant" content="[Google](https://google.com)" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });
});
