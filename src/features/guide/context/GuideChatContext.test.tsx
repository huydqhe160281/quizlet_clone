/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { useState } from 'react';
import { GuideChatProvider, useGuideChat } from '@/features/guide/context/GuideChatContext';

function SessionHarness() {
  const [showPanel, setShowPanel] = useState(true);
  const { messages, sendMessage } = useGuideChat();

  return (
    <>
      <span data-testid="message-count">{messages.length}</span>
      {showPanel && (
        <button type="button" onClick={() => void sendMessage('xin chào')}>
          send
        </button>
      )}
      <button type="button" onClick={() => setShowPanel(false)}>
        hide panel
      </button>
    </>
  );
}

describe('GuideChat session', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi
                .fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('ok') })
                .mockResolvedValueOnce({ done: true, value: undefined }),
            }),
          },
        })
      )
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps messages when panel consumer unmounts', async () => {
    render(
      <GuideChatProvider>
        <SessionHarness />
      </GuideChatProvider>
    );

    fireEvent.click(screen.getByText('send'));
    await waitFor(() => {
      expect(Number(screen.getByTestId('message-count').textContent)).toBeGreaterThan(0);
    });

    const countBefore = Number(screen.getByTestId('message-count').textContent);
    fireEvent.click(screen.getByText('hide panel'));
    expect(Number(screen.getByTestId('message-count').textContent)).toBe(countBefore);
  });
});
