import { describe, expect, it } from 'vitest';
import { isStudySessionPath } from './study-focus';

describe('isStudySessionPath', () => {
  it.each([
    '/sets/abc123/flashcard',
    '/sets/abc123/learn',
    '/sets/abc123/write',
    '/sets/abc123/test',
    '/sets/abc123/draw',
    '/sets/abc123/learn/',
  ])('matches study screen %s', (path) => {
    expect(isStudySessionPath(path)).toBe(true);
  });

  it.each([
    null,
    undefined,
    '',
    '/sets',
    '/sets/abc123',
    '/sets/abc123/edit',
    '/sets/abc123/study',
    '/sets/new',
    '/today',
    '/sets/abc123/learn/extra',
  ])('does not match %s', (path) => {
    expect(isStudySessionPath(path)).toBe(false);
  });
});
