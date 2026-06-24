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
import { GripVertical, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { VirtualList } from '@/components/shared/VirtualList';
import { MediaUpload } from '@/features/cards/components/MediaUpload';
import type { FlashcardItem } from '@/features/sets/api/sets-api';
import { useCards, useSetMutations } from '@/features/sets/hooks/useSets';

type SortableCardProps = {
  card: FlashcardItem;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: (cardId: string) => void;
  onTypeToggle: (cardId: string, checked: boolean) => void;
};

function SortableCardRow({ card, selected, onSelect, onDelete, onTypeToggle }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mb-2 flex items-start gap-2 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-3 shadow-sm"
    >
      <div className="flex items-center gap-1.5 mt-1.5">
        <Checkbox checked={selected} onCheckedChange={(checked) => onSelect(!!checked)} />
        <button
          type="button"
          className="text-muted-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Front</p>
          <div className="flex items-center gap-2">
            <p className="text-sm">{card.front}</p>
            {card.type === 'new-word' && <Badge variant="secondary">Từ mới</Badge>}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Back</p>
          <p className="text-sm">{card.back}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={card.type === 'new-word'}
          onCheckedChange={(checked) => onTypeToggle(card.id, checked === true)}
          aria-label="Từ mới"
        />
        <span className="text-xs text-muted-foreground">Từ mới</span>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(card.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

type CardEditorProps = {
  setId: string;
};

export function CardEditor({ setId }: CardEditorProps) {
  const { data: cards = [], isLoading } = useCards(setId);
  const { createCard, deleteCard, deleteCards, reorderCards, updateCard } = useSetMutations();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [example, setExample] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [cardType, setCardType] = useState<'new-word' | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      <div className="glass-panel animate-pulse rounded-2xl p-8 text-sm text-muted-foreground">
        Loading cards…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel space-y-3 rounded-2xl p-4 shadow-sm">
        <h3 className="font-medium">Add card</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="front">Front</Label>
            <Input id="front" value={front} onChange={(e) => setFront(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="back">Back</Label>
            <Input id="back" value={back} onChange={(e) => setBack(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="example">Example</Label>
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
          <Label htmlFor="new-word" className="font-normal cursor-pointer">
            Từ mới (luyện viết CJK)
          </Label>
        </div>
        <Button onClick={handleAdd} disabled={createCard.isPending}>
          Add card
        </Button>
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
              Select all ({selectedIds.length}/{cards.length} selected)
            </Label>
          </div>
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete ${selectedIds.length} selected cards?`
                  )
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
              Delete selected ({selectedIds.length})
            </Button>
          )}
        </div>

        {cards.length > 20 ? (
          <VirtualList
            items={cards}
            estimateSize={88}
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
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
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
