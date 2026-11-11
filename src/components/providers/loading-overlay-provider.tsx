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
import { NavigationProgressBar } from '@/components/shared/NavigationProgressBar';

/** Prefetched navigations usually finish before this, so they never show the bar. */
const NAV_SHOW_DELAY_MS = 100;
/** Safety net if a navigation never commits (e.g. aborted). */
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

/**
 * Shows a thin, non-blocking progress bar while a link navigation is pending and
 * hides it as soon as the route commits. The new page (or its `loading.tsx`
 * skeleton) is never dimmed or blocked.
 */
function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    setVisible(false);
  }, [clearTimers]);

  // Route committed: hide immediately.
  useEffect(() => {
    stop();
  }, [pathname, searchKey, stop]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
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

      clearTimers();
      showTimerRef.current = setTimeout(() => {
        showTimerRef.current = null;
        setVisible(true);
      }, NAV_SHOW_DELAY_MS);
      timeoutRef.current = setTimeout(stop, NAV_TIMEOUT_MS);
    };

    // Capture phase: next/link calls preventDefault on every click it handles.
    // Same-URL clicks (nav reselect) are already skipped by isInternalNavigationLink.
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      clearTimers();
    };
  }, [clearTimers, stop]);

  return <NavigationProgressBar visible={visible} />;
}

export function LoadingOverlayProvider({ children }: { children: ReactNode }) {
  const taskCountRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>, options?: LoadingOptions): Promise<T> => {
      if (taskCountRef.current === 0) {
        setMessage(options?.message);
        setVisible(true);
      }
      taskCountRef.current += 1;
      try {
        return await fn();
      } finally {
        taskCountRef.current = Math.max(0, taskCountRef.current - 1);
        if (taskCountRef.current === 0) {
          window.setTimeout(() => {
            if (taskCountRef.current === 0) {
              setVisible(false);
              setMessage(undefined);
            }
          }, EXIT_ANIMATION_MS);
        }
      }
    },
    []
  );

  const value = useMemo(() => ({ isLoading: visible, withLoading }), [visible, withLoading]);

  return (
    <LoadingOverlayContext.Provider value={value}>
      {children}
      <LoadingOverlay visible={visible} message={message} />
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
    </LoadingOverlayContext.Provider>
  );
}

export function useLoadingOverlay(): LoadingOverlayContextValue {
  const context = useContext(LoadingOverlayContext);
  if (!context) {
    throw new Error('useLoadingOverlay must be used within LoadingOverlayProvider');
  }
  return context;
}
