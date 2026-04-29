'use client';

import { useEffect, useCallback } from 'react';
import { useCardStore } from '@/store/useCardStore';
import TaskDetail from './TaskDetail';
import FinanceDetail from './FinanceDetail';

export default function CardModal() {
  const selectedCardId = useCardStore((s) => s.selectedCardId);
  const cards = useCardStore((s) => s.cards);
  const selectCard = useCardStore((s) => s.selectCard);
  const isNewCard = useCardStore((s) => s.isNewCard);
  const selectedCard = cards.find((c) => c.id === selectedCardId);

  const handleClose = useCallback(() => selectCard(null), [selectCard]);

  useEffect(() => {
    if (!selectedCardId) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [selectedCardId, handleClose]);

  if (!selectedCard) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="卡片详情">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      {/* 弹窗 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[85vh] overflow-y-auto">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          aria-label="关闭"
          className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition z-10"
        >
          ✕
        </button>

        {selectedCard.type === 'task' ? (
          <TaskDetail key={selectedCard.id} card={selectedCard} isNew={isNewCard} />
        ) : (
          <FinanceDetail key={selectedCard.id} card={selectedCard} isNew={isNewCard} />
        )}
      </div>
    </div>
  );
}
