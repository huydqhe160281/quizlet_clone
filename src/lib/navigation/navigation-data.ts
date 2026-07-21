/** Toggle global Study nav (/study). Set-level study routes stay available. */
export const STUDY_NAV_ENABLED = false;

export type AppNavItemId = 'dashboard' | 'sets' | 'study' | 'search' | 'library';

export type NavIconKey = 'home' | 'layers' | 'sparkles' | 'search' | 'library';

export type AppNavItem = {
  id: AppNavItemId;
  href: string;
  /** i18n key in messages common catalog */
  labelKey: string;
  mobileLabelKey: string;
  guideTargetId: string;
  icon: NavIconKey;
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  {
    id: 'dashboard',
    href: '/dashboard',
    labelKey: 'nav.dashboard',
    mobileLabelKey: 'nav.home',
    guideTargetId: 'nav-dashboard',
    icon: 'home',
  },
  {
    id: 'sets',
    href: '/sets',
    labelKey: 'nav.sets',
    mobileLabelKey: 'nav.setsShort',
    guideTargetId: 'nav-sets',
    icon: 'layers',
  },
  ...(STUDY_NAV_ENABLED
    ? [
        {
          id: 'study' as const,
          href: '/study',
          labelKey: 'nav.study',
          mobileLabelKey: 'nav.study',
          guideTargetId: 'nav-study',
          icon: 'sparkles' as const,
        },
      ]
    : []),
  {
    id: 'search',
    href: '/search',
    labelKey: 'nav.search',
    mobileLabelKey: 'nav.search',
    guideTargetId: 'nav-search',
    icon: 'search',
  },
  {
    id: 'library',
    href: '/library',
    labelKey: 'nav.library',
    mobileLabelKey: 'nav.library',
    guideTargetId: 'nav-library',
    icon: 'library',
  },
] as const;
