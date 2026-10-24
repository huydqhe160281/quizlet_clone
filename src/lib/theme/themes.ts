/**
 * Single source of truth for the selectable visual themes. next-themes puts the
 * theme id on <html> as a class; everything else (picker, toggle, toaster,
 * Tailwind `dark:`) is derived from this list.
 *
 * Adding a theme:
 *   1. Add an entry here (`colorScheme: 'dark'` makes Tailwind `dark:` apply under it).
 *   2. Add its icon to THEME_ICONS (TypeScript fails until you do).
 *   3. Add `ui.theme.<key>` to messages/{vi,en,ja}/ui.json.
 *   4. Create src/styles/themes/<name>.css — tokens under `.<id>`, optional
 *      component skin via the `data-slot` hooks — and import it in app/layout.tsx.
 *
 * Kept free of `@/` imports: tailwind.config.ts loads it directly.
 */

export type ThemeColorScheme = 'light' | 'dark';

type ThemeDefinition = {
  id: string;
  labelKey: string;
  colorScheme: ThemeColorScheme;
};

export const THEMES = [
  { id: 'light', labelKey: 'ui.theme.light', colorScheme: 'light' },
  { id: 'dark', labelKey: 'ui.theme.dark', colorScheme: 'dark' },
  { id: 'pastel', labelKey: 'ui.theme.pastel', colorScheme: 'light' },
  { id: 'paper', labelKey: 'ui.theme.paper', colorScheme: 'light' },
  { id: 'paper-dark', labelKey: 'ui.theme.paperDark', colorScheme: 'dark' },
] as const satisfies readonly ThemeDefinition[];

export type ThemeId = (typeof THEMES)[number]['id'];

/** next-themes' "follow the OS" pseudo-theme (enabled via `enableSystem`). */
export const SYSTEM_THEME = 'system';
export type ThemeChoice = ThemeId | typeof SYSTEM_THEME;

export const THEME_IDS: ThemeId[] = THEMES.map((theme) => theme.id);
export const THEME_CHOICES: ThemeChoice[] = [...THEME_IDS, SYSTEM_THEME];
export const DARK_THEME_IDS: ThemeId[] = THEMES.filter((t) => t.colorScheme === 'dark').map(
  (t) => t.id
);
export const THEME_STORAGE_KEY = 'flashcards-theme';

const LABEL_KEYS: Record<ThemeChoice, string> = {
  ...Object.fromEntries(THEMES.map((t) => [t.id, t.labelKey])),
  [SYSTEM_THEME]: 'ui.theme.system',
} as Record<ThemeChoice, string>;

export function getThemeLabelKey(choice: ThemeChoice): string {
  return LABEL_KEYS[choice];
}

/**
 * Light/dark scheme of a theme, for libraries that only understand those two
 * (e.g. Sonner). `system` and unknown values pass through as `system`.
 */
export function getThemeColorScheme(theme: string | undefined): ThemeColorScheme | 'system' {
  return THEMES.find((t) => t.id === theme)?.colorScheme ?? SYSTEM_THEME;
}
