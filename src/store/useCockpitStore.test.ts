import { beforeEach, describe, expect, it } from 'vitest';
import { useCockpitStore } from '@/store/useCockpitStore';
import type { AIRecordCard, ContextCard, DecisionCard, Project, SystemSettings, TaskCard } from '@/types/cockpit';

const timestamp = '2026-04-29T00:00:00.000Z';

const makeSettings = (updates: Partial<SystemSettings> = {}): SystemSettings => ({
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
  ...updates,
});

const makeProject = (id: string, name = id): Project => ({
  id,
  name,
  oneLiner: '',
  description: '',
  status: 'active',
  stage: 'planning',
  owner: 'Combo',
  members: ['Combo'],
  priority: 'medium',
  weeklyFocus: [],
  summary: '',
  createdAt: timestamp,
  updatedAt: timestamp,
});

const makeTask = (id: string, projectId: string): TaskCard => ({
  id,
  projectId,
  title: id,
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
});

const makeContext = (id: string, projectId: string): ContextCard => ({
  id,
  projectId,
  title: id,
  type: 'note',
  content: '',
  url: '',
  importance: 'medium',
  source: '',
  createdAt: timestamp,
  updatedAt: timestamp,
});

const makeAIRecord = (id: string, projectId: string): AIRecordCard => ({
  id,
  projectId,
  title: id,
  tool: 'Codex',
  inputSummary: '',
  outputSummary: '',
  rawOutput: '',
  value: 'insight',
  status: 'saved',
  createdAt: timestamp,
  updatedAt: timestamp,
});

const makeDecision = (id: string, projectId: string): DecisionCard => ({
  id,
  projectId,
  title: id,
  decision: '',
  rationale: '',
  alternatives: '',
  impact: '',
  decidedBy: ['Combo'],
  createdAt: timestamp,
});

beforeEach(() => {
  useCockpitStore.setState({
    settings: makeSettings(),
    projects: [makeProject('p1'), makeProject('p2'), makeProject('p3')],
    tasks: [makeTask('t1', 'p1'), makeTask('t2', 'p2')],
    contexts: [makeContext('c1', 'p1'), makeContext('c2', 'p2')],
    aiRecords: [makeAIRecord('a1', 'p1'), makeAIRecord('a2', 'p2')],
    decisions: [makeDecision('d1', 'p1'), makeDecision('d2', 'p2')],
    selectedProjectId: 'p2',
    hydrated: true,
    stateVersion: null,
    searchQuery: '',
    aiOutput: '',
    aiChanges: [],
    selectedAIChangeIds: [],
    aiLoading: false,
  });
});

describe('useCockpitStore - 项目删除', () => {
  it('deleteProject 级联删除项目相关数据', () => {
    useCockpitStore.getState().deleteProject('p2');
    const state = useCockpitStore.getState();

    expect(state.projects.map((project) => project.id)).toEqual(['p1', 'p3']);
    expect(state.tasks.map((task) => task.id)).toEqual(['t1']);
    expect(state.contexts.map((context) => context.id)).toEqual(['c1']);
    expect(state.aiRecords.map((record) => record.id)).toEqual(['a1']);
    expect(state.decisions.map((decision) => decision.id)).toEqual(['d1']);
  });

  it('deleteProject 删除当前项目后选择相邻项目', () => {
    useCockpitStore.getState().deleteProject('p2');
    expect(useCockpitStore.getState().selectedProjectId).toBe('p3');
  });

  it('deleteProject 删除最后一个项目后 selectedProjectId 置空', () => {
    useCockpitStore.setState({
      projects: [makeProject('only')],
      tasks: [makeTask('t1', 'only')],
      contexts: [],
      aiRecords: [],
      decisions: [],
      selectedProjectId: 'only',
    });

    useCockpitStore.getState().deleteProject('only');
    const state = useCockpitStore.getState();

    expect(state.projects).toHaveLength(0);
    expect(state.tasks).toHaveLength(0);
    expect(state.selectedProjectId).toBeNull();
  });
});

describe('useCockpitStore - 项目排序', () => {
  it('reorderProjects 调整项目顺序', () => {
    useCockpitStore.getState().reorderProjects('p3', 'p1');

    expect(useCockpitStore.getState().projects.map((project) => project.id)).toEqual(['p3', 'p1', 'p2']);
  });

  it('reorderProjects 不改变当前选中项目', () => {
    useCockpitStore.getState().reorderProjects('p3', 'p1');

    expect(useCockpitStore.getState().selectedProjectId).toBe('p2');
  });

  it('reorderProjects 忽略无效项目', () => {
    useCockpitStore.getState().reorderProjects('missing', 'p1');

    expect(useCockpitStore.getState().projects.map((project) => project.id)).toEqual(['p1', 'p2', 'p3']);
  });
});

describe('useCockpitStore - 系统设置', () => {
  it('updateSettings 保存负责人候选项并去重', () => {
    useCockpitStore.getState().updateSettings({ assignees: [' Combo ', 'Codex', 'Combo', ''] });

    expect(useCockpitStore.getState().settings.assignees).toEqual(['Combo', 'Codex']);
  });

  it('updateSettings 清空负责人时保留默认候选项', () => {
    useCockpitStore.getState().updateSettings({ assignees: [] });

    expect(useCockpitStore.getState().settings.assignees).toEqual(['Combo', 'Codex', 'Claude']);
  });

  it('updateSettings 缺省工作台数量时保留默认展示数量', () => {
    useCockpitStore.getState().updateSettings({ workspace: { defaultTaskFilter: 'all' } });

    expect(useCockpitStore.getState().settings.workspace).toEqual({
      defaultTaskFilter: 'all',
      contextLimit: 6,
      decisionLimit: 3,
    });
  });

  it('createProject 使用默认项目模板', () => {
    useCockpitStore.getState().updateSettings({
      projectTemplate: {
        ...useCockpitStore.getState().settings.projectTemplate,
        name: '默认项目',
        oneLiner: '默认一句话',
        owner: 'Codex',
        weeklyFocus: ['默认重点'],
      },
    });

    useCockpitStore.getState().createProject();
    const project = useCockpitStore.getState().projects[0];

    expect(project.name).toBe('默认项目');
    expect(project.oneLiner).toBe('默认一句话');
    expect(project.owner).toBe('Codex');
    expect(project.weeklyFocus).toEqual(['默认重点']);
  });

  it('createTask 使用任务默认值', () => {
    useCockpitStore.getState().updateSettings({
      taskDefaults: {
        owner: 'Combo',
        status: 'doing',
        priority: 'high',
        dueDateOffsetDays: 0,
      },
    });

    const id = useCockpitStore.getState().createTask('p2');
    const task = useCockpitStore.getState().tasks.find((item) => item.id === id);

    expect(task?.owner).toBe('Combo');
    expect(task?.status).toBe('doing');
    expect(task?.priority).toBe('high');
  });
});
