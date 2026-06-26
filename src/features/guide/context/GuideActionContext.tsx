'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { noopGuideActions, type GuideActionHandler } from '@/features/guide/types/guide-actions';

const GuideActionContext = createContext<GuideActionHandler>(noopGuideActions);

export function GuideActionProvider({
  children,
  handlers = noopGuideActions,
}: {
  children: ReactNode;
  handlers?: GuideActionHandler;
}) {
  const value = useMemo(() => handlers, [handlers]);
  return <GuideActionContext.Provider value={value}>{children}</GuideActionContext.Provider>;
}

export function useGuideActions(): GuideActionHandler {
  return useContext(GuideActionContext);
}
