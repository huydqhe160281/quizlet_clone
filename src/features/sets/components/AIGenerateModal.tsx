'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const LOADING_MESSAGES = [
  'Đang phân tích tài liệu...',
  'Đang trích xuất từ vựng...',
  'Đang hoàn thiện bộ thẻ...',
];

const DEFAULT_CARD_COUNT = 15;

type GenerateMode = 'freeform' | 'guided';

type GuidedLanguage = 'ja-vi' | 'en-vi' | 'vi-en';

const GUIDED_LANGUAGE_LABEL: Record<GuidedLanguage, string> = {
  'ja-vi': 'Japanese -> Vietnamese',
  'en-vi': 'English -> Vietnamese',
  'vi-en': 'Vietnamese -> English',
};

type GeneratedCard = {
  id: string;
  front: string;
  back: string;
  example: string | null;
  sortOrder: number;
};

type GeneratedSet = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
};

type ModalStep = 'form' | 'loading' | 'preview';

type AIGenerateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AIGenerateModal({ open, onOpenChange }: AIGenerateModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<ModalStep>('form');
  const [mode, setMode] = useState<GenerateMode>('freeform');
  const [prompt, setPrompt] = useState('');
  const [guidedLanguage, setGuidedLanguage] = useState<GuidedLanguage>('ja-vi');
  const [guidedContent, setGuidedContent] = useState('');
  const [guidedTopic, setGuidedTopic] = useState('');
  const [guidedCardCount, setGuidedCardCount] = useState('');
  const [cardCount, setCardCount] = useState(DEFAULT_CARD_COUNT);
  const [isFreeformUnlimited, setIsFreeformUnlimited] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [generatedSet, setGeneratedSet] = useState<GeneratedSet | null>(null);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const resetForm = useCallback(() => {
    setStep('form');
    setMode('freeform');
    setPrompt('');
    setGuidedLanguage('ja-vi');
    setGuidedContent('');
    setGuidedTopic('');
    setGuidedCardCount('');
    setCardCount(DEFAULT_CARD_COUNT);
    setIsFreeformUnlimited(false);
    setPromptError(null);
    setGeneratedSet(null);
    setGeneratedCards([]);
    setLoadingMessageIndex(0);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (step !== 'loading') {
      return;
    }
    const interval = window.setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => window.clearInterval(interval);
  }, [open, step]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && step === 'preview' && generatedSet) {
      onOpenChange(false);
      return;
    }
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const composeGuidedPrompt = (
    language: GuidedLanguage,
    content: string,
    topic: string | undefined,
    requestedCardCount?: number
  ) => {
    const lines = [
      'You are a flashcard generator.',
      `Language pair: ${GUIDED_LANGUAGE_LABEL[language]}.`,
      `Learning content: ${content}.`,
      topic ? `Topic focus: ${topic}.` : undefined,
      requestedCardCount
        ? `Create exactly ${requestedCardCount} flashcards.`
        : 'No hard card limit. Generate as many cards as needed to cover the content well.',
      'Each card must have a concise front and a clear back explanation.',
      'Add a short example sentence when useful.',
      'Avoid duplicates and keep cards practical for learners.',
    ];

    return lines.filter(Boolean).join('\n');
  };

  const handleSubmit = async () => {
    let resolvedPrompt = '';
    let resolvedCardCount: number | undefined = cardCount;

    if (mode === 'freeform') {
      const trimmed = prompt.trim();
      if (trimmed.length < 10) {
        setPromptError('Nhập ít nhất 10 ký tự hoặc dán nội dung dài hơn.');
        return;
      }
      if (isFreeformUnlimited) {
        resolvedCardCount = undefined;
      }
      resolvedPrompt = trimmed;
    } else {
      const trimmedContent = guidedContent.trim();
      const trimmedTopic = guidedTopic.trim();
      const rawCount = guidedCardCount.trim();

      if (trimmedContent.length < 3) {
        setPromptError('Nhập nội dung học ít nhất 3 ký tự.');
        return;
      }

      if (rawCount) {
        const parsed = Number(rawCount);
        if (!Number.isInteger(parsed) || parsed < 5 || parsed > 200) {
          setPromptError('Số thẻ phải là số nguyên từ 5 đến 200 hoặc để trống.');
          return;
        }
        resolvedCardCount = parsed;
      } else {
        resolvedCardCount = undefined;
      }

      resolvedPrompt = composeGuidedPrompt(
        guidedLanguage,
        trimmedContent,
        trimmedTopic || undefined,
        resolvedCardCount
      );
    }

    setPromptError(null);
    setStep('loading');

    try {
      const response = await fetch('/api/v1/ai/generate-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: resolvedPrompt, cardCount: resolvedCardCount }),
      });

      const payload = (await response.json()) as {
        data?: { set: GeneratedSet; cards: GeneratedCard[] };
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setStep('form');
        const message =
          payload.message ??
          (response.status === 429
            ? 'Bạn đã dùng hết lượt tạo AI trong giờ này.'
            : 'Không thể tạo bộ thẻ. Vui lòng thử lại.');
        toast.error(message);
        return;
      }

      if (payload.data) {
        setGeneratedSet(payload.data.set);
        setGeneratedCards(payload.data.cards);
        setStep('preview');
      }
    } catch {
      setStep('form');
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
    }
  };

  const handleConfirm = () => {
    if (!generatedSet) {
      return;
    }
    router.push(`/sets/${generatedSet.id}`);
    resetForm();
    onOpenChange(false);
  };

  const handleDiscard = async () => {
    if (!generatedSet) {
      return;
    }
    setIsDiscarding(true);
    try {
      const response = await fetch(`/api/v1/sets/${generatedSet.id}`, { method: 'DELETE' });
      if (!response.ok) {
        toast.error('Không thể xóa bản nháp.');
        return;
      }
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Không thể xóa bản nháp.');
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto rounded-2xl border-border/50 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate with AI
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Chọn Prompt tự do hoặc Theo form để tạo bộ flashcard bằng AI.
          </p>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            <Tabs value={mode} onValueChange={(value) => setMode(value as GenerateMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="freeform">Prompt tự do</TabsTrigger>
                <TabsTrigger value="guided">Theo form</TabsTrigger>
              </TabsList>

              <TabsContent value="freeform" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">Nội dung / chủ đề</Label>
                  <Textarea
                    id="ai-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="VD: Tạo 20 từ vựng JLPT N5 chủ đề gia đình..."
                    rows={5}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ai-freeform-unlimited"
                      checked={isFreeformUnlimited}
                      onCheckedChange={(checked) => setIsFreeformUnlimited(checked === true)}
                    />
                    <Label htmlFor="ai-freeform-unlimited" className="cursor-pointer">
                      Không giới hạn số thẻ (để AI tự quyết)
                    </Label>
                  </div>
                  {!isFreeformUnlimited && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Số thẻ</Label>
                        <span className="text-sm text-muted-foreground">{cardCount}</span>
                      </div>
                      <Slider
                        value={[cardCount]}
                        onValueChange={([value]) => setCardCount(value ?? DEFAULT_CARD_COUNT)}
                        min={5}
                        max={50}
                        step={1}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="guided" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-guided-language">Ngôn ngữ học</Label>
                  <Select
                    value={guidedLanguage}
                    onValueChange={(value) => setGuidedLanguage(value as GuidedLanguage)}
                  >
                    <SelectTrigger id="ai-guided-language">
                      <SelectValue placeholder="Chọn ngôn ngữ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja-vi">Japanese -&gt; Vietnamese</SelectItem>
                      <SelectItem value="en-vi">English -&gt; Vietnamese</SelectItem>
                      <SelectItem value="vi-en">Vietnamese -&gt; English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-guided-content">Nội dung học</Label>
                  <Textarea
                    id="ai-guided-content"
                    value={guidedContent}
                    onChange={(e) => setGuidedContent(e.target.value)}
                    placeholder="VD: Bảng chữ cái hiragana, từ vựng JLPT N5..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-guided-topic">Chủ đề (tuỳ chọn)</Label>
                  <Input
                    id="ai-guided-topic"
                    value={guidedTopic}
                    onChange={(e) => setGuidedTopic(e.target.value)}
                    placeholder="VD: Gia đình, chào hỏi, du lịch..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-guided-count">Số thẻ (tuỳ chọn, 5-200)</Label>
                  <Input
                    id="ai-guided-count"
                    type="number"
                    min={5}
                    max={200}
                    value={guidedCardCount}
                    onChange={(e) => setGuidedCardCount(e.target.value)}
                    placeholder="Để trống = không giới hạn"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {promptError && <p className="text-sm text-destructive">{promptError}</p>}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-primary/25 hover:from-violet-500 hover:to-indigo-500"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Tạo bộ thẻ
              </Button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8" aria-busy="true">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {LOADING_MESSAGES[loadingMessageIndex]}
            </p>
          </div>
        )}

        {step === 'preview' && generatedSet && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">{generatedSet.title}</h3>
              {generatedSet.description && (
                <p className="text-sm text-muted-foreground">{generatedSet.description}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {generatedCards.length} thẻ · Bản nháp riêng tư
              </p>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border/50 p-3">
              {generatedCards.map((card) => (
                <div key={card.id} className="border-b border-border/30 pb-2 last:border-0">
                  <p className="text-sm font-medium">{card.front}</p>
                  <p className="text-sm text-muted-foreground">{card.back}</p>
                  {card.example && (
                    <p className="text-xs italic text-muted-foreground">{card.example}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscard}
                disabled={isDiscarding}
              >
                {isDiscarding ? 'Đang xóa...' : 'Discard'}
              </Button>
              <Button type="button" onClick={handleConfirm}>
                Confirm &amp; xem bộ thẻ
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function GenerateWithAIButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        'border-primary/30 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 shadow-sm hover:border-primary/50 hover:from-violet-500/20 hover:to-indigo-500/20',
        className
      )}
    >
      <Sparkles className="mr-2 h-4 w-4 text-primary" />
      Generate with AI
    </Button>
  );
}
