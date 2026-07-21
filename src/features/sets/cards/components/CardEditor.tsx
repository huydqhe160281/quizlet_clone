'use client';

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { VirtualList } from '@/components/shared/VirtualList';
import { MediaUpload } from '@/features/sets/cards/components/MediaUpload';
import type { FlashcardItem } from '@/features/sets/api/sets-api';
import { useCards, useSetMutations } from '@/features/sets/hooks/useSets';
import { useTranslations } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type SortableCardProps = {
  card: FlashcardItem;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: (cardId: string) => void;
  onTypeToggle: (cardId: string, checked: boolean) => void;
};

function SortableCardRow({ card, selected, onSelect, onDelete, onTypeToggle }: SortableCardProps) {
  const t = useTranslations();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isChoiceAnswer = /^[A-Da-d]$/.test(card.back.trim());
  const isTallContent = isChoiceAnswer || card.front.includes('\n') || card.back.includes('\n');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isTallContent
          ? 'flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-md'
          : 'flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-md'
      }
    >
      <div
        className={
          isTallContent
            ? 'flex shrink-0 items-center gap-2 pt-0.5 text-muted-foreground'
            : 'flex shrink-0 items-center gap-2 text-muted-foreground'
        }
      >
        <button
          type="button"
          className="cursor-grab transition-colors hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <Checkbox checked={selected} onCheckedChange={(checked) => onSelect(!!checked)} />
      </div>

      <div
        className={
          isChoiceAnswer
            ? 'grid min-w-0 flex-1 gap-4 sm:grid-cols-[minmax(0,1fr)_4.5rem] sm:gap-6'
            : 'grid min-w-0 flex-1 gap-4 sm:grid-cols-2 sm:gap-6'
        }
      >
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {t('cards.front')}
            </p>
            {card.type === 'new-word' && (
              <Badge variant="secondary" className="scale-90 text-[10px]">
                {t('cards.newWord')}
              </Badge>
            )}
          </div>
          <p className="text-[15px] font-medium leading-relaxed whitespace-pre-line text-foreground/90">
            {card.front}
          </p>
        </div>
        <div className={isChoiceAnswer ? 'min-w-0 sm:text-center' : 'min-w-0'}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {t('cards.back')}
          </p>
          {isChoiceAnswer ? (
            <p className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-muted/60 px-3 text-base font-semibold tracking-wide text-foreground">
              {card.back}
            </p>
          ) : (
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-foreground/80">
              {card.back}
            </p>
          )}
        </div>
      </div>

      <div
        className={
          isTallContent
            ? 'ml-1 flex shrink-0 items-center gap-3 pt-0.5 sm:border-l sm:border-border/60 sm:pl-4'
            : 'ml-1 flex shrink-0 items-center gap-3 sm:border-l sm:border-border/60 sm:pl-4'
        }
      >
        <label className="flex cursor-pointer items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
          <Checkbox
            className="rounded-full"
            checked={card.type === 'new-word'}
            onCheckedChange={(checked) => onTypeToggle(card.id, checked === true)}
          />
          <span className="hidden text-xs font-medium lg:inline">{t('cards.newWord')}</span>
        </label>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={t('ui.delete')}
          onClick={() => onDelete(card.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

type CardEditorProps = {
  setId: string;
};

export function CardEditor({ setId }: CardEditorProps) {
  const t = useTranslations();
  const { data: cards = [], isLoading } = useCards(setId);
  const { createCard, deleteCard, deleteCards, reorderCards, updateCard } = useSetMutations();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [example, setExample] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [cardType, setCardType] = useState<'new-word' | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const hasAdvancedValues = Boolean(example.trim() || imageUrl || audioUrl || cardType);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const cardIds = useMemo(() => cards.map((card) => card.id), [cards]);

  const handleAdd = () => {
    if (!front.trim() || !back.trim()) {
      return;
    }
    createCard.mutate(
      {
        setId,
        input: {
          front,
          back,
          example: example || undefined,
          imageUrl,
          audioUrl,
          type: cardType,
        },
      },
      {
        onSuccess: () => {
          setFront('');
          setBack('');
          setExample('');
          setImageUrl(undefined);
          setAudioUrl(undefined);
          setCardType(null);
        },
      }
    );
  };

  const handleTypeToggle = (cardId: string, checked: boolean) => {
    updateCard.mutate({
      setId,
      cardId,
      input: { type: checked ? 'new-word' : null },
    });
  };

  const handleDeleteSingle = (cardId: string) => {
    deleteCard.mutate(
      { setId, cardId },
      {
        onSuccess: () => {
          setSelectedIds((prev) => prev.filter((id) => id !== cardId));
        },
      }
    );
  };

  const handleToggleSelect = (cardId: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, cardId] : prev.filter((id) => id !== cardId)));
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(cards.map((card) => card.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = cards.findIndex((card) => card.id === active.id);
    const newIndex = cards.findIndex((card) => card.id === over.id);
    const reordered = arrayMove(cards, oldIndex, newIndex);
    reorderCards.mutate({ setId, cardIds: reordered.map((card) => card.id) });
  };

  if (isLoading) {
    return (
      <div className="glass-panel animate-pulse rounded-xl p-8 text-sm text-muted-foreground">
        {t('cards.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel space-y-3 rounded-xl p-4 shadow-sm">
        <h3 className="font-medium">{t('cards.addCard')}</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="front">{t('cards.front')}</Label>
            <Input
              id="front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder={t('cards.frontPlaceholder')}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="back">{t('cards.back')}</Label>
            <Input
              id="back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder={t('cards.backPlaceholder')}
            />
          </div>
          <Button
            className="h-11 w-full shrink-0 sm:w-auto"
            onClick={handleAdd}
            disabled={createCard.isPending || !front.trim() || !back.trim()}
          >
            {t('cards.addCard')}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-180')}
          />
          {t('cards.advancedOptions')}
          {hasAdvancedValues && !showAdvanced && (
            <Badge variant="secondary" className="ml-1 scale-90 text-[10px]">
              {t('cards.filled')}
            </Badge>
          )}
        </button>

        {showAdvanced && (
          <div className="space-y-3 border-t border-border/50 pt-3">
            <div className="space-y-2">
              <Label htmlFor="example">{t('cards.example')}</Label>
              <Textarea
                id="example"
                value={example}
                onChange={(e) => setExample(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <MediaUpload
                fileType="image"
                onUploaded={(path) => {
                  setImageUrl(path);
                }}
              />
              <MediaUpload
                fileType="audio"
                onUploaded={(path) => {
                  setAudioUrl(path);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="new-word"
                checked={cardType === 'new-word'}
                onCheckedChange={(checked) => setCardType(checked ? 'new-word' : null)}
              />
              <Label htmlFor="new-word" className="cursor-pointer font-normal">
                {t('cards.newWordLabel')}
              </Label>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={cards.length > 0 && selectedIds.length === cards.length}
              onCheckedChange={(checked) => handleToggleSelectAll(!!checked)}
              disabled={cards.length === 0}
            />
            <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              {t('cards.selectAll', {
                selected: selectedIds.length,
                total: cards.length,
              })}
            </Label>
          </div>
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (
                  window.confirm(t('cards.deleteSelectedConfirm', { count: selectedIds.length }))
                ) {
                  deleteCards.mutate(
                    { setId, cardIds: selectedIds },
                    {
                      onSuccess: () => {
                        setSelectedIds([]);
                      },
                    }
                  );
                }
              }}
              disabled={deleteCards.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('cards.deleteSelected', { count: selectedIds.length })}
            </Button>
          )}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {cards.length > 20 ? (
              <VirtualList
                items={cards}
                estimateSize={180}
                renderItem={(card) => (
                  <SortableCardRow
                    card={card}
                    selected={selectedIds.includes(card.id)}
                    onSelect={(checked) => handleToggleSelect(card.id, checked)}
                    onDelete={handleDeleteSingle}
                    onTypeToggle={handleTypeToggle}
                  />
                )}
              />
            ) : (
              <div className="space-y-4">
                {cards.map((card) => (
                  <SortableCardRow
                    key={card.id}
                    card={card}
                    selected={selectedIds.includes(card.id)}
                    onSelect={(checked) => handleToggleSelect(card.id, checked)}
                    onDelete={handleDeleteSingle}
                    onTypeToggle={handleTypeToggle}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
