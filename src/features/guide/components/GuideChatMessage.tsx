'use client';

import { AssistantMarkdown } from '@/features/guide/lib/assistant-markdown';

export function GuideChatMessage({
  content,
  role,
}: {
  content: string;
  role: 'user' | 'assistant';
}) {
  const isUser = role === 'user';

  return (
    <div
      className={
        isUser
          ? 'ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap'
          : 'mr-auto max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm text-foreground'
      }
    >
      {isUser ? content : <AssistantMarkdown content={content} />}
    </div>
  );
}
