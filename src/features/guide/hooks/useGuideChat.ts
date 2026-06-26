'use client';

import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';

export type GuideChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type GuideChatSessionValue = {
  messages: GuideChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function useGuideChatSession(): GuideChatSessionValue {
  const pathname = usePathname();
  const [messages, setMessages] = useState<GuideChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) {
        return;
      }

      const userMessage: GuideChatMessage = { id: createId(), role: 'user', content: trimmed };
      const assistantId = createId();
      const nextMessages = [...messages, userMessage];

      setMessages([...nextMessages, { id: assistantId, role: 'assistant', content: '' }]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pathname,
            messages: nextMessages.map(({ role, content: text }) => ({ role, content: text })),
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? 'Không thể kết nối trợ lý');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Stream unavailable');
        }

        const decoder = new TextDecoder();
        let assistantText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          assistantText += decoder.decode(value, { stream: true });
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, content: assistantText } : message
            )
          );
        }
      } catch (sendError) {
        const message = sendError instanceof Error ? sendError.message : 'Lỗi không xác định';
        setError(message);
        setMessages((current) => current.filter((entry) => entry.id !== assistantId));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, pathname]
  );

  return { messages, isLoading, error, sendMessage };
}
