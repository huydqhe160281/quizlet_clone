export type AppNavItemId = 'dashboard' | 'sets' | 'study' | 'search' | 'library';

export type NavIconKey = 'home' | 'layers' | 'sparkles' | 'search' | 'library';

export type AppNavItem = {
  id: AppNavItemId;
  href: string;
  label: string;
  mobileLabel: string;
  guideTargetId: string;
  icon: NavIconKey;
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  {
    id: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    mobileLabel: 'Home',
    guideTargetId: 'nav-dashboard',
    icon: 'home',
  },
  {
    id: 'sets',
    href: '/sets',
    label: 'My Sets',
    mobileLabel: 'Sets',
    guideTargetId: 'nav-sets',
    icon: 'layers',
  },
  {
    id: 'study',
    href: '/study',
    label: 'Study',
    mobileLabel: 'Study',
    guideTargetId: 'nav-study',
    icon: 'sparkles',
  },
  {
    id: 'search',
    href: '/search',
    label: 'Search',
    mobileLabel: 'Search',
    guideTargetId: 'nav-search',
    icon: 'search',
  },
  {
    id: 'library',
    href: '/library',
    label: 'Library',
    mobileLabel: 'Library',
    guideTargetId: 'nav-library',
    icon: 'library',
  },
] as const;
