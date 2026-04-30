import { randomUUID } from 'node:crypto';
import { mutateState, readState } from './db.js';
import type {
  AIRecordCard,
  AIRecordValue,
  ContextCard,
  ContextType,
  DecisionCard,
  Priority,
  Project,
  TaskCard,
  TaskStatus,
} from './types.js';

export function jsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function normalizeContextType(type: string | undefined): ContextType {
  if (type === 'idea') return 'note';
  if (type === 'technical') return 'doc';
  if (['note', 'doc', 'meeting', 'feedback', 'research', 'link', 'file'].includes(type || '')) return type as ContextType;
  return 'note';
}

function normalizeContext(context: ContextCard): ContextCard {
  return {
    ...context,
    type: normalizeContextType(context.type),
  };
}

export function resolveProject(projectIdOrName?: string): Project {
  const state = readState();
  const project =
    state.projects.find((item) => item.id === projectIdOrName) ||
    state.projects.find((item) => item.name === projectIdOrName) ||
    state.projects.find((item) => item.id === state.selectedProjectId) ||
    state.projects[0];

  if (!project) {
    throw new Error('No project found in AI Project Cockpit.');
  }

  return project;
}

export function listProjects() {
  const state = readState();
  return state.projects.map((project) => ({
    ...project,
    taskCount: state.tasks.filter((task) => task.projectId === project.id).length,
    contextCount: state.contexts.filter((context) => context.projectId === project.id).length,
    decisionCount: state.decisions.filter((decision) => decision.projectId === project.id).length,
  }));
}

export function getProject(projectIdOrName?: string) {
  const state = readState();
  const project = resolveProject(projectIdOrName);
  return {
    project,
    tasks: state.tasks.filter((task) => task.projectId === project.id),
    contexts: state.contexts.filter((context) => context.projectId === project.id).map(normalizeContext),
    aiRecords: state.aiRecords.filter((record) => record.projectId === project.id),
    decisions: state.decisions.filter((decision) => decision.projectId === project.id),
  };
}

export function searchMemory(query: string, projectIdOrName?: string) {
  const state = readState();
  const q = query.trim().toLowerCase();
  const project = projectIdOrName ? resolveProject(projectIdOrName) : null;
  const inProject = (projectId: string) => !project || project.id === projectId;
  const has = (...values: string[]) => values.some((value) => value.toLowerCase().includes(q));

  return {
    projects: state.projects.filter((item) => (!project || item.id === project.id) && has(item.name, item.oneLiner, item.description, item.summary)),
    tasks: state.tasks.filter((item) => inProject(item.projectId) && has(item.title, item.description, item.notes, item.owner)),
    contexts: state.contexts.filter((item) => inProject(item.projectId) && has(item.title, item.content, item.source, item.url)).map(normalizeContext),
    aiRecords: state.aiRecords.filter((item) => inProject(item.projectId) && has(item.title, item.inputSummary, item.outputSummary, item.rawOutput, item.tool)),
    decisions: state.decisions.filter((item) => inProject(item.projectId) && has(item.title, item.decision, item.rationale, item.alternatives, item.impact)),
  };
}

export function createTask(input: {
  projectIdOrName?: string;
  title: string;
  description?: string;
  owner?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string;
  notes?: string;
}) {
  const project = resolveProject(input.projectIdOrName);
  return mutateState((state, timestamp) => {
    const task: TaskCard = {
      id: id('task'),
      projectId: project.id,
      title: input.title,
      description: input.description || '',
      owner: input.owner || '',
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      dueDate: input.dueDate || '',
      notes: input.notes || '',
      subtasks: [],
      source: 'manual',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.tasks.unshift(task);
    touchProject(state.projects, project.id, timestamp);
    return task;
  });
}

export function updateTaskStatus(input: { taskId: string; status: TaskStatus; notes?: string }) {
  return mutateState((state, timestamp) => {
    const task = state.tasks.find((item) => item.id === input.taskId);
    if (!task) throw new Error(`Task not found: ${input.taskId}`);
    task.status = input.status;
    if (input.notes !== undefined) task.notes = input.notes;
    task.updatedAt = timestamp;
    touchProject(state.projects, task.projectId, timestamp);
    return task;
  });
}

export function createContext(input: {
  projectIdOrName?: string;
  title: string;
  content: string;
  type?: ContextType | 'idea' | 'technical';
  importance?: Priority;
  source?: string;
  url?: string;
}) {
  const project = resolveProject(input.projectIdOrName);
  return mutateState((state, timestamp) => {
    const context: ContextCard = {
      id: id('context'),
      projectId: project.id,
      title: input.title,
      content: input.content,
      type: normalizeContextType(input.type),
      importance: input.importance || 'medium',
      source: input.source || 'MCP',
      url: input.url || '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.contexts.unshift(context);
    touchProject(state.projects, project.id, timestamp);
    return context;
  });
}

export function createAIRecord(input: {
  projectIdOrName?: string;
  title: string;
  tool?: string;
  inputSummary?: string;
  outputSummary: string;
  rawOutput?: string;
  value?: AIRecordValue;
  status?: AIRecordCard['status'];
}) {
  const project = resolveProject(input.projectIdOrName);
  return mutateState((state, timestamp) => {
    const record: AIRecordCard = {
      id: id('ai'),
      projectId: project.id,
      title: input.title,
      tool: input.tool || 'External Agent',
      inputSummary: input.inputSummary || '',
      outputSummary: input.outputSummary,
      rawOutput: input.rawOutput || '',
      value: input.value || 'insight',
      status: input.status || 'saved',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.aiRecords.unshift(record);
    touchProject(state.projects, project.id, timestamp);
    return record;
  });
}

export function createDecision(input: {
  projectIdOrName?: string;
  title: string;
  decision: string;
  rationale?: string;
  alternatives?: string;
  impact?: string;
  decidedBy?: string[];
}) {
  const project = resolveProject(input.projectIdOrName);
  return mutateState((state, timestamp) => {
    const decision: DecisionCard = {
      id: id('decision'),
      projectId: project.id,
      title: input.title,
      decision: input.decision,
      rationale: input.rationale || '',
      alternatives: input.alternatives || '',
      impact: input.impact || '',
      decidedBy: input.decidedBy || ['External Agent'],
      createdAt: timestamp,
    };
    state.decisions.unshift(decision);
    touchProject(state.projects, project.id, timestamp);
    return decision;
  });
}

export function updateProjectSummary(input: { projectIdOrName?: string; summary: string }) {
  const project = resolveProject(input.projectIdOrName);
  return mutateState((state, timestamp) => {
    const target = state.projects.find((item) => item.id === project.id);
    if (!target) throw new Error(`Project not found: ${project.id}`);
    target.summary = input.summary;
    target.updatedAt = timestamp;
    return target;
  });
}

export function updateWeeklyFocus(input: { projectIdOrName?: string; weeklyFocus: string[] }) {
  const project = resolveProject(input.projectIdOrName);
  return mutateState((state, timestamp) => {
    const target = state.projects.find((item) => item.id === project.id);
    if (!target) throw new Error(`Project not found: ${project.id}`);
    target.weeklyFocus = input.weeklyFocus.slice(0, 3);
    target.updatedAt = timestamp;
    return target;
  });
}

function touchProject(projects: Project[], projectId: string, timestamp = now()) {
  const project = projects.find((item) => item.id === projectId);
  if (project) project.updatedAt = timestamp;
}
