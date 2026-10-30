import { readFileSync } from 'fs';
import path from 'path';

const THEME_CSS_FILES = [
  'src/app/globals.css',
  'src/styles/themes/pastel.css',
  'src/styles/themes/paper.css',
];

let css: string | undefined;

/**
 * CSS custom properties declared for a theme, read from the blocks whose selector list
 * names the theme class itself (`.paper`, not `.paper body` or `:is(.paper) …`).
 */
export function readThemeTokens(themeId: string): Record<string, string> {
  css ??= THEME_CSS_FILES.map((file) => readFileSync(path.join(process.cwd(), file), 'utf-8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens: Record<string, string> = {};
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.split(',').some((s) => s.trim() === `.${themeId}`)) continue;
    for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[name] = value;
  }
  return tokens;
}
