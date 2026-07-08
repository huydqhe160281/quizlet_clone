'use client';

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LoadingOverlay } from '@/components/shared/LoadingOverlay';

const NAV_SHOW_DELAY_MS = 100;
const NAV_SETTLE_MS = 420;
const NAV_TIMEOUT_MS = 30_000;
const EXIT_ANIMATION_MS = 240;

type LoadingOptions = {
  message?: string;
};

type LoadingOverlayContextValue = {
  isLoading: boolean;
  withLoading: <T>(fn: () => Promise<T>, options?: LoadingOptions) => Promise<T>;
};

const LoadingOverlayContext = createContext<LoadingOverlayContextValue | null>(null);

function isInternalNavigationLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }

  if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
    return false;
  }

  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return false;
    }

    const current = `${window.location.pathname}${window.location.search}`;
    const next = `${url.pathname}${url.search}`;
    return next !== current;
  } catch {
    return false;
  }
}

function useLoadingOverlayController() {
  const taskCountRef = useRef(0);
  const navCountRef = useRef(0);
  const navShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [taskVisible, setTaskVisible] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const visible = taskVisible || navVisible;

  const clearNavShowTimer = useCallback(() => {
    if (navShowTimerRef.current) {
      clearTimeout(navShowTimerRef.current);
      navShowTimerRef.current = null;
    }
  }, []);

  const clearNavHideTimer = useCallback(() => {
    if (navHideTimerRef.current) {
      clearTimeout(navHideTimerRef.current);
      navHideTimerRef.current = null;
    }
  }, []);

  const clearNavSettleTimer = useCallback(() => {
    if (navSettleTimerRef.current) {
      clearTimeout(navSettleTimerRef.current);
      navSettleTimerRef.current = null;
    }
  }, []);

  const syncNavVisible = useCallback(() => {
    setNavVisible(navCountRef.current > 0);
  }, []);

  const startTaskLoading = useCallback((nextMessage?: string) => {
    if (taskCountRef.current === 0) {
      setMessage(nextMessage);
      setTaskVisible(true);
    }

    taskCountRef.current += 1;
  }, []);

  const stopTaskLoading = useCallback(() => {
    taskCountRef.current = Math.max(0, taskCountRef.current - 1);

    if (taskCountRef.current > 0) {
      return;
    }

    window.setTimeout(() => {
      if (taskCountRef.current === 0) {
        setTaskVisible(false);
        setMessage(undefined);
      }
    }, EXIT_ANIMATION_MS);
  }, []);

  const startNavLoading = useCallback(() => {
    navCountRef.current += 1;
    clearNavHideTimer();
    clearNavSettleTimer();

    if (navCountRef.current === 1 && !navVisible && !navShowTimerRef.current) {
      navShowTimerRef.current = setTimeout(() => {
        navShowTimerRef.current = null;
        if (navCountRef.current > 0) {
          syncNavVisible();
        }
      }, NAV_SHOW_DELAY_MS);
    }
  }, [clearNavHideTimer, clearNavSettleTimer, navVisible, syncNavVisible]);

  const stopNavLoading = useCallback(() => {
    navCountRef.current = Math.max(0, navCountRef.current - 1);

    if (navCountRef.current > 0) {
      return;
    }

    clearNavShowTimer();

    clearNavHideTimer();
    navHideTimerRef.current = setTimeout(() => {
      navHideTimerRef.current = null;
      syncNavVisible();
    }, EXIT_ANIMATION_MS);
  }, [clearNavHideTimer, clearNavShowTimer, syncNavVisible]);

  const scheduleNavSettle = useCallback(() => {
    clearNavSettleTimer();
    navSettleTimerRef.current = setTimeout(() => {
      navSettleTimerRef.current = null;
      stopNavLoading();
    }, NAV_SETTLE_MS);
  }, [clearNavSettleTimer, stopNavLoading]);

  useEffect(
    () => () => {
      clearNavShowTimer();
      clearNavHideTimer();
      clearNavSettleTimer();
    },
    [clearNavHideTimer, clearNavSettleTimer, clearNavShowTimer]
  );

  return {
    visible,
    message,
    startTaskLoading,
    stopTaskLoading,
    startNavLoading,
    stopNavLoading,
    scheduleNavSettle,
  };
}

function NavigationLoadingListener({
  startNavLoading,
  stopNavLoading,
  scheduleNavSettle,
}: {
  startNavLoading: () => void;
  stopNavLoading: () => void;
  scheduleNavSettle: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRouteRef = useRef(true);

  useEffect(() => {
    if (isFirstRouteRef.current) {
      isFirstRouteRef.current = false;
      return;
    }

    scheduleNavSettle();

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, [pathname, searchKey, scheduleNavSettle]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement) || !isInternalNavigationLink(anchor)) {
        return;
      }

      startNavLoading();

      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      navigationTimeoutRef.current = setTimeout(() => {
        navigationTimeoutRef.current = null;
        stopNavLoading();
      }, NAV_TIMEOUT_MS);
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, [startNavLoading, stopNavLoading]);

  return null;
}

export function LoadingOverlayProvider({ children }: { children: ReactNode }) {
  const {
    visible,
    message,
    startTaskLoading,
    stopTaskLoading,
    startNavLoading,
    stopNavLoading,
    scheduleNavSettle,
  } = useLoadingOverlayController();

  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>, options?: LoadingOptions): Promise<T> => {
      startTaskLoading(options?.message);
      try {
        return await fn();
      } finally {
        stopTaskLoading();
      }
    },
    [startTaskLoading, stopTaskLoading]
  );

  const value = useMemo(
    () => ({
      isLoading: visible,
      withLoading,
    }),
    [visible, withLoading]
  );

  return (
    <LoadingOverlayContext.Provider value={value}>
      <LoadingOverlayContextInternal.Provider
        value={{ startNavLoading, stopNavLoading, scheduleNavSettle }}
      >
        {children}
        <LoadingOverlay visible={visible} message={message} />
        <Suspense fallback={null}>
          <NavigationLoadingListener
            startNavLoading={startNavLoading}
            stopNavLoading={stopNavLoading}
            scheduleNavSettle={scheduleNavSettle}
          />
        </Suspense>
      </LoadingOverlayContextInternal.Provider>
    </LoadingOverlayContext.Provider>
  );
}

type LoadingOverlayInternalContextValue = {
  startNavLoading: () => void;
  stopNavLoading: () => void;
  scheduleNavSettle: () => void;
};

const LoadingOverlayContextInternal = createContext<LoadingOverlayInternalContextValue | null>(
  null
);

export function useLoadingOverlay(): LoadingOverlayContextValue {
  const context = useContext(LoadingOverlayContext);
  if (!context) {
    throw new Error('useLoadingOverlay must be used within LoadingOverlayProvider');
  }
  return context;
}

export function useNavigationLoading(): LoadingOverlayInternalContextValue {
  const context = useContext(LoadingOverlayContextInternal);
  if (!context) {
    throw new Error('useNavigationLoading must be used within LoadingOverlayProvider');
  }
  return context;
}
