/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RestoreHearts } from './RestoreHearts';

function hearts() {
  const svgs = Array.from(screen.getByRole('img').querySelectorAll('svg'));
  return svgs.map((svg) => ({
    // The intact heart layer is hidden once a heart is broken.
    broken: (svg.lastElementChild as SVGGElement).style.opacity === '0',
    pending: svg.getAttribute('class')?.includes('animate-heart-pending') ?? false,
  }));
}

describe('RestoreHearts', () => {
  afterEach(cleanup);

  it('shows whole hearts first and cracked hearts for spent restores', () => {
    render(<RestoreHearts balance={3} max={5} label="3 of 5 restores left" />);
    expect(screen.getByRole('img', { name: '3 of 5 restores left' })).toBeTruthy();
    expect(hearts().map((h) => h.broken)).toEqual([false, false, false, true, true]);
  });

  it('pulses the rightmost whole hearts a restore would spend', () => {
    render(<RestoreHearts balance={4} max={5} pending={2} label="x" />);
    expect(hearts().map((h) => h.pending)).toEqual([false, false, true, true, false]);
  });

  it('clamps the balance into 0..max', () => {
    render(<RestoreHearts balance={9} max={5} label="x" />);
    expect(hearts().every((h) => !h.broken)).toBe(true);
  });
});
