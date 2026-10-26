/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/render-with-locale';
import { ConfirmDialog } from './ConfirmDialog';

const baseProps = {
  open: true,
  title: 'Delete this set?',
  description: 'This cannot be undone.',
  confirmLabel: 'Delete',
  pendingLabel: 'Deleting…',
};

describe('ConfirmDialog', () => {
  afterEach(cleanup);

  it('confirms or cancels through its buttons', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    renderWithLocale(
      <ConfirmDialog {...baseProps} onConfirm={onConfirm} onOpenChange={onOpenChange} />,
      { locale: 'en' }
    );

    expect(screen.getByRole('dialog', { name: 'Delete this set?' })).toHaveAccessibleDescription(
      'This cannot be undone.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('locks the buttons and shows errors while pending', () => {
    const onOpenChange = vi.fn();
    renderWithLocale(
      <ConfirmDialog
        {...baseProps}
        isPending
        error="Could not delete."
        onConfirm={vi.fn()}
        onOpenChange={onOpenChange}
      />,
      { locale: 'en' }
    );

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByText('Could not delete.')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
