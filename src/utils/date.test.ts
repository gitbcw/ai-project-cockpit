import { describe, it, expect } from 'vitest';
import { toDateStr, todayStr, isOverdue } from '@/utils/date';

describe('toDateStr', () => {
  it('提取 YYYY-MM-DD 部分', () => {
    expect(toDateStr('2025-04-18')).toBe('2025-04-18');
    expect(toDateStr('2025-04-18T08:00:00.000Z')).toBe('2025-04-18');
    expect(toDateStr('2025-12-01T23:59:59.999Z')).toBe('2025-12-01');
  });
});

describe('todayStr', () => {
  it('返回 YYYY-MM-DD 格式', () => {
    const result = todayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('返回今天的日期', () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(todayStr()).toBe(expected);
  });
});

describe('isOverdue', () => {
  it('空字符串不算逾期', () => {
    expect(isOverdue('')).toBe(false);
  });

  it('过去的日期算逾期', () => {
    expect(isOverdue('2020-01-01')).toBe(true);
  });

  it('今天不算逾期', () => {
    expect(isOverdue(todayStr())).toBe(false);
  });

  it('未来日期不算逾期', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const futureStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
    expect(isOverdue(futureStr)).toBe(false);
  });
});
