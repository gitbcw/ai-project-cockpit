export type ProjectStatus = 'active' | 'paused' | 'shipped' | 'archived';
export type ProjectStage = 'exploring' | 'planning' | 'building' | 'testing' | 'launched';
export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'canceled';
export type ContextType = 'note' | 'doc' | 'meeting' | 'feedback' | 'research' | 'link' | 'file';
export type AIRecordValue = 'insight' | 'task_suggestion' | 'draft' | 'code' | 'research' | 'decision_support';

export interface Project {
  id: string;
  name: string;
  oneLiner: string;
  description: string;
  status: ProjectStatus;
  stage: ProjectStage;
  owner: string;
  members: string[];
  priority: Priority;
  weeklyFocus: string[];
  summary: string;
  updatedAt: string;
  createdAt: string;
}

export interface TaskCard {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  owner: string;
  priority: Priority;
  dueDate: string;
  subtasks: { id: string; title: string; completed: boolean }[];
  notes: string;
  source: 'manual' | 'ai_generated';
  relatedAiRecordId?: string;
  updatedAt: string;
  createdAt: string;
}

export interface ContextCard {
  id: string;
  projectId: string;
  title: string;
  type: ContextType;
  content: string;
  url: string;
  importance: Priority;
  source: string;
  updatedAt: string;
  createdAt: string;
}

export interface AIRecordCard {
  id: string;
  projectId: string;
  title: string;
  tool: string;
  inputSummary: string;
  outputSummary: string;
  rawOutput: string;
  value: AIRecordValue;
  status: 'saved' | 'used' | 'rejected' | 'converted';
  updatedAt: string;
  createdAt: string;
}

export interface DecisionCard {
  id: string;
  projectId: string;
  title: string;
  decision: string;
  rationale: string;
  alternatives: string;
  impact: string;
  decidedBy: string[];
  createdAt: string;
}

export interface CockpitStateSnapshot {
  projects: Project[];
  tasks: TaskCard[];
  contexts: ContextCard[];
  aiRecords: AIRecordCard[];
  decisions: DecisionCard[];
  selectedProjectId: string | null;
}
