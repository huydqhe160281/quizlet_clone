/**
 * @vitest-environment jsdom
 */
import { render, cleanup, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

const sendMessageMock = vi.fn();
const useGuideChatMock = vi.hoisted(() =>
  vi.fn(() => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: sendMessageMock,
  }))
);

vi.mock('@/features/guide/context/GuideChatContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/guide/context/GuideChatContext')>();
  return {
    ...actual,
    useGuideChat: useGuideChatMock,
  };
});

vi.mock('@/features/guide/components/GuideQuickPrompts', () => ({
  GuideQuickPrompts: () => null,
}));

import { GuideChatPanel } from '@/features/guide/components/GuideChatPanel';

describe('GuideChatPanel', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  afterEach(() => cleanup());

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<GuideChatPanel onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
