'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  useGuideChatSession,
  type GuideChatSessionValue,
} from '@/features/guide/hooks/useGuideChat';

type GuideChatUiContextValue = {
  dismissed: boolean;
  dismiss: () => void;
  restore: () => void;
};

const GuideChatUiContext = createContext<GuideChatUiContextValue | null>(null);
const GuideChatSessionContext = createContext<GuideChatSessionValue | null>(null);

export function GuideChatProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  const session = useGuideChatSession();

  const uiValue = useMemo(
    () => ({
      dismissed,
      dismiss: () => setDismissed(true),
      restore: () => setDismissed(false),
    }),
    [dismissed]
  );

  return (
    <GuideChatUiContext.Provider value={uiValue}>
      <GuideChatSessionContext.Provider value={session}>
        {children}
      </GuideChatSessionContext.Provider>
    </GuideChatUiContext.Provider>
  );
}

export function useGuideChatUi(): GuideChatUiContextValue {
  const ctx = useContext(GuideChatUiContext);
  if (!ctx) {
    throw new Error('useGuideChatUi must be used within GuideChatProvider');
  }
  return ctx;
}

export function useGuideChat(): GuideChatSessionValue {
  const ctx = useContext(GuideChatSessionContext);
  if (!ctx) {
    throw new Error('useGuideChat must be used within GuideChatProvider');
  }
  return ctx;
}
