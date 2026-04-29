'use client';

import type { TaskCard } from '@/types/card';
import StatusBadge from '@/components/common/StatusBadge';
import ProgressBar from '@/components/common/ProgressBar';
import { isOverdue } from '@/utils/date';

interface TaskCardProps {
  card: TaskCard;
  onClick: () => void;
}

export default function TaskCardComponent({ card, onClick }: TaskCardProps) {
  const isDone = card.status === 'done';
  const overdue = !isDone && isOverdue(card.dueDate);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`任务：${card.title}`}
      className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 cursor-pointer transition-all ${isDone ? 'opacity-60' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <StatusBadge status={card.status} cardType="task" />
        <span className="text-xs text-gray-400">任务</span>
      </div>

      <h3 className={`text-sm font-semibold text-gray-900 mb-1 ${isDone ? 'line-through' : ''}`}>
        {card.title}
      </h3>
      {card.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{card.description}</p>
      )}

      {card.subtasks.length > 0 && (
        <div className="mb-3">
          <ProgressBar progress={card.progress} size="sm" />
        </div>
      )}

      <div className="flex justify-between items-center">
        {card.dueDate && (
          <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {overdue ? '已逾期 · ' : '截止 '}
            {new Date(card.dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
          </span>
        )}
        {card.assignee && (
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-600 font-medium">
            {card.assignee[0]}
          </div>
        )}
      </div>
    </div>
  );
}
