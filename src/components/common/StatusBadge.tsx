import type { TaskCard, FinanceCard } from '@/types/card';

type StatusConfig = {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
};

const taskStatusMap: Record<TaskCard['status'], StatusConfig> = {
  todo: { label: '待办', color: 'text-gray-500', bgColor: 'bg-gray-100', dotColor: 'bg-gray-400' },
  in_progress: { label: '进行中', color: 'text-amber-600', bgColor: 'bg-amber-50', dotColor: 'bg-amber-400' },
  done: { label: '已完成', color: 'text-indigo-600', bgColor: 'bg-indigo-50', dotColor: 'bg-indigo-500' },
};

const financeStatusMap: Record<FinanceCard['status'], StatusConfig> = {
  pending: { label: '待审批', color: 'text-amber-600', bgColor: 'bg-amber-50', dotColor: 'bg-amber-400' },
  approved: { label: '已审批', color: 'text-emerald-600', bgColor: 'bg-emerald-50', dotColor: 'bg-emerald-500' },
  rejected: { label: '已拒绝', color: 'text-red-600', bgColor: 'bg-red-50', dotColor: 'bg-red-400' },
};

interface StatusBadgeProps {
  status: TaskCard['status'] | FinanceCard['status'];
  cardType: 'task' | 'finance';
}

export default function StatusBadge({ status, cardType }: StatusBadgeProps) {
  const config = cardType === 'task' ? taskStatusMap[status as TaskCard['status']] : financeStatusMap[status as FinanceCard['status']];
  if (!config) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}
