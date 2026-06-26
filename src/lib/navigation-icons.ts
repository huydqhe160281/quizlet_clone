import { Home, Layers, Library, Search, Sparkles, type LucideIcon } from 'lucide-react';
import type { NavIconKey } from '@/lib/navigation-data';

export const NAV_ICON_MAP: Record<NavIconKey, LucideIcon> = {
  home: Home,
  layers: Layers,
  sparkles: Sparkles,
  search: Search,
  library: Library,
};
