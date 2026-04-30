import { NextResponse } from 'next/server';
import { readCockpitStateWithVersion, writeCockpitState } from '@/lib/db';
import type { CockpitStateSnapshot, ContextCard, ContextType, SystemSettings } from '@/types/cockpit';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  const { snapshot, version } = readCockpitStateWithVersion();
  return NextResponse.json({ ...normalizeSnapshot(snapshot), stateVersion: version });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CockpitStateSnapshot & { stateVersion?: string };
  const { snapshot: current, version: currentVersion } = readCockpitStateWithVersion();
  const incoming = stripMeta(body);
  const shouldMerge = body.stateVersion && body.stateVersion !== currentVersion;
  const next = shouldMerge ? mergeSnapshots(current, incoming) : incoming;
  const version = writeCockpitState(next);
  return NextResponse.json({ ok: true, merged: !!shouldMerge, stateVersion: version, snapshot: next });
}

function stripMeta(snapshot: CockpitStateSnapshot & { stateVersion?: string }): CockpitStateSnapshot {
  return {
    settings: normalizeSettings(snapshot.settings),
    projects: snapshot.projects,
    tasks: snapshot.tasks,
    contexts: normalizeContexts(snapshot.contexts),
    aiRecords: snapshot.aiRecords,
    decisions: snapshot.decisions,
    selectedProjectId: snapshot.selectedProjectId,
  };
}

function mergeSnapshots(current: CockpitStateSnapshot, incoming: CockpitStateSnapshot): CockpitStateSnapshot {
  return {
    settings: normalizeSettings(incoming.settings || current.settings),
    projects: mergeById(current.projects, incoming.projects),
    tasks: mergeById(current.tasks, incoming.tasks),
    contexts: normalizeContexts(mergeById(current.contexts, incoming.contexts)),
    aiRecords: mergeById(current.aiRecords, incoming.aiRecords),
    decisions: mergeById(current.decisions, incoming.decisions),
    selectedProjectId: incoming.selectedProjectId || current.selectedProjectId,
  };
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const incomingIds = new Set(incoming.map((item) => item.id));
  return [...incoming, ...current.filter((item) => !incomingIds.has(item.id))];
}

function normalizeSnapshot(snapshot: Partial<CockpitStateSnapshot>): CockpitStateSnapshot {
  return {
    settings: normalizeSettings(snapshot.settings),
    projects: snapshot.projects || [],
    tasks: snapshot.tasks || [],
    contexts: normalizeContexts(snapshot.contexts),
    aiRecords: snapshot.aiRecords || [],
    decisions: snapshot.decisions || [],
    selectedProjectId: snapshot.selectedProjectId || null,
  };
}

function normalizeSettings(settings?: Partial<SystemSettings>): SystemSettings {
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
}

function cleanList(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeContextType(type: string | undefined): ContextType {
  if (type === 'idea') return 'note';
  if (type === 'technical') return 'doc';
  if (['note', 'doc', 'meeting', 'feedback', 'research', 'link', 'file'].includes(type || '')) return type as ContextType;
  return 'note';
}

function normalizeContexts(contexts: ContextCard[] | undefined): ContextCard[] {
  return (contexts || []).map((context) => ({
    ...context,
    type: normalizeContextType(context.type),
  }));
}
