export interface Card {
  id: string;
  type: 'task' | 'finance';
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskCard extends Card {
  type: 'task';
  status: 'todo' | 'in_progress' | 'done';
  assignee: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  progress: number;
  subtasks: Subtask[];
  notes: string;
}

export interface FinanceCard extends Card {
  type: 'finance';
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  requester: string;
  category: string;
  expenseDate: string;
  images: string[];
}

export type CardItem = TaskCard | FinanceCard;

export type TabType = 'task' | 'finance';
export type SortMode = 'manual' | 'priority' | 'dueDate' | 'createdAt';
