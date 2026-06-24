import { describe, expect, it } from 'vitest';
import { CANVAS_SIZE, MAX_MISTAKES } from './draw-config';

describe('draw-config', () => {
  it('MAX_MISTAKES is 3', () => {
    expect(MAX_MISTAKES).toBe(3);
  });

  it('CANVAS_SIZE is 280', () => {
    expect(CANVAS_SIZE).toBe(280);
  });
});
