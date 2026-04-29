'use client';

import { create } from 'zustand';
import type {
  AIChange,
  AIRecordCard,
  CockpitStateSnapshot,
  ContextCard,
  DecisionCard,
  Project,
  TaskCard,
  TaskStatus,
} from '@/types/cockpit';
import { sampleSnapshot } from '@/lib/sampleData';

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();

interface CockpitStore extends CockpitStateSnapshot {
  hydrated: boolean;
  stateVersion: string | null;
  searchQuery: string;
  aiOutput: string;
  aiChanges: AIChange[];
  selectedAIChangeIds: string[];
  aiLoading: boolean;
  load: () => Promise<void>;
  save: () => Promise<void>;
  selectProject: (id: string) => void;
  setSearchQuery: (query: string) => void;
  createProject: () => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  createTask: (projectId: string) => void;
  updateTask: (id: string, updates: Partial<TaskCard>) => void;
  deleteTask: (id: string) => void;
  cycleTaskStatus: (id: string) => void;
  createContext: (projectId: string) => void;
  updateContext: (id: string, updates: Partial<ContextCard>) => void;
  deleteContext: (id: string) => void;
  createAIRecord: (projectId: string, output?: string) => void;
  updateAIRecord: (id: string, updates: Partial<AIRecordCard>) => void;
  deleteAIRecord: (id: string) => void;
  createTaskFromAIRecord: (recordId: string) => void;
  createDecision: (projectId: string) => void;
  updateDecision: (id: string, updates: Partial<DecisionCard>) => void;
  deleteDecision: (id: string) => void;
  runAiAction: (projectId: string, action: string) => Promise<void>;
  toggleAIChange: (id: string) => void;
  applySelectedAIChanges: (projectId: string) => void;
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  todo: 'doing',
  doing: 'blocked',
  blocked: 'done',
  done: 'todo',
  canceled: 'todo',
};

const snapshotFromState = (state: CockpitStore): CockpitStateSnapshot => ({
  projects: state.projects,
  tasks: state.tasks,
  contexts: state.contexts,
  aiRecords: state.aiRecords,
  decisions: state.decisions,
  selectedProjectId: state.selectedProjectId,
});

