export type McqOption = {
  key: string;
  text: string;
  label: string;
};

export type ParsedEmbeddedMcq = {
  stem: string;
  options: McqOption[];
  correctKey: string;
  correctLabel: string;
};

const OPTION_LINE = /^([a-dA-D])[\.)]\s*(.+)$/;
const BACK_KEY = /^([a-dA-D])\b/i;
const INLINE_OPTION = /\b([a-dA-D])[\.)]\s*([\s\S]*?)(?=\s+[a-dA-D][\.)]|$)/g;

function toOption(key: string, text: string): McqOption {
  const normalizedKey = key.toLowerCase();
  return {
    key: normalizedKey,
    text: text.trim(),
    label: `${normalizedKey}. ${text.trim()}`,
  };
}

function parseMultilineOptions(front: string): { stem: string; options: McqOption[] } | null {
  const lines = front.split('\n');
  const options: McqOption[] = [];
  let firstOptionLineIdx = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index]?.trim().match(OPTION_LINE);
    if (!match) {
      continue;
    }
    if (firstOptionLineIdx === -1) {
      firstOptionLineIdx = index;
    }
    options.push(toOption(match[1], match[2]));
  }

  if (options.length < 2 || firstOptionLineIdx <= 0) {
    return null;
  }

  const stem = lines.slice(0, firstOptionLineIdx).join('\n').trim();
  if (!stem) {
    return null;
  }

  return { stem, options };
}

function parseInlineOptions(front: string): { stem: string; options: McqOption[] } | null {
  const firstOption = front.search(/\b[a-dA-D][\.)]\s/);
  if (firstOption === -1) {
    return null;
  }

  const stem = front.slice(0, firstOption).trim();
  const optionsPart = front.slice(firstOption);
  const options: McqOption[] = [];

  for (const match of optionsPart.matchAll(INLINE_OPTION)) {
    options.push(toOption(match[1], match[2]));
  }

  if (options.length < 2 || !stem) {
    return null;
  }

  return { stem, options };
}

/** Parse MCQ options embedded in card front when back is an answer letter (a–d). */
export function parseEmbeddedMcq(front: string, back: string): ParsedEmbeddedMcq | null {
  const backMatch = back.trim().match(BACK_KEY);
  if (!backMatch) {
    return null;
  }

  const correctKey = backMatch[1].toLowerCase();
  const parsed = parseMultilineOptions(front) ?? parseInlineOptions(front);
  if (!parsed) {
    return null;
  }

  const correctOption = parsed.options.find((option) => option.key === correctKey);
  if (!correctOption) {
    return null;
  }

  return {
    stem: parsed.stem,
    options: parsed.options,
    correctKey,
    correctLabel: correctOption.label,
  };
}

export function shuffleOptions<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}
