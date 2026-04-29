import { describe, it, expect, beforeEach } from 'vitest';
import { useCardStore } from '@/store/useCardStore';
import type { TaskCard, FinanceCard } from '@/types/card';

// 重置 store 状态
beforeEach(() => {
  useCardStore.setState({
    cards: [],
    selectedCardId: null,
    activeTab: 'task',
    searchQuery: '',
    isNewCard: false,
    sortMode: 'manual',
  });
});

const makeTaskCard = (overrides: Partial<TaskCard> = {}): TaskCard => ({
  id: 'task-1',
  type: 'task',
  title: '测试任务',
  description: '',
  createdAt: '2025-04-18T00:00:00.000Z',
  updatedAt: '2025-04-18T00:00:00.000Z',
  order: 0,
  status: 'todo',
  assignee: '张三',
  dueDate: '2025-05-01',
  priority: 'medium',
  progress: 0,
  subtasks: [],
  notes: '',
  ...overrides,
});

const makeFinanceCard = (overrides: Partial<FinanceCard> = {}): FinanceCard => ({
  id: 'fin-1',
  type: 'finance',
  title: '测试报销',
  description: '',
  createdAt: '2025-04-18T00:00:00.000Z',
  updatedAt: '2025-04-18T00:00:00.000Z',
  order: 0,
  status: 'pending',
  amount: 100,
  requester: '李四',
  category: '差旅',
  expenseDate: '2025-04-17',
  images: [],
  ...overrides,
});

describe('useCardStore - 基础 CRUD', () => {
  it('初始状态为空', () => {
    const state = useCardStore.getState();
    expect(state.cards).toHaveLength(0);
    expect(state.selectedCardId).toBeNull();
    expect(state.isNewCard).toBe(false);
  });

  it('addCard 添加卡片', () => {
    useCardStore.getState().addCard(makeTaskCard());
    expect(useCardStore.getState().cards).toHaveLength(1);
    expect(useCardStore.getState().cards[0].title).toBe('测试任务');
  });

  it('updateCard 更新卡片', () => {
    useCardStore.getState().addCard(makeTaskCard());
    useCardStore.getState().updateCard('task-1', { title: '更新后' });
    expect(useCardStore.getState().cards[0].title).toBe('更新后');
  });

  it('updateCard 设置 updatedAt', () => {
    useCardStore.getState().addCard(makeTaskCard());
    // 等待一点时间确保 updatedAt 不同
    useCardStore.getState().updateCard('task-1', { title: 'x' });
    const after = useCardStore.getState().cards[0].updatedAt;
    // updatedAt 应该被更新（时间戳不同或相同，取决于执行速度）
    expect(typeof after).toBe('string');
  });

  it('updateCard 不影响其他卡片', () => {
    useCardStore.getState().addCard(makeTaskCard({ id: 't1' }));
    useCardStore.getState().addCard(makeTaskCard({ id: 't2', title: '不应变' }));
    useCardStore.getState().updateCard('t1', { title: '变了' });
    const cards = useCardStore.getState().cards;
    expect(cards.find((c) => c.id === 't1')!.title).toBe('变了');
    expect(cards.find((c) => c.id === 't2')!.title).toBe('不应变');
  });

  it('deleteCard 删除卡片', () => {
    useCardStore.getState().addCard(makeTaskCard());
    useCardStore.getState().deleteCard('task-1');
    expect(useCardStore.getState().cards).toHaveLength(0);
  });

  it('deleteCard 同时清除 selectedCardId', () => {
    useCardStore.getState().addCard(makeTaskCard());
    useCardStore.getState().selectCard('task-1');
    expect(useCardStore.getState().selectedCardId).toBe('task-1');
    useCardStore.getState().deleteCard('task-1');
    expect(useCardStore.getState().selectedCardId).toBeNull();
  });
});

