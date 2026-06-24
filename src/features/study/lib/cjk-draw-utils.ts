const singleCodePoint = (front: string): string | null => {
  const trimmed = front.trim();
  return [...trimmed].length === 1 ? trimmed : null;
};

const scriptCode = (char: string): number | undefined => char.codePointAt(0);

const isHanScript = (code: number): boolean =>
  (code >= 0x4e00 && code <= 0x9fff) ||
  (code >= 0x3400 && code <= 0x4dbf) ||
  (code >= 0x20000 && code <= 0x2a6df) ||
  (code >= 0x2a700 && code <= 0x2b73f) ||
  (code >= 0x2b740 && code <= 0x2b81f) ||
  (code >= 0x2b820 && code <= 0x2ceaf) ||
  (code >= 0xf900 && code <= 0xfaff);

/** Single Han character — hanzi-writer has stroke data on CDN. */
export function isHanziWriterHanChar(front: string): boolean {
  const char = singleCodePoint(front);
  if (!char) {
    return false;
  }

  const code = scriptCode(char);
  return code !== undefined && isHanScript(code);
}
