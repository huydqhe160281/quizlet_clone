'use client';

import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuideChatPanel } from '@/features/guide/components/GuideChatPanel';
import { useGuideChatUi } from '@/features/guide/context/GuideChatContext';
import { GUIDE_CHAT_MOBILE_BOTTOM_OFFSET } from '@/features/guide/constants';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function GuideChatWidget() {
  const { dismissed, dismiss } = useGuideChatUi();
  const [expanded, setExpanded] = useState(false);

  if (dismissed) {
    return null;
  }

  const handlePanelClose = () => {
    setExpanded(false);
  };

  return (
    <>
      {!expanded && (
        <div
          className={cn(
            'group fixed z-40 md:bottom-6 md:right-6',
            'bottom-[var(--guide-chat-bottom)] right-4'
          )}
          style={{ ['--guide-chat-bottom' as string]: GUIDE_CHAT_MOBILE_BOTTOM_OFFSET }}
        >
          <Button
            type="button"
            size="icon"
            aria-label="Mở trợ lý hướng dẫn"
            className="relative h-12 w-12 rounded-full shadow-lg"
            onClick={() => setExpanded(true)}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Ẩn trợ lý hướng dẫn"
            className={cn(
              'absolute -right-0.5 -top-0.5 h-5 w-5 min-h-0 min-w-0 rounded-full border p-0 shadow-md',
              'opacity-0 transition-opacity pointer-events-none',
              'group-hover:opacity-100 group-hover:pointer-events-auto',
              'group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
            )}
            onClick={(event) => {
              event.stopPropagation();
              dismiss();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {expanded && <GuideChatPanel onClose={handlePanelClose} />}
    </>
  );
}
