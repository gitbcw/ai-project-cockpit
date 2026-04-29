'use client';

import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useCardStore } from '@/store/useCardStore';
import CardItemComponent from './CardItem';
import EmptyState from '@/components/common/EmptyState';
import type { CardItem } from '@/types/card';

interface CardGridProps {
  cards: CardItem[];
}

export default function CardGrid({ cards }: CardGridProps) {
  const reorderCards = useCardStore((s) => s.reorderCards);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = cards.map((c) => c.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      const newIds = arrayMove(ids, oldIndex, newIndex);
      reorderCards(newIds);
    },
    [cards, reorderCards]
  );

  if (cards.length === 0) return <EmptyState />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <CardItemComponent key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
