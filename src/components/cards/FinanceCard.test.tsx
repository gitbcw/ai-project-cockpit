import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinanceCardComponent from '@/components/cards/FinanceCard';
import type { FinanceCard } from '@/types/card';

const makeFinanceCard = (overrides: Partial<FinanceCard> = {}): FinanceCard => ({
  id: 'f1',
  type: 'finance',
  title: '测试报销',
  description: '报销描述',
  createdAt: '2025-04-18T00:00:00.000Z',
  updatedAt: '2025-04-18T00:00:00.000Z',
  order: 0,
  status: 'pending',
  amount: 1234.56,
  requester: '李四',
  category: '差旅',
  expenseDate: '2025-04-17',
  images: [],
  ...overrides,
});

describe('FinanceCard', () => {
  it('渲染标题和金额', () => {
    render(<FinanceCardComponent card={makeFinanceCard()} onClick={() => {}} />);
    expect(screen.getByText('测试报销')).toBeInTheDocument();
    expect(screen.getByText(/1,234.56/)).toBeInTheDocument();
  });

  it('点击触发 onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<FinanceCardComponent card={makeFinanceCard()} onClick={onClick} />);
    await user.click(screen.getByLabelText('财务：测试报销'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('有凭证时显示数量', () => {
    render(
      <FinanceCardComponent
        card={makeFinanceCard({ images: ['/uploads/a.jpg', '/uploads/b.jpg'] })}
        onClick={() => {}}
      />
    );
    expect(screen.getByText(/2.*张凭证/)).toBeInTheDocument();
  });

  it('无凭证时不显示凭证区域', () => {
    render(<FinanceCardComponent card={makeFinanceCard()} onClick={() => {}} />);
    expect(screen.queryByText(/张凭证/)).not.toBeInTheDocument();
  });

  it('有 aria-label', () => {
    render(<FinanceCardComponent card={makeFinanceCard()} onClick={() => {}} />);
    expect(screen.getByLabelText('财务：测试报销')).toBeInTheDocument();
  });
});
