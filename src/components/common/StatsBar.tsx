'use client';

import { useCardStore } from '@/store/useCardStore';
import type { TaskCard, FinanceCard } from '@/types/card';
import { isOverdue } from '@/utils/date';

export default function StatsBar() {
  const activeTab = useCardStore((s) => s.activeTab);
  const cards = useCardStore((s) => s.cards);
  const tabCards = cards.filter((c) => c.type === activeTab);

  if (tabCards.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 pt-3 pb-1">
      <div className="flex items-center gap-4 text-xs text-gray-400">
        {activeTab === 'task' ? <TaskStats cards={tabCards as TaskCard[]} /> : <FinanceStats cards={tabCards as FinanceCard[]} />}
      </div>
    </div>
  );
}

function TaskStats({ cards }: { cards: TaskCard[] }) {
  const done = cards.filter((c) => c.status === 'done').length;
  const inProgress = cards.filter((c) => c.status === 'in_progress').length;
  const overdue = cards.filter(
    (c) => c.status !== 'done' && isOverdue(c.dueDate)
  ).length;
  const pct = cards.length > 0 ? Math.round((done / cards.length) * 100) : 0;

  return (
    <>
      <span>完成率 <b className="text-indigo-500">{pct}%</b></span>
      <span className="text-gray-300">|</span>
      <span>已完成 <b className="text-gray-600">{done}</b></span>
      <span>进行中 <b className="text-amber-500">{inProgress}</b></span>
      {overdue > 0 && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-red-500">逾期 <b>{overdue}</b></span>
        </>
      )}
    </>
  );
}

function FinanceStats({ cards }: { cards: FinanceCard[] }) {
  const pending = cards.filter((c) => c.status === 'pending').length;
  const approved = cards.filter((c) => c.status === 'approved').length;
  const rejected = cards.filter((c) => c.status === 'rejected').length;
  const totalAmount = cards.reduce((sum, c) => sum + c.amount, 0);
  const pendingAmount = cards.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);

  return (
    <>
      <span>总额 <b className="text-red-500">¥{totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</b></span>
      <span className="text-gray-300">|</span>
      <span>待审批 <b className="text-amber-500">{pending}</b></span>
      <span>已审批 <b className="text-emerald-500">{approved}</b></span>
      {rejected > 0 && <span>已拒绝 <b className="text-red-400">{rejected}</b></span>}
      {pendingAmount > 0 && (
        <>
          <span className="text-gray-300">|</span>
          <span>待审批金额 <b className="text-amber-500">¥{pendingAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</b></span>
        </>
      )}
    </>
  );
}
