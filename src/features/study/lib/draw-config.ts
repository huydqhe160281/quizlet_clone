import type { CharDataLoaderFn } from 'hanzi-writer';

export const MAX_MISTAKES = 3;
export const CANVAS_SIZE = 280;
export const CANVAS_PADDING = 5;
export const HINT_DISPLAY_MS = 1500;

/**
 * Stroke data for hanzi-writer. Pinned here (instead of the library default) so the
 * CSP `connect-src` allowlist in src/config/security-headers.ts always matches.
 */
export const HANZI_WRITER_DATA_BASE_URL = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';

export function hanziCharDataUrl(character: string): string {
  return `${HANZI_WRITER_DATA_BASE_URL}${encodeURIComponent(character)}.json`;
}

/** hanzi-writer `charDataLoader` that fetches from the pinned, CSP-allowlisted URL. */
export const loadHanziCharData: CharDataLoaderFn = (character, onLoad, onError) => {
  fetch(hanziCharDataUrl(character))
    .then((response) => {
      if (!response.ok) throw new Error(`Stroke data not found (${response.status})`);
      return response.json();
    })
    .then(onLoad, onError);
};
