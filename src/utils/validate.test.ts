import { describe, it, expect } from 'vitest';
import { validateCards } from '@/utils/validate';
import type { TaskCard, FinanceCard } from '@/types/card';

const makeTaskCard = (overrides: Partial<TaskCard> = {}): TaskCard => ({
  id: 't1',
  type: 'task',
  title: '测试任务',
  description: '',
  createdAt: '2025-04-18T00:00:00.000Z',
  updatedAt: '2025-04-18T00:00:00.000Z',
  order: 0,
  status: 'todo',
  assignee: '',
  dueDate: '',
  priority: 'medium',
  progress: 0,
  subtasks: [],
  notes: '',
  ...overrides,
});

const makeFinanceCard = (overrides: Partial<FinanceCard> = {}): FinanceCard => ({
  id: 'f1',
  type: 'finance',
  title: '测试报销',
  description: '',
  createdAt: '2025-04-18T00:00:00.000Z',
  updatedAt: '2025-04-18T00:00:00.000Z',
  order: 0,
  status: 'pending',
  amount: 100,
  requester: '张三',
  category: '差旅',
  expenseDate: '2025-04-17',
  images: [],
  ...overrides,
});

describe('validateCards', () => {
  it('返回 null 当输入不是对象', () => {
    expect(validateCards(null)).toBeNull();
    expect(validateCards('string')).toBeNull();
    expect(validateCards(123)).toBeNull();
  });

  it('返回 null 当没有 cards 数组', () => {
    expect(validateCards({})).toBeNull();
    expect(validateCards({ cards: 'not array' })).toBeNull();
  });

  it('返回 null 当 cards 为空数组', () => {
    expect(validateCards({ cards: [] })).toBeNull();
  });

  it('返回 null 当卡片缺少必要字段', () => {
    expect(validateCards({ cards: [{ type: 'task' }] })).toBeNull();
  });

  it('验证有效的任务卡片', () => {
    const result = validateCards({ cards: [makeTaskCard()] });
    expect(result).toHaveLength(1);
    expect(result![0].type).toBe('task');
  });

  it('验证有效的财务卡片', () => {
    const result = validateCards({ cards: [makeFinanceCard()] });
    expect(result).toHaveLength(1);
    expect(result![0].type).toBe('finance');
  });

  it('混合卡片都能通过', () => {
    const result = validateCards({
      cards: [makeTaskCard(), makeFinanceCard()],
    });
    expect(result).toHaveLength(2);
  });

  it('跳过无效卡片，保留有效的', () => {
    const result = validateCards({
      cards: [
        { type: 'task' }, // 无效
        makeTaskCard(), // 有效
        { type: 'unknown' }, // 未知类型
      ],
    });
    expect(result).toHaveLength(1);
  });

  it('拒绝无效的 status 值', () => {
    expect(validateCards({ cards: [makeTaskCard({ status: 'invalid' as TaskCard['status'] })] })).toBeNull();
    expect(validateCards({ cards: [makeFinanceCard({ status: 'invalid' as FinanceCard['status'] })] })).toBeNull();
  });

  it('拒绝无效的 priority 值', () => {
    expect(validateCards({ cards: [makeTaskCard({ priority: 'urgent' as TaskCard['priority'] })] })).toBeNull();
  });

  it('拒绝非数字的 amount', () => {
    expect(validateCards({ cards: [makeFinanceCard({ amount: 'abc' as unknown as number })] })).toBeNull();
  });

  it('拒绝非数组的 subtasks', () => {
    expect(validateCards({ cards: [makeTaskCard({ subtasks: 'invalid' as unknown as TaskCard['subtasks'] })] })).toBeNull();
  });

  it('拒绝非数组的 images', () => {
    expect(validateCards({ cards: [makeFinanceCard({ images: 'invalid' as unknown as FinanceCard['images'] })] })).toBeNull();
  });

  it('拒绝非字符串的 images 元素', () => {
    expect(validateCards({ cards: [makeFinanceCard({ images: [123 as unknown as string] })] })).toBeNull();
  });
});