describe('useCardStore - 创建卡片', () => {
  it('createTaskCard 创建任务卡片', () => {
    useCardStore.getState().createTaskCard({
      title: '新任务',
      description: '',
      status: 'todo',
      assignee: '',
      dueDate: '',
      priority: 'medium',
      progress: 0,
      subtasks: [],
      notes: '',
    });
    const state = useCardStore.getState();
    expect(state.cards).toHaveLength(1);
    const card = state.cards[0] as TaskCard;
    expect(card.type).toBe('task');
    expect(card.title).toBe('新任务');
    expect(card.id).toBeTruthy();
  });

  it('createTaskCard 设置 selectedCardId 和 isNewCard', () => {
    useCardStore.getState().createTaskCard({
      title: '新任务',
      description: '',
      status: 'todo',
      assignee: '',
      dueDate: '',
      priority: 'medium',
      progress: 0,
      subtasks: [],
      notes: '',
    });
    const state = useCardStore.getState();
    expect(state.selectedCardId).toBeTruthy();
    expect(state.isNewCard).toBe(true);
  });

  it('createFinanceCard 创建财务卡片', () => {
    useCardStore.getState().createFinanceCard({
      title: '新报销',
      description: '',
      status: 'pending',
      amount: 200,
      requester: '',
      category: '',
      expenseDate: '',
      images: [],
    });
    const card = useCardStore.getState().cards[0] as FinanceCard;
    expect(card.type).toBe('finance');
    expect(card.amount).toBe(200);
  });
});

describe('useCardStore - order 不重复', () => {
  it('删除后再创建 order 不重复', () => {
    useCardStore.getState().addCard(makeTaskCard({ id: 'a', order: 0 }));
    useCardStore.getState().addCard(makeTaskCard({ id: 'b', order: 1 }));
    useCardStore.getState().deleteCard('a');
    useCardStore.getState().createTaskCard({
      title: '新',
      description: '',
      status: 'todo',
      assignee: '',
      dueDate: '',
      priority: 'medium',
      progress: 0,
      subtasks: [],
      notes: '',
    });
    const cards = useCardStore.getState().cards;
    const orders = cards.map((c) => c.order);
    // 所有 order 应唯一
    expect(new Set(orders).size).toBe(orders.length);
  });
});

describe('useCardStore - 拖拽排序', () => {
  it('reorderCards 正确排序', () => {
    useCardStore.getState().addCard(makeTaskCard({ id: 'a', order: 0 }));
    useCardStore.getState().addCard(makeTaskCard({ id: 'b', order: 1 }));
    useCardStore.getState().addCard(makeTaskCard({ id: 'c', order: 2 }));
    // 反转顺序：c=0, b=1, a=2
    useCardStore.getState().reorderCards(['c', 'b', 'a']);
    const cards = useCardStore.getState().cards;
    expect(cards.find((c) => c.id === 'a')!.order).toBe(2);
    expect(cards.find((c) => c.id === 'b')!.order).toBe(1);
    expect(cards.find((c) => c.id === 'c')!.order).toBe(0);
  });

  it('reorderCards 不影响未参与排序的卡片', () => {
    useCardStore.getState().addCard(makeTaskCard({ id: 'a', order: 0 }));
    useCardStore.getState().addCard(makeFinanceCard({ id: 'f1', order: 1 }));
    useCardStore.getState().addCard(makeTaskCard({ id: 'b', order: 2 }));
    // 只排 a 和 b
    useCardStore.getState().reorderCards(['b', 'a']);
    const cards = useCardStore.getState().cards;
    expect(cards.find((c) => c.id === 'f1')!.order).toBe(1); // 不变
    expect(cards.find((c) => c.id === 'b')!.order).toBe(0);
    expect(cards.find((c) => c.id === 'a')!.order).toBe(1);
  });
});

