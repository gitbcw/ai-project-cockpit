import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskCardComponent from '@/components/cards/TaskCard';
import type { TaskCard } from '@/types/card';

const makeTaskCard = (overrides: Partial<TaskCard> = {}): TaskCard => ({
  id: 't1',
  type: 'task',
  title: '测试任务',
  description: '任务描述',
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

describe('TaskCard', () => {
  it('渲染标题', () => {
    render(<TaskCardComponent card={makeTaskCard()} onClick={() => {}} />);
    expect(screen.getByText('测试任务')).toBeInTheDocument();
  });

  it('点击触发 onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TaskCardComponent card={makeTaskCard()} onClick={onClick} />);
    await user.click(screen.getByLabelText('任务：测试任务'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('已完成的任务标题有 line-through', () => {
    render(<TaskCardComponent card={makeTaskCard({ status: 'done' })} onClick={() => {}} />);
    const title = screen.getByText('测试任务');
    expect(title.className).toContain('line-through');
  });

  it('有子任务时显示进度条', () => {
    render(
      <TaskCardComponent
        card={makeTaskCard({ subtasks: [{ id: 's1', title: '子任务', completed: false }], progress: 0 })}
        onClick={() => {}}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('无子任务时不显示进度条', () => {
    render(<TaskCardComponent card={makeTaskCard()} onClick={() => {}} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('有 aria-label', () => {
    render(<TaskCardComponent card={makeTaskCard()} onClick={() => {}} />);
    expect(screen.getByLabelText('任务：测试任务')).toBeInTheDocument();
  });

  it('逾期任务显示"已逾期"', () => {
    render(<TaskCardComponent card={makeTaskCard({ dueDate: '2020-01-01' })} onClick={() => {}} />);
    expect(screen.getByText(/已逾期/)).toBeInTheDocument();
  });
});
