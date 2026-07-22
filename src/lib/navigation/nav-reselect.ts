export const NAV_RESELECT_EVENT = 'app:nav-reselect';

type NavReselectDetail = {
  href: string;
};

export const dispatchNavReselect = (href: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<NavReselectDetail>(NAV_RESELECT_EVENT, {
      detail: { href },
    })
  );
};