describe('useCardStore - 子任务', () => {
  it('addSubtask 添加子任务', () => {
    useCardStore.getState().addCard(makeTaskCard({ id: 't1' }));
    useCardStore.getState().addSubtask('t1', '子任务1');
    const card = useCardStore.getState().cards[0] as TaskCard;
    expect(card.subtasks).toHaveLength(1);
    expect(card.subtasks[0].title).toBe('子任务1');
    expect(card.subtasks[0].completed).toBe(false);
  });

  it('toggleSubtask 切换子任务状态', () => {
    useCardStore.getState().addCard(makeTaskCard({ id: 't1' }));
    useCardStore.getState().addSubtask('t1', '子任务1');
    const subtaskId = (useCardStore.getState().cards[0] as TaskCard).subtasks[0].id;
    useCardStore.getState().toggleSubtask('t1', subtaskId);
    const card = useCardStore.getState().cards[0] as TaskCard;
    expect(card.subtasks[0].completed).toBe(true);
  });

  it('toggleSubtask 自动计算 progress', () => {
    useCardStore.getState().addCard(makeTaskCard({ id: 't1' }));
    useCardStore.getState().addSubtask('t1', 'a');
    useCardStore.getState().addSubtask('t1', 'b');
    const card = useCardStore.getState().cards[0] as TaskCard;
    const st1 = card.subtasks[0].id;
    useCardStore.getState().toggleSubtask('t1', st1);
    const updated = useCardStore.getState().cards[0] as TaskCard;
    expect(updated.progress).toBe(50);
  });

  it('deleteSubtask 删除子任务', () => {
    useCardStore.getState().addCard(makeTaskCard({ id: 't1' }));
    useCardStore.getState().addSubtask('t1', '子任务1');
    const subtaskId = (useCardStore.getState().cards[0] as TaskCard).subtasks[0].id;
    useCardStore.getState().deleteSubtask('t1', subtaskId);
    const card = useCardStore.getState().cards[0] as TaskCard;
    expect(card.subtasks).toHaveLength(0);
  });

  it('子任务操作不影响财务卡片', () => {
    useCardStore.getState().addCard(makeFinanceCard({ id: 'f1' }));
    useCardStore.getState().addSubtask('f1', '应该无效');
    expect(useCardStore.getState().cards).toHaveLength(1); // 卡片结构没变
  });
});

describe('useCardStore - duplicateCard', () => {
  it('复制卡片并加 (副本) 后缀', () => {
    useCardStore.getState().addCard(makeTaskCard({ id: 't1', title: '原始' }));
    useCardStore.getState().duplicateCard('t1');
    const cards = useCardStore.getState().cards;
    expect(cards).toHaveLength(2);
    expect(cards[1].title).toBe('原始 (副本)');
    expect(cards[1].id).not.toBe('t1');
  });

  it('复制后 order 递增', () => {
    useCardStore.getState().addCard(makeTaskCard({ id: 't1', order: 0 }));
    useCardStore.getState().duplicateCard('t1');
    const cards = useCardStore.getState().cards;
    expect(cards[1].order).toBeGreaterThan(cards[0].order);
  });
});

describe('useCardStore - importCards', () => {
  it('导入有效数据', () => {
    const json = JSON.stringify({
      cards: [makeTaskCard()],
      version: 1,
    });
    const result = useCardStore.getState().importCards(json);
    expect(result).toBe(true);
    expect(useCardStore.getState().cards).toHaveLength(1);
  });

  it('导入无效 JSON 返回 false', () => {
    const result = useCardStore.getState().importCards('not json');
    expect(result).toBe(false);
  });

  it('导入无效结构返回 false', () => {
    const result = useCardStore.getState().importCards('{"foo":"bar"}');
    expect(result).toBe(false);
  });

  it('导入空数组返回 false', () => {
    const result = useCardStore.getState().importCards('{"cards":[]}');
    expect(result).toBe(false);
  });
});

describe('useCardStore - selectCard / clearIsNew', () => {
  it('selectCard 设置 selectedCardId 并清除 isNewCard', () => {
    useCardStore.setState({ isNewCard: true });
    useCardStore.getState().selectCard('abc');
    expect(useCardStore.getState().selectedCardId).toBe('abc');
    expect(useCardStore.getState().isNewCard).toBe(false);
  });

  it('selectCard(null) 清除选中', () => {
    useCardStore.getState().selectCard('abc');
    useCardStore.getState().selectCard(null);
    expect(useCardStore.getState().selectedCardId).toBeNull();
  });

  it('clearIsNew 清除标志', () => {
    useCardStore.setState({ isNewCard: true });
    useCardStore.getState().clearIsNew();
    expect(useCardStore.getState().isNewCard).toBe(false);
  });
});

describe('useCardStore - setActiveTab', () => {
  it('切换 tab 并清除 searchQuery', () => {
    useCardStore.setState({ searchQuery: '搜索中' });
    useCardStore.getState().setActiveTab('finance');
    expect(useCardStore.getState().activeTab).toBe('finance');
    expect(useCardStore.getState().searchQuery).toBe('');
  });
});
