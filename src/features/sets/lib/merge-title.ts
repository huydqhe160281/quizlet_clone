import { SET_TITLE_MAX } from '@/features/sets/schemas/set.schema';

/** Matches the "Title (n/m)" names produced by splitting a set. */
const SPLIT_PART_PATTERN = /^(.*) \((\d+)\/(\d+)\)$/;

function clampTitle(title: string): string {
  return title.length > SET_TITLE_MAX ? title.slice(0, SET_TITLE_MAX) : title;
}

/**
 * Default name for a merged set. Parts of the same split ("Vocab (1/5)", "Vocab (3/5)")
 * become "Vocab (1, 3/5)"; anything else is joined with " + ".
 */
export function suggestMergedTitle(titles: string[]): string {
  if (titles.length === 0) {
    return '';
  }

  const parts = titles.map((title) => SPLIT_PART_PATTERN.exec(title));
  const first = parts[0];
  const sameSplit =
    first && parts.every((match) => match && match[1] === first[1] && match[3] === first[3]);
  if (first && sameSplit) {
    const indexes = [...new Set(parts.map((match) => Number(match![2])))].sort((a, b) => a - b);
    const suffix = ` (${indexes.join(', ')}/${first[3]})`;
    return `${first[1].slice(0, Math.max(SET_TITLE_MAX - suffix.length, 0))}${suffix}`;
  }

  return clampTitle(titles.join(' + '));
}
