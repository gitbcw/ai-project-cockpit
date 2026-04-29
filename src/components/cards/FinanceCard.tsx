'use client';

import type { FinanceCard } from '@/types/card';
import StatusBadge from '@/components/common/StatusBadge';

interface FinanceCardProps {
  card: FinanceCard;
  onClick: () => void;
}

export default function FinanceCardComponent({ card, onClick }: FinanceCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`财务：${card.title}`}
      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 cursor-pointer transition-all"
    >
      <div className="flex justify-between items-start mb-3">
        <StatusBadge status={card.status} cardType="finance" />
        <span className="text-xs text-gray-400">财务</span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-1">{card.title}</h3>
      <p className="text-xl font-bold text-red-500 mb-1">
        ¥ {card.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
      </p>
      {card.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-1">{card.description}</p>
      )}

      {card.images.length > 0 && (
        <div className="bg-gray-50 rounded-lg h-14 flex items-center justify-center">
          <span className="text-xs text-gray-400">📎 {card.images.length} 张凭证</span>
        </div>
      )}
    </div>
  );
}
