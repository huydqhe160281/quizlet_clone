/**
 * Converts a shadcn HSL token value ("240 20% 99%", as stored in `--background`)
 * to `#rrggbb` for `<meta name="theme-color">`, which some browsers only accept as hex.
 * Returns null for anything else.
 */
export function hslTokenToHex(token: string): string | null {
  const match = token.trim().match(/^(-?[\d.]+)(?:deg)?\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!match) return null;
  const h = (((Number(match[1]) % 360) + 360) % 360) / 360;
  const s = Math.min(Number(match[2]), 100) / 100;
  const l = Math.min(Number(match[3]), 100) / 100;

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (offset: number) => {
    let t = h + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    const v =
      t < 1 / 6
        ? p + (q - p) * 6 * t
        : t < 1 / 2
          ? q
          : t < 2 / 3
            ? p + (q - p) * (2 / 3 - t) * 6
            : p;
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(1 / 3)}${channel(0)}${channel(-1 / 3)}`;
}
