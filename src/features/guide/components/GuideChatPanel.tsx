'use client';

import { useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuideChatMessage } from '@/features/guide/components/GuideChatMessage';
import { GuideQuickPrompts } from '@/features/guide/components/GuideQuickPrompts';
import { useGuideChat } from '@/features/guide/context/GuideChatContext';
import { GUIDE_CHAT_MOBILE_BOTTOM_OFFSET } from '@/features/guide/constants';
import { cn } from '@/lib/utils';

export function GuideChatPanel({ onClose }: { onClose: () => void }) {
  const { messages, isLoading, error, sendMessage } = useGuideChat();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = String(formData.get('message') ?? '').trim();
    if (!value) {
      return;
    }
    event.currentTarget.reset();
    void sendMessage(value);
  };

  return (
    <div
      role="dialog"
      aria-label="Trợ lý hướng dẫn"
      className={cn(
        'glass-panel flex h-[min(520px,calc(100vh-6rem))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border shadow-xl',
        'fixed z-40 right-4 md:bottom-6 bottom-[var(--guide-chat-bottom)]'
      )}
      style={{ ['--guide-chat-bottom' as string]: GUIDE_CHAT_MOBILE_BOTTOM_OFFSET }}
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Trợ lý Flashcards</p>
          <p className="text-xs text-muted-foreground">Hướng dẫn sử dụng website</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Đóng trợ lý"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <GuideQuickPrompts onSelect={(prompt) => void sendMessage(prompt)} />
        )}
        {messages.map((message) => (
          <GuideChatMessage key={message.id} role={message.role} content={message.content} />
        ))}
        {isLoading && <p className="text-xs text-muted-foreground">Đang trả lời...</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t p-3">
        <input
          ref={inputRef}
          name="message"
          placeholder="Hỏi cách dùng website..."
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          maxLength={500}
          disabled={isLoading}
        />
        <Button type="submit" size="icon" aria-label="Gửi câu hỏi" disabled={isLoading}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
