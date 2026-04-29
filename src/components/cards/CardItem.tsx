'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardItem } from '@/types/card';
import { useCardStore } from '@/store/useCardStore';
import TaskCard from './TaskCard';
import FinanceCard from './FinanceCard';

interface CardItemProps {
  card: CardItem;
}

export default function CardItemComponent({ card }: CardItemProps) {
  const selectCard = useCardStore((s) => s.selectCard);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {card.type === 'task' ? (
        <TaskCard card={card} onClick={() => selectCard(card.id)} />
      ) : (
        <FinanceCard card={card} onClick={() => selectCard(card.id)} />
      )}
    </div>
  );
}
