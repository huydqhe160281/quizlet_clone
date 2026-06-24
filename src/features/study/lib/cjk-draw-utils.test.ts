import { describe, expect, it } from 'vitest';
import { isHanziWriterHanChar } from './cjk-draw-utils';

describe('cjk-draw-utils', () => {
  it('accepts single Han characters for hanzi-writer', () => {
    expect(isHanziWriterHanChar('大')).toBe(true);
    expect(isHanziWriterHanChar(' 水 ')).toBe(true);
  });

  it('rejects kana, Latin, and multi-char fronts for hanzi-writer', () => {
    expect(isHanziWriterHanChar('あ')).toBe(false);
    expect(isHanziWriterHanChar('ア')).toBe(false);
    expect(isHanziWriterHanChar('a')).toBe(false);
    expect(isHanziWriterHanChar('hello')).toBe(false);
    expect(isHanziWriterHanChar('你好')).toBe(false);
  });
});
