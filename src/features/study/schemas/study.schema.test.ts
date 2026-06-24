import { describe, expect, it } from 'vitest';
import { studyModeSchema } from './study.schema';

describe('studyModeSchema', () => {
  it('accepts DRAW', () => {
    expect(studyModeSchema.parse('DRAW')).toBe('DRAW');
  });
});
