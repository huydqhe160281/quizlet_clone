'use client';

import { Button } from '@/components/ui/button';

const QUICK_PROMPTS = [
  'Tôi mới đăng ký, nên bắt đầu học như thế nào?',
  'Làm sao tạo bộ thẻ đầu tiên?',
  'Các chế độ học khác nhau thế nào?',
] as const;

export function GuideQuickPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_PROMPTS.map((prompt) => (
        <Button
          key={prompt}
          type="button"
          variant="outline"
          size="sm"
          className="h-auto whitespace-normal text-left text-xs"
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
