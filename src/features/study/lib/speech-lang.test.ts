import { describe, expect, it } from 'vitest';
import { guessSpeechLang } from '@/features/study/lib/speech-lang';

describe('guessSpeechLang', () => {
  it.each([
    ['ありがとう', 'ja-JP'],
    ['勉強する', 'ja-JP'],
    ['안녕하세요', 'ko-KR'],
    ['你好', 'zh-CN'],
    ['xin chào', 'vi-VN'],
    ['Đà Nẵng', 'vi-VN'],
    ['hello world', 'en-US'],
  ])('%s → %s', (text, lang) => {
    expect(guessSpeechLang(text)).toBe(lang);
  });

  it('reads kanji-only text as Japanese in a session that uses kana', () => {
    expect(guessSpeechLang('勉強', { japanese: true })).toBe('ja-JP');
    expect(guessSpeechLang('勉強')).toBe('zh-CN');
  });
});
