'use client';

import { create } from 'zustand';
import type {
  AIChange,
  AIRecordCard,
  CockpitStateSnapshot,
  ContextCard,
  DecisionCard,
  FinanceCard,
  FinanceReceipt,
  Project,
  ProjectOutlineItem,
  ProjectOutlineStageGoal,
  SystemSettings,
  SystemSettingsUpdate,
  TaskCard,
  TaskStatus,
} from '@/types/cockpit';
import { sampleSnapshot } from '@/lib/sampleData';

const defaultSettings: SystemSettings = {
  assignees: ['Combo', 'Codex', 'Claude'],
  projectTemplate: {
    name: '新产品研发项目',
    oneLiner: '一句话说明这个项目要达成什么',
    owner: 'Combo',
    members: ['Combo'],
    weeklyFocus: ['明确目标', '拆出第一批任务'],
    summary: '这个项目还在整理中。',
    status: 'active',
    stage: 'exploring',
    priority: 'medium',
  },
  taskDefaults: {
    owner: '',
    status: 'todo',
    priority: 'medium',
    dueDateOffsetDays: 0,
  },
  workspace: {
    defaultTaskFilter: 'active',
    contextLimit: 6,
    decisionLimit: 3,
  },
};

const makeId = (prefix: string) => {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  if (cryptoId) return `${prefix}-${cryptoId}`;

  const fallbackId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${fallbackId}`;
};
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
  deleteProject: (id: string) => void;
  reorderProjects: (activeId: string, overId: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  updateOutlineStageGoal: (projectId: string, stage: Project['stage'], goal: string) => void;
  createOutlineItem: (projectId: string, stage: Project['stage']) => string;
  updateOutlineItem: (id: string, updates: Partial<ProjectOutlineItem>) => void;
  deleteOutlineItem: (id: string) => void;
  updateSettings: (updates: SystemSettingsUpdate) => void;
  createTask: (projectId: string) => string;
  updateTask: (id: string, updates: Partial<TaskCard>) => void;
  deleteTask: (id: string) => void;
  cycleTaskStatus: (id: string) => void;
  createContext: (projectId: string) => string;
  updateContext: (id: string, updates: Partial<ContextCard>) => void;
  deleteContext: (id: string) => void;
  createAIRecord: (projectId: string, output?: string) => void;
  updateAIRecord: (id: string, updates: Partial<AIRecordCard>) => void;
  deleteAIRecord: (id: string) => void;
  createTaskFromAIRecord: (recordId: string) => void;
  createDecision: (projectId: string) => string;
  updateDecision: (id: string, updates: Partial<DecisionCard>) => void;
  deleteDecision: (id: string) => void;
  createFinance: () => string;
  updateFinance: (id: string, updates: Partial<FinanceCard>) => void;
  deleteFinance: (id: string) => void;
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
  settings: normalizeSettings(state.settings),
  projects: state.projects,
  outlineStageGoals: state.outlineStageGoals,
  outlineItems: state.outlineItems,
  tasks: state.tasks,
  contexts: state.contexts,
  aiRecords: state.aiRecords,
  decisions: state.decisions,
  finances: state.finances,
  selectedProjectId: state.selectedProjectId,
});

const normalizeSettings = (settings?: SystemSettingsUpdate): SystemSettings => {
  const assignees = settings?.assignees?.map((assignee) => assignee.trim()).filter(Boolean) || [];
  const template = settings?.projectTemplate;
  const taskDefaults = settings?.taskDefaults;
  const workspace = settings?.workspace;

  return {
    assignees: assignees.length > 0 ? Array.from(new Set(assignees)) : defaultSettings.assignees,
    projectTemplate: {
      ...defaultSettings.projectTemplate,
      ...template,
      name: template?.name?.trim() || defaultSettings.projectTemplate.name,
      oneLiner: template?.oneLiner?.trim() || defaultSettings.projectTemplate.oneLiner,
      owner: template?.owner?.trim() || defaultSettings.projectTemplate.owner,
      members: cleanList(template?.members || defaultSettings.projectTemplate.members),
      weeklyFocus: cleanList(template?.weeklyFocus || defaultSettings.projectTemplate.weeklyFocus).slice(0, 3),
      summary: template?.summary || defaultSettings.projectTemplate.summary,
    },
    taskDefaults: {
      ...defaultSettings.taskDefaults,
      ...taskDefaults,
      dueDateOffsetDays: clampNumber(taskDefaults?.dueDateOffsetDays, 0, 365, defaultSettings.taskDefaults.dueDateOffsetDays),
    },
    workspace: {
      ...defaultSettings.workspace,
      ...workspace,
      contextLimit: clampNumber(workspace?.contextLimit, 1, 24, defaultSettings.workspace.contextLimit),
      decisionLimit: clampNumber(workspace?.decisionLimit, 1, 12, defaultSettings.workspace.decisionLimit),
    },
  };
};

const cleanList = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const clampNumber = (value: number | undefined, min: number, max: number, fallback: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
};

const dateFromOffset = (offsetDays: number) => {
  if (offsetDays <= 0) return '';
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const normalizeContextType = (type: string | undefined): ContextCard['type'] => {
  if (type === 'idea') return 'note';
  if (type === 'technical') return 'doc';
  if (['note', 'doc', 'meeting', 'feedback', 'research', 'link', 'file'].includes(type || '')) return type as ContextCard['type'];
  return 'note';
};

const normalizeContexts = (contexts: ContextCard[] | undefined): ContextCard[] =>
  (contexts || []).map((context) => ({
    ...context,
    type: normalizeContextType(context.type),
  }));

const normalizeFinances = (finances: FinanceCard[] | undefined): FinanceCard[] =>
  (finances || []).map((finance) => {
    if (finance.receipts) return finance;
    const legacyUrl = (finance as { url?: string }).url;
    const legacyType = (finance as { receiptType?: string }).receiptType;
    const receipts: FinanceReceipt[] = [];
    if (legacyUrl && legacyType && legacyType !== 'none') {
      receipts.push({ url: legacyUrl, type: legacyType as 'link' | 'file' });
    }
    const { ...rest } = finance;
    return { ...rest, receipts };
  });

const migrateOutlineStageGoals = (items: Partial<ProjectOutlineItem>[]): ProjectOutlineStageGoal[] => {
  const timestamp = now();
  const goals = new Map<string, ProjectOutlineStageGoal>();

  items.forEach((item) => {
    const legacyGoal = (item as { goal?: string }).goal?.trim();
    if (!item.projectId || !item.stage || !legacyGoal) return;
    const key = `${item.projectId}:${item.stage}`;
    if (goals.has(key)) return;
    goals.set(key, {
      id: `outline-goal-${item.projectId}-${item.stage}`,
      projectId: item.projectId,
      stage: item.stage,
      goal: legacyGoal,
      createdAt: item.createdAt || timestamp,
      updatedAt: item.updatedAt || timestamp,
    });
  });

  return Array.from(goals.values());
};

const normalizeSnapshot = (snapshot: Partial<CockpitStateSnapshot>): CockpitStateSnapshot => ({
  settings: normalizeSettings(snapshot.settings),
  projects: snapshot.projects || [],
  outlineStageGoals: snapshot.outlineStageGoals || migrateOutlineStageGoals(snapshot.outlineItems || []),
  outlineItems: snapshot.outlineItems || [],
  tasks: snapshot.tasks || [],
  contexts: normalizeContexts(snapshot.contexts),
  aiRecords: snapshot.aiRecords || [],
  decisions: snapshot.decisions || [],
  finances: normalizeFinances(snapshot.finances),
  selectedProjectId: snapshot.selectedProjectId || null,
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
    set({ ...normalizeSnapshot(snapshot), stateVersion: snapshot.stateVersion || null, hydrated: true });
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
    const template = normalizeSettings(get().settings).projectTemplate;
    const project: Project = {
      id,
      name: template.name,
      oneLiner: template.oneLiner,
      description: '',
      status: template.status,
      stage: template.stage,
      owner: template.owner,
      members: template.members,
      priority: template.priority,
      weeklyFocus: template.weeklyFocus,
      summary: template.summary,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ projects: [project, ...state.projects], selectedProjectId: id }));
  },

  deleteProject: (id) =>
    set((state) => {
      const projectIndex = state.projects.findIndex((project) => project.id === id);
      const projects = state.projects.filter((project) => project.id !== id);
      const fallbackProject = projects[projectIndex] || projects[projectIndex - 1] || projects[0];

      return {
        projects,
        outlineStageGoals: state.outlineStageGoals.filter((item) => item.projectId !== id),
        outlineItems: state.outlineItems.filter((item) => item.projectId !== id),
        tasks: state.tasks.filter((task) => task.projectId !== id),
        contexts: state.contexts.filter((context) => context.projectId !== id),
        aiRecords: state.aiRecords.filter((record) => record.projectId !== id),
        decisions: state.decisions.filter((decision) => decision.projectId !== id),
        selectedProjectId: state.selectedProjectId === id ? fallbackProject?.id || null : state.selectedProjectId,
      };
    }),

  reorderProjects: (activeId, overId) =>
    set((state) => {
      const fromIndex = state.projects.findIndex((project) => project.id === activeId);
      const toIndex = state.projects.findIndex((project) => project.id === overId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return {};

      const projects = [...state.projects];
      const [movedProject] = projects.splice(fromIndex, 1);
      projects.splice(toIndex, 0, movedProject);
      return { projects };
    }),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...updates, updatedAt: now() } : project,
      ),
    })),

  updateOutlineStageGoal: (projectId, stage, goal) =>
    set((state) => {
      const timestamp = now();
      const existing = state.outlineStageGoals.find((item) => item.projectId === projectId && item.stage === stage);
      if (existing) {
        return {
          outlineStageGoals: state.outlineStageGoals.map((item) =>
            item.id === existing.id ? { ...item, goal, updatedAt: timestamp } : item,
          ),
        };
      }

      const item: ProjectOutlineStageGoal = {
        id: makeId('outline-goal'),
        projectId,
        stage,
        goal,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return { outlineStageGoals: [...state.outlineStageGoals, item] };
    }),

  updateSettings: (updates) =>
    set((state) => ({
      settings: normalizeSettings({ ...state.settings, ...updates }),
    })),

  createOutlineItem: (projectId, stage) => {
    const timestamp = now();
    const id = makeId('outline');
    const order = get().outlineItems.filter((item) => item.projectId === projectId && item.stage === stage).length;
    const item: ProjectOutlineItem = {
      id,
      projectId,
      stage,
      task: '',
      status: 'not_started',
      note: '',
      order,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ outlineItems: [...state.outlineItems, item] }));
    return id;
  },

  updateOutlineItem: (id, updates) =>
    set((state) => ({
      outlineItems: state.outlineItems.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: now() } : item)),
    })),

  deleteOutlineItem: (id) =>
    set((state) => ({
      outlineItems: state.outlineItems.filter((item) => item.id !== id),
    })),

  createTask: (projectId) => {
    const timestamp = now();
    const id = makeId('task');
    const defaults = normalizeSettings(get().settings).taskDefaults;
    const task: TaskCard = {
      id,
      projectId,
      title: '新任务',
      description: '',
      status: defaults.status,
      owner: defaults.owner,
      priority: defaults.priority,
      dueDate: dateFromOffset(defaults.dueDateOffsetDays),
      subtasks: [],
      notes: '',
      source: 'manual',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ tasks: [task, ...state.tasks] }));
    return id;
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
    const id = makeId('context');
    const context: ContextCard = {
      id,
      projectId,
      title: '新上下文',
      type: 'note',
      content: '',
      url: '',
      source: '',
      importance: 'medium',
      pinned: false,
      archived: false,
      workspaceVisible: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ contexts: [context, ...state.contexts] }));
    return id;
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
    const timestamp = now();
    const id = makeId('decision');
    const decision: DecisionCard = {
      id,
      projectId,
      title: '新决策',
      decision: '',
      rationale: '',
      alternatives: '',
      impact: '',
      decidedBy: ['Combo'],
      pinned: false,
      archived: false,
      workspaceVisible: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ decisions: [decision, ...state.decisions] }));
    return id;
  },

  updateDecision: (id, updates) =>
    set((state) => ({
      decisions: state.decisions.map((decision) =>
        decision.id === id ? { ...decision, ...updates, updatedAt: now() } : decision,
      ),
    })),

  deleteDecision: (id) =>
    set((state) => ({
      decisions: state.decisions.filter((decision) => decision.id !== id),
    })),

  createFinance: () => {
    const timestamp = now();
    const id = makeId('finance');
    const finance: FinanceCard = {
      id,
      projectId: null,
      title: '新开支记录',
      amount: 0,
      category: 'other',
      status: 'pending',
      date: timestamp.slice(0, 10),
      description: '',
      receipts: [],
      payer: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({ finances: [finance, ...state.finances] }));
    return id;
  },

  updateFinance: (id, updates) =>
    set((state) => ({
      finances: state.finances.map((finance) =>
        finance.id === id ? { ...finance, ...updates, updatedAt: now() } : finance,
      ),
    })),

  deleteFinance: (id) =>
    set((state) => ({
      finances: state.finances.filter((finance) => finance.id !== id),
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
          type: normalizeContextType(change.payload.type),
          importance: change.payload.importance || 'medium',
          source: change.payload.source || 'AI 建议',
          url: '',
          pinned: false,
          archived: false,
          workspaceVisible: true,
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
          pinned: false,
          archived: false,
          workspaceVisible: true,
          createdAt: timestamp,
          updatedAt: timestamp,
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
