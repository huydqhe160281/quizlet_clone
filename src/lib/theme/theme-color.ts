import { THEME_STORAGE_KEY, type ThemeId } from './themes';

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

/**
 * `--background` of each theme as hex, for `<meta name="theme-color">` (the installed
 * app's status bar / the mobile browser toolbar). Must mirror the CSS tokens —
 * theme-color.test.ts fails when they drift.
 */
export const THEME_BACKGROUNDS = {
  light: '#fcfcfd',
  dark: '#09090b',
  pastel: '#fbf7f4',
  paper: '#faf8f0',
  'paper-dark': '#10141e',
} as const satisfies Record<ThemeId, string>;

/** Server-rendered defaults for the "system" theme (no JS needed). */
export const SYSTEM_THEME_COLORS = [
  { media: '(prefers-color-scheme: light)', color: THEME_BACKGROUNDS.light },
  { media: '(prefers-color-scheme: dark)', color: THEME_BACKGROUNDS.dark },
];

/** Points every theme-color meta (the server's media-query pair included) at `color`. */
export function applyThemeColor(color: string): void {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    document.head.appendChild(meta);
    return;
  }
  metas.forEach((meta) => {
    meta.content = color;
  });
}

/**
 * Inline <head> script: before first paint, puts the saved explicit theme's colour in a
 * theme-color meta at the top of <head> (the first matching meta wins), so the status bar
 * is right even before React hydrates. "system" keeps the server's media-query metas.
 */
export const THEME_COLOR_BOOT_SCRIPT = `(function(){try{var c=${JSON.stringify(
  THEME_BACKGROUNDS
)}[localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})];if(!c)return;var m=document.createElement('meta');m.name='theme-color';m.content=c;document.head.prepend(m)}catch(e){}})()`;
