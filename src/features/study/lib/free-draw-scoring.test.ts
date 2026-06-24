import { describe, expect, it } from 'vitest';
import { dilateMask, extractBoundaryMask, scoreFreeDrawMatch } from './free-draw-scoring';

const size = 120;
const width = size;
const height = size;

const emptyMask = (): Uint8Array => new Uint8Array(width * height);

const fillBox = (x0: number, y0: number, x1: number, y1: number): Uint8Array => {
  const mask = emptyMask();
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      mask[y * width + x] = 1;
    }
  }
  return mask;
};

const drawCross = (): Uint8Array => {
  const mask = emptyMask();
  for (let i = 20; i <= 100; i += 1) {
    const indexA = i * width + i;
    const indexB = i * width + (120 - i);
    mask[indexA] = 1;
    mask[indexB] = 1;
  }
  return dilateMask(mask, width, height, 1);
};

describe('scoreFreeDrawMatch', () => {
  it('rejects empty drawing', () => {
    const reference = fillBox(6, 4, 14, 16);
    const result = scoreFreeDrawMatch(emptyMask(), reference, width, height);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Hãy vẽ');
  });

  it('rejects scribble away from the reference outline', () => {
    const reference = fillBox(35, 25, 85, 95);
    const scribble = fillBox(0, 0, 18, 18);
    const result = scoreFreeDrawMatch(scribble, reference, width, height);
    expect(result.passed).toBe(false);
  });

  it('rejects dense scribble inside reference bounds', () => {
    const reference = fillBox(35, 25, 85, 95);
    const denseScribble = fillBox(35, 25, 85, 95);
    const result = scoreFreeDrawMatch(denseScribble, reference, width, height);
    expect(result.passed).toBe(false);
  });

  it('rejects cross shape drawn inside sample area', () => {
    const reference = fillBox(35, 25, 85, 95);
    const cross = drawCross();
    const result = scoreFreeDrawMatch(cross, reference, width, height);
    expect(result.passed).toBe(false);
  });

  it('accepts drawing that closely follows the reference outline', () => {
    const reference = fillBox(35, 25, 85, 95);
    const outline = extractBoundaryMask(reference, width, height);
    const traced = dilateMask(outline, width, height, 1);
    const result = scoreFreeDrawMatch(traced, reference, width, height);
    expect(result.passed).toBe(true);
  });
});
