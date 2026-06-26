/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@/features/guide/components/GuideChatPanel', () => ({
  GuideChatPanel: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      panel
    </button>
  ),
}));

import { GuideChatWidget } from '@/features/guide/components/GuideChatWidget';
import { GuideChatProvider } from '@/features/guide/context/GuideChatContext';

describe('GuideChatWidget', () => {
  afterEach(() => cleanup());

  it('shows FAB by default', () => {
    render(
      <GuideChatProvider>
        <GuideChatWidget />
      </GuideChatProvider>
    );
    expect(screen.getByLabelText('Mở trợ lý hướng dẫn')).toBeInTheDocument();
  });

  it('hides after FAB dismiss button', () => {
    render(
      <GuideChatProvider>
        <GuideChatWidget />
      </GuideChatProvider>
    );
    fireEvent.click(screen.getByLabelText('Ẩn trợ lý hướng dẫn'));
    expect(screen.queryByLabelText('Mở trợ lý hướng dẫn')).not.toBeInTheDocument();
  });

  it('keeps FAB visible when panel closes', () => {
    render(
      <GuideChatProvider>
        <GuideChatWidget />
      </GuideChatProvider>
    );
    fireEvent.click(screen.getByLabelText('Mở trợ lý hướng dẫn'));
    fireEvent.click(screen.getByText('panel'));
    expect(screen.getByLabelText('Mở trợ lý hướng dẫn')).toBeInTheDocument();
  });
});
