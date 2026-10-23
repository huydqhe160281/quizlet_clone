/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

function mockPointer(coarse: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(pointer: coarse)' ? coarse : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

function renderDialog() {
  render(
    <Dialog open>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Settings</DialogTitle>
        <input aria-label="Cards per round" type="number" />
      </DialogContent>
    </Dialog>
  );
}

describe('DialogContent auto-focus', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('focuses the first field on desktop', () => {
    mockPointer(false);
    renderDialog();
    expect(screen.getByLabelText('Cards per round')).toHaveFocus();
  });

  it('keeps focus on the dialog, not the field, on touch devices', () => {
    mockPointer(true);
    renderDialog();
    expect(screen.getByLabelText('Cards per round')).not.toHaveFocus();
    expect(screen.getByRole('dialog')).toHaveFocus();
  });
});