export const useCockpitStore = create<CockpitStore>()((set, get) => ({
  ...sampleSnapshot,
  hydrated: false,
  stateVersion: null,
  searchQuery: '',
  aiOutput: '',
  aiChanges: [],
  selectedAIChangeIds: [],
  aiLoading: false,

  load: async () => {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load cockpit state');
    const snapshot = (await res.json()) as CockpitStateSnapshot & { stateVersion?: string };
    set({ ...snapshot, stateVersion: snapshot.stateVersion || null, hydrated: true });
  },

  save: async () => {
    const current = get();
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...snapshotFromState(current), stateVersion: current.stateVersion }),
    });
    if (!res.ok) throw new Error('Failed to save cockpit state');
    const data = (await res.json()) as { stateVersion?: string; merged?: boolean; snapshot?: CockpitStateSnapshot };
    if (data.merged && data.snapshot) {
      set({ ...data.snapshot, stateVersion: data.stateVersion || null });
      return;
    }
    if (data.stateVersion) set({ stateVersion: data.stateVersion });
  },

  selectProject: (id) => set({ selectedProjectId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  createProject: () => {
    const id = makeId('project');
    const timestamp = now();
    const project: Project = {
      id,
      name: '新产品研发项目',
      oneLiner: '一句话说明这个项目要达成什么',
      description: '',
      status: 'active',
      stage: 'exploring',
      owner: 'Combo',
      members: ['Combo'],
      priority: 'medium',
      weeklyFocus: ['明确目标', '拆出第一批任务'],
      summary: '这个项目还在整理中。',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ projects: [project, ...state.projects], selectedProjectId: id }));
  },

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...updates, updatedAt: now() } : project,
      ),
    })),

  createTask: (projectId) => {
    const timestamp = now();
    const task: TaskCard = {
      id: makeId('task'),
      projectId,
      title: '新任务',
      description: '',
      status: 'todo',
      owner: '',
      priority: 'medium',
      dueDate: '',
      subtasks: [],
      notes: '',
      source: 'manual',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ tasks: [task, ...state.tasks] }));
  },

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...updates, updatedAt: now() } : task)),
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),

  cycleTaskStatus: (id) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, status: nextStatus[task.status], updatedAt: now() } : task,
      ),
    })),

  createContext: (projectId) => {
    const timestamp = now();
    const context: ContextCard = {
      id: makeId('context'),
      projectId,
      title: '新上下文',
      type: 'idea',
      content: '',
      url: '',
      source: '',
      importance: 'medium',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ contexts: [context, ...state.contexts] }));
  },

  updateContext: (id, updates) =>
    set((state) => ({
      contexts: state.contexts.map((context) =>
        context.id === id ? { ...context, ...updates, updatedAt: now() } : context,
      ),
    })),

  deleteContext: (id) =>
    set((state) => ({
      contexts: state.contexts.filter((context) => context.id !== id),
    })),

  createAIRecord: (projectId, output = '') => {
    const timestamp = now();
    const record: AIRecordCard = {
      id: makeId('ai'),
      projectId,
      title: output ? 'AI 辅助输出' : '外部 AI 工作记录',
      tool: output ? 'Cockpit AI' : 'External AI',
      inputSummary: '',
      outputSummary: output || '',
      rawOutput: output || '',
      value: 'insight',
      status: 'saved',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ aiRecords: [record, ...state.aiRecords] }));
  },

  updateAIRecord: (id, updates) =>
    set((state) => ({
      aiRecords: state.aiRecords.map((record) =>
        record.id === id ? { ...record, ...updates, updatedAt: now() } : record,
      ),
    })),

  deleteAIRecord: (id) =>
    set((state) => ({
      aiRecords: state.aiRecords.filter((record) => record.id !== id),
    })),

  createTaskFromAIRecord: (recordId) => {
    const record = get().aiRecords.find((item) => item.id === recordId);
    if (!record) return;
    const timestamp = now();
    const firstLine = record.outputSummary
      .split('\n')
      .map((line) => line.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim())
      .find(Boolean);
    const task: TaskCard = {
      id: makeId('task'),
      projectId: record.projectId,
      title: firstLine ? `跟进：${firstLine.slice(0, 32)}` : `跟进：${record.title}`,
      description: record.outputSummary.slice(0, 240),
      status: 'todo',
      owner: '',
      priority: 'medium',
      dueDate: '',
      subtasks: [],
      notes: `来自 AI Record：${record.title}`,
      source: 'ai_generated',
      relatedAiRecordId: record.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({
      tasks: [task, ...state.tasks],
      aiRecords: state.aiRecords.map((item) =>
        item.id === record.id ? { ...item, status: 'converted', updatedAt: timestamp } : item,
      ),
    }));
  },

  createDecision: (projectId) => {
    const decision: DecisionCard = {
      id: makeId('decision'),
      projectId,
      title: '新决策',
      decision: '',
      rationale: '',
      alternatives: '',
      impact: '',
      decidedBy: ['Combo'],
      createdAt: now(),
    };
    set((state) => ({ decisions: [decision, ...state.decisions] }));
  },

  updateDecision: (id, updates) =>
    set((state) => ({
      decisions: state.decisions.map((decision) => (decision.id === id ? { ...decision, ...updates } : decision)),
    })),

  deleteDecision: (id) =>
    set((state) => ({
      decisions: state.decisions.filter((decision) => decision.id !== id),
    })),

  runAiAction: async (projectId, action) => {
    set({ aiLoading: true, aiOutput: '', aiChanges: [], selectedAIChangeIds: [] });
    const state = snapshotFromState(get());
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId, action, state }),
    });
    const data = (await res.json()) as { output: string; changes?: AIChange[] };
    const changes = data.changes || [];
    set({ aiOutput: data.output, aiChanges: changes, selectedAIChangeIds: changes.map((change) => change.id), aiLoading: false });
  },

  toggleAIChange: (id) =>
    set((state) => ({
      selectedAIChangeIds: state.selectedAIChangeIds.includes(id)
        ? state.selectedAIChangeIds.filter((item) => item !== id)
        : [...state.selectedAIChangeIds, id],
    })),

  applySelectedAIChanges: (projectId) => {
    const state = get();
    const selected = state.aiChanges.filter((change) => state.selectedAIChangeIds.includes(change.id));
    if (selected.length === 0) return;

    const timestamp = now();
    const newTasks: TaskCard[] = [];
    const newContexts: ContextCard[] = [];
    const newDecisions: DecisionCard[] = [];
    let projectUpdates: Partial<Project> = {};

    selected.forEach((change) => {
      if (change.type === 'create_task') {
        newTasks.push({
          id: makeId('task'),
          projectId,
          title: change.payload.title,
          description: change.payload.description || '',
          status: change.payload.status || 'todo',
          owner: '',
          priority: change.payload.priority || 'medium',
          dueDate: '',
          subtasks: [],
          notes: '由 AI 建议变更创建',
          source: 'ai_generated',
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }

      if (change.type === 'create_context') {
        newContexts.push({
          id: makeId('context'),
          projectId,
          title: change.payload.title,
          content: change.payload.content,
          type: change.payload.type || 'idea',
          importance: change.payload.importance || 'medium',
          source: change.payload.source || 'AI 建议',
          url: '',
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }

      if (change.type === 'create_decision') {
        newDecisions.push({
          id: makeId('decision'),
          projectId,
          title: change.payload.title,
          decision: change.payload.decision,
          rationale: change.payload.rationale || '',
          alternatives: '',
          impact: '',
          decidedBy: ['Combo'],
          createdAt: timestamp,
        });
      }

      if (change.type === 'update_project_summary') {
        projectUpdates = { ...projectUpdates, summary: change.payload.summary };
      }

      if (change.type === 'update_weekly_focus') {
        projectUpdates = { ...projectUpdates, weeklyFocus: change.payload.weeklyFocus.slice(0, 3) };
      }
    });

    set((current) => ({
      tasks: [...newTasks, ...current.tasks],
      contexts: [...newContexts, ...current.contexts],
      decisions: [...newDecisions, ...current.decisions],
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, ...projectUpdates, updatedAt: timestamp } : project,
      ),
      aiChanges: current.aiChanges.filter((change) => !current.selectedAIChangeIds.includes(change.id)),
      selectedAIChangeIds: [],
    }));
  },
}));
