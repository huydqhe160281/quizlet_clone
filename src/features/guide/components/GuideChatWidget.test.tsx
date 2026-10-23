/**
 * @vitest-environment jsdom
 */
import { screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderWithLocale } from '@/test/render-with-locale';

const pathnameMock = vi.hoisted(() => ({ current: '/dashboard' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathnameMock.current }));

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
  afterEach(() => {
    cleanup();
    pathnameMock.current = '/dashboard';
  });

  it('shows FAB by default', () => {
    renderWithLocale(
      <GuideChatProvider>
        <GuideChatWidget />
      </GuideChatProvider>
    );
    expect(screen.getByLabelText('Mở trợ lý hướng dẫn')).toBeInTheDocument();
  });

  it('hides after FAB dismiss button', () => {
    renderWithLocale(
      <GuideChatProvider>
        <GuideChatWidget />
      </GuideChatProvider>
    );
    fireEvent.click(screen.getByLabelText('Ẩn trợ lý hướng dẫn'));
    expect(screen.queryByLabelText('Mở trợ lý hướng dẫn')).not.toBeInTheDocument();
  });

  it('keeps FAB visible when panel closes', () => {
    renderWithLocale(
      <GuideChatProvider>
        <GuideChatWidget />
      </GuideChatProvider>
    );
    fireEvent.click(screen.getByLabelText('Mở trợ lý hướng dẫn'));
    fireEvent.click(screen.getByText('panel'));
    expect(screen.getByLabelText('Mở trợ lý hướng dẫn')).toBeInTheDocument();
  });

  it('hides the FAB below md on study screens (focus mode)', () => {
    pathnameMock.current = '/sets/abc123/learn';
    renderWithLocale(
      <GuideChatProvider>
        <GuideChatWidget />
      </GuideChatProvider>
    );
    expect(screen.getByLabelText('Mở trợ lý hướng dẫn').parentElement).toHaveClass('max-md:hidden');
  });

  it('keeps the FAB on phones outside study screens', () => {
    renderWithLocale(
      <GuideChatProvider>
        <GuideChatWidget />
      </GuideChatProvider>
    );
    expect(screen.getByLabelText('Mở trợ lý hướng dẫn').parentElement).not.toHaveClass(
      'max-md:hidden'
    );
  });
});
