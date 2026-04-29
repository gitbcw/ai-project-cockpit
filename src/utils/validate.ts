import type { CardItem, TaskCard, FinanceCard } from '@/types/card';

const TASK_STATUSES: TaskCard['status'][] = ['todo', 'in_progress', 'done'];
const FINANCE_STATUSES: FinanceCard['status'][] = ['pending', 'approved', 'rejected'];
const PRIORITIES: TaskCard['priority'][] = ['high', 'medium', 'low'];

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v);
}

function validateTaskCard(card: Record<string, unknown>): boolean {
  return (
    isString(card.id) &&
    isString(card.title) &&
    isString(card.description) &&
    isString(card.createdAt) &&
    isString(card.updatedAt) &&
    isNumber(card.order) &&
    TASK_STATUSES.includes(card.status as TaskCard['status']) &&
    isString(card.assignee) &&
    isString(card.dueDate) &&
    PRIORITIES.includes(card.priority as TaskCard['priority']) &&
    isNumber(card.progress) &&
    Array.isArray(card.subtasks) &&
    card.subtasks.every(
      (st: unknown) =>
        typeof st === 'object' && st !== null &&
        isString((st as Record<string, unknown>).id) &&
        isString((st as Record<string, unknown>).title) &&
        typeof (st as Record<string, unknown>).completed === 'boolean'
    ) &&
    isString(card.notes)
  );
}

function validateFinanceCard(card: Record<string, unknown>): boolean {
  return (
    isString(card.id) &&
    isString(card.title) &&
    isString(card.description) &&
    isString(card.createdAt) &&
    isString(card.updatedAt) &&
    isNumber(card.order) &&
    FINANCE_STATUSES.includes(card.status as FinanceCard['status']) &&
    isNumber(card.amount) &&
    isString(card.requester) &&
    isString(card.category) &&
    isString(card.expenseDate) &&
    Array.isArray(card.images) &&
    (card.images as unknown[]).every((img) => isString(img))
  );
}

export function validateCards(data: unknown): CardItem[] | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.cards)) return null;

  const validCards: CardItem[] = [];
  for (const card of obj.cards) {
    if (!card || typeof card !== 'object') continue;
    const c = card as Record<string, unknown>;
    if (c.type === 'task' && validateTaskCard(c)) {
      validCards.push(c as unknown as TaskCard);
    } else if (c.type === 'finance' && validateFinanceCard(c)) {
      validCards.push(c as unknown as FinanceCard);
    }
    // 跳过无法识别的卡片，而不是中断整个导入
  }

  return validCards.length > 0 ? validCards : null;
}
