/**
 * BCP-47 language for reading a card aloud, guessed from its script. Cards carry no
 * per-side language, and a fixed voice (English front, Vietnamese back) mispronounces
 * Japanese, Chinese or Korean cards and any set studied in the other direction.
 */
const KANA = /[぀-ヿㇰ-ㇿ]/;
const HANGUL = /[가-힯ᄀ-ᇿ]/;
const HAN = /[㐀-䶿一-鿿]/;
// Letters only Vietnamese uses in Latin script (đ, ơ, ư, ă and tone-marked vowels).
const VIETNAMESE = /[đĐơƠưƯăĂ]|[àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

export type SpeechLangHints = {
  /** Other text in the session contains kana, so kanji-only text is Japanese. */
  japanese?: boolean;
};

export function hasKana(text: string): boolean {
  return KANA.test(text);
}

export function guessSpeechLang(text: string, hints: SpeechLangHints = {}): string {
  if (KANA.test(text)) return 'ja-JP';
  if (HANGUL.test(text)) return 'ko-KR';
  if (HAN.test(text)) return hints.japanese ? 'ja-JP' : 'zh-CN';
  if (VIETNAMESE.test(text)) return 'vi-VN';
  return 'en-US';
}
