import { Monitor, Moon, NotebookPen, Palette, Sun, type LucideIcon } from 'lucide-react';
import type { ThemeChoice } from '@/lib/theme/themes';

/** Icon per theme choice; a Record so a new theme fails to compile until it has one. */
export const THEME_ICONS: Record<ThemeChoice, LucideIcon> = {
  light: Sun,
  dark: Moon,
  pastel: Palette,
  paper: NotebookPen,
  'paper-dark': NotebookPen,
  system: Monitor,
};
