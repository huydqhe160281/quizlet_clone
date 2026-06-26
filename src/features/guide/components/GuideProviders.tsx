'use client';

import type { ReactNode } from 'react';
import { GuideActionProvider } from '@/features/guide/context/GuideActionContext';
import { GuideChatProvider } from '@/features/guide/context/GuideChatContext';
import { GuideChatWidget } from '@/features/guide/components/GuideChatWidget';

export function GuideProviders({ children }: { children: ReactNode }) {
  return (
    <GuideActionProvider>
      <GuideChatProvider>
        {children}
        <GuideChatWidget />
      </GuideChatProvider>
    </GuideActionProvider>
  );
}
