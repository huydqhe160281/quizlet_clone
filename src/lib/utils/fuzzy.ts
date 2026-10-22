export const FUZZY_THRESHOLD = 0.85;

// Diacritics are meaningful (Vietnamese tones, Japanese dakuten: má ≠ mà, か ≠ が),
// so only case and whitespace are normalized. NFC keeps each accented letter a
// single code point for the Jaro-Winkler comparison.
const normalize = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase().normalize('NFC');

/** Key under which two answers count as the same text (case/whitespace-insensitive). */
export const answerKey = normalize;

const stripMarks = (value: string): string => value.normalize('NFD').replace(/\p{M}/gu, '');

const jaro = (s1: string, s2: string): number => {
  if (s1 === s2) {
    return 1;
  }
  if (s1.length === 0 || s2.length === 0) {
    return 0;
  }

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array<boolean>(s1.length).fill(false);
  const s2Matches = new Array<boolean>(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);
    for (let j = start; j < end; j += 1) {
      if (s2Matches[j] || s1[i] !== s2[j]) {
        continue;
      }
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches += 1;
      break;
    }
  }

  if (matches === 0) {
    return 0;
  }

  let k = 0;
  for (let i = 0; i < s1.length; i += 1) {
    if (!s1Matches[i]) {
      continue;
    }
    while (!s2Matches[k]) {
      k += 1;
    }
    if (s1[i] !== s2[k]) {
      transpositions += 1;
    }
    k += 1;
  }

  return (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
};

export function jaroWinkler(a: string, b: string): number {
  const s1 = normalize(a);
  const s2 = normalize(b);
  const jaroScore = jaro(s1, s2);

  let prefix = 0;
  const maxPrefix = 4;
  while (prefix < maxPrefix && prefix < s1.length && s1[prefix] === s2[prefix]) {
    prefix += 1;
  }

  return jaroScore + prefix * 0.1 * (1 - jaroScore);
}

export function fuzzyMatch(input: string, expected: string, threshold = FUZZY_THRESHOLD): boolean {
  const a = normalize(input);
  const b = normalize(expected);
  if (a === b) return true;
  // Answers that differ only in diacritics are different words, not typos.
  if (stripMarks(a) === stripMarks(b)) return false;
  return jaroWinkler(a, b) >= threshold;
}

export function fuzzySimilarity(input: string, expected: string): number {
  return jaroWinkler(input, expected);
}
