export type ProjectStatus = 'active' | 'paused' | 'shipped' | 'archived';
export type ProjectStage = 'exploring' | 'planning' | 'building' | 'testing' | 'launched';
export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'canceled';
export type ContextType = 'note' | 'doc' | 'meeting' | 'feedback' | 'research' | 'link' | 'file';
export type AIRecordValue = 'insight' | 'task_suggestion' | 'draft' | 'code' | 'research' | 'decision_support';

export interface SystemSettings {
  assignees: string[];
  projectTemplate: {
    name: string;
    oneLiner: string;
    owner: string;
    members: string[];
    weeklyFocus: string[];
    summary: string;
    status: ProjectStatus;
    stage: ProjectStage;
    priority: Priority;
  };
  taskDefaults: {
    owner: string;
    status: TaskStatus;
    priority: Priority;
    dueDateOffsetDays: number;
  };
  workspace: {
    defaultTaskFilter: 'active' | 'all' | 'done';
    contextLimit: number;
    decisionLimit: number;
  };
}

export type SystemSettingsUpdate = {
  assignees?: string[];
  projectTemplate?: Partial<SystemSettings['projectTemplate']>;
  taskDefaults?: Partial<SystemSettings['taskDefaults']>;
  workspace?: Partial<SystemSettings['workspace']>;
};

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
  pinned?: boolean;
  archived?: boolean;
  workspaceVisible?: boolean;
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
  pinned?: boolean;
  archived?: boolean;
  workspaceVisible?: boolean;
  updatedAt?: string;
  createdAt: string;
}

export interface CockpitStateSnapshot {
  settings: SystemSettings;
  projects: Project[];
  tasks: TaskCard[];
  contexts: ContextCard[];
  aiRecords: AIRecordCard[];
  decisions: DecisionCard[];
  selectedProjectId: string | null;
}

export type AIChange =
  | {
      id: string;
      type: 'create_task';
      title: string;
      payload: {
        title: string;
        description?: string;
        priority?: Priority;
        status?: TaskStatus;
      };
    }
  | {
      id: string;
      type: 'create_context';
      title: string;
      payload: {
        title: string;
        content: string;
        type?: ContextType;
        importance?: Priority;
        source?: string;
      };
    }
  | {
      id: string;
      type: 'create_decision';
      title: string;
      payload: {
        title: string;
        decision: string;
        rationale?: string;
      };
    }
  | {
      id: string;
      type: 'update_project_summary';
      title: string;
      payload: {
        summary: string;
      };
    }
  | {
      id: string;
      type: 'update_weekly_focus';
      title: string;
      payload: {
        weeklyFocus: string[];
      };
    };

export interface AIPlan {
  output: string;
  changes: AIChange[];
}
