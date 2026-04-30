'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Bot,
  Calendar,
  Cable,
  Check,
  Clipboard,
  CopyPlus,
  Archive,
  Flame,
  FileText,
  GripVertical,
  KeyRound,
  Lightbulb,
  ListTodo,
  Maximize2,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useCockpitStore } from '@/store/useCockpitStore';
import type { AIChange, AIRecordCard, ContextCard, ContextType, DecisionCard, Priority, Project, SystemSettings, SystemSettingsUpdate, TaskCard } from '@/types/cockpit';

const statusLabel = {
  active: '推进中',
  paused: '暂停',
  shipped: '已上线',
  archived: '归档',
  todo: '待办',
  doing: '进行中',
  blocked: '阻塞',
  done: '完成',
  canceled: '取消',
};

const stageLabel = {
  exploring: '探索',
  planning: '规划',
  building: '构建',
  testing: '测试',
  launched: '上线',
};

const priorityStyle: Record<Priority, string> = {
  high: 'border-pink-200 bg-pink-50 text-pink-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-teal-200 bg-teal-50 text-teal-700',
};

const defaultMcpEndpoint = 'http://118.145.115.197:22643/mcp';
const mcpTokenEnvName = 'AI_PROJECT_COCKPIT_MCP_TOKEN';

type McpGuidePayload = {
  configured: boolean;
  endpoint: string;
  authHeader?: string;
  codexConfig?: string;
  claudeConfig?: string;
  agentPrompt?: string;
  smokeCommand?: string;
  message?: string;
};

type TaskFilter = 'active' | 'all' | 'done';
type LibraryStatusFilter = 'active' | 'workspace' | 'archived';
type KnowledgePanel = 'contexts' | 'decisions';
type ActiveCard = { type: 'task' | 'context' | 'decision'; id: string };

type UploadResponse = {
  url: string;
  originalName: string;
  title: string;
  mimeType: string;
  size: number;
};

export default function Home() {
  const store = useCockpitStore();
  const [activeAIPanel, setActiveAIPanel] = useState<'assistant' | 'records' | null>(null);
  const [activeKnowledgePanel, setActiveKnowledgePanel] = useState<KnowledgePanel | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMcpGuideOpen, setIsMcpGuideOpen] = useState(false);
  const [mcpEndpoint, setMcpEndpoint] = useState(defaultMcpEndpoint);
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter | null>(null);
  const [contextLibraryQuery, setContextLibraryQuery] = useState('');
  const [contextTypeFilter, setContextTypeFilter] = useState<'all' | ContextType>('all');
  const [contextImportanceFilter, setContextImportanceFilter] = useState<'all' | Priority>('all');
  const [contextStatusFilter, setContextStatusFilter] = useState<LibraryStatusFilter>('active');
  const [decisionLibraryQuery, setDecisionLibraryQuery] = useState('');
  const [decisionStatusFilter, setDecisionStatusFilter] = useState<LibraryStatusFilter>('active');
  const [uploadingContext, setUploadingContext] = useState(false);
  const contextUploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    store.load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.location.hostname) return;
    setMcpEndpoint(`${window.location.protocol}//${window.location.hostname}:22643/mcp`);
  }, []);

  useEffect(() => {
    if (!store.hydrated) return;
    const timer = window.setTimeout(() => {
      store.save().catch(() => undefined);
    }, 350);
    return () => window.clearTimeout(timer);
    // Zustand actions are stable here; this effect intentionally tracks data snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.settings, store.projects, store.tasks, store.contexts, store.aiRecords, store.decisions, store.selectedProjectId, store.hydrated]);

  const selectedProject = useMemo(
    () => store.projects.find((project) => project.id === store.selectedProjectId) || store.projects[0],
    [store.projects, store.selectedProjectId],
  );

  const filteredProjects = useMemo(() => {
    const q = store.searchQuery.trim().toLowerCase();
    if (!q) return store.projects;
    return store.projects.filter((project) => {
      const relatedTasks = store.tasks.filter((task) => task.projectId === project.id);
      const relatedContexts = store.contexts.filter((context) => context.projectId === project.id);
      const relatedAI = store.aiRecords.filter((record) => record.projectId === project.id);
      const relatedDecisions = store.decisions.filter((decision) => decision.projectId === project.id);
      return [
        project.name,
        project.oneLiner,
        project.description,
        ...relatedTasks.flatMap((task) => [task.title, task.description]),
        ...relatedContexts.flatMap((context) => [context.title, context.content]),
        ...relatedAI.flatMap((record) => [record.title, record.outputSummary]),
        ...relatedDecisions.flatMap((decision) => [decision.title, decision.decision, decision.rationale]),
      ].some((field) => field.toLowerCase().includes(q));
    });
  }, [store.projects, store.tasks, store.contexts, store.aiRecords, store.decisions, store.searchQuery]);

  if (!selectedProject) {
    return (
    <main className="min-h-screen bg-[#fffaf1] p-10">
        <button onClick={store.createProject} className="rounded-md bg-[#ff6b4a] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-orange-200">
          创建第一个项目
        </button>
      </main>
    );
  }

  const q = store.searchQuery.trim().toLowerCase();
  const matches = (values: string[]) => !q || values.some((value) => value.toLowerCase().includes(q));
  const projectTasks = store.tasks
    .filter((task) => task.projectId === selectedProject.id)
    .filter((task) => matches([task.title, task.description, task.notes, task.owner]));
  const projectContexts = store.contexts
    .filter((context) => context.projectId === selectedProject.id)
    .filter((context) => matches([context.title, context.content, context.source, context.url]));
  const projectAIRecords = store.aiRecords
    .filter((record) => record.projectId === selectedProject.id)
    .filter((record) => matches([record.title, record.inputSummary, record.outputSummary, record.rawOutput]));
  const projectDecisions = store.decisions
    .filter((decision) => decision.projectId === selectedProject.id)
    .filter((decision) => matches([decision.title, decision.decision, decision.rationale, decision.impact]));
  const openTasks = projectTasks.filter((task) => !['done', 'canceled'].includes(task.status));
  const doneTasks = projectTasks.filter((task) => ['done', 'canceled'].includes(task.status));
  const activeTaskFilter = taskFilter || store.settings.workspace.defaultTaskFilter;
  const visibleTasks = activeTaskFilter === 'active' ? openTasks : activeTaskFilter === 'done' ? doneTasks : projectTasks;
  const workspaceContexts = orderContextsForWorkspace(projectContexts.filter(isVisibleInWorkspace)).slice(0, store.settings.workspace.contextLimit);
  const workspaceDecisions = orderDecisionsForWorkspace(projectDecisions.filter(isVisibleInWorkspace)).slice(0, store.settings.workspace.decisionLimit);
  const libraryContexts = orderContextsForWorkspace(
    projectContexts.filter((context) => {
      const query = contextLibraryQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        [context.title, context.content, context.source, context.url, context.type].some((field) => field.toLowerCase().includes(query));
      const matchesType = contextTypeFilter === 'all' || context.type === contextTypeFilter;
      const matchesImportance = contextImportanceFilter === 'all' || context.importance === contextImportanceFilter;
      return matchesQuery && matchesType && matchesImportance && matchesLibraryStatus(context, contextStatusFilter);
    }),
  );
  const libraryDecisions = orderDecisionsForWorkspace(
    projectDecisions.filter((decision) => {
      const query = decisionLibraryQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        [decision.title, decision.decision, decision.rationale, decision.alternatives, decision.impact, decision.decidedBy.join(' ')].some((field) =>
          field.toLowerCase().includes(query),
        );
      return matchesQuery && matchesLibraryStatus(decision, decisionStatusFilter);
    }),
  );
  const createAndOpenTask = () => {
    const id = store.createTask(selectedProject.id);
    setActiveCard({ type: 'task', id });
  };
  const createAndOpenContext = () => {
    const id = store.createContext(selectedProject.id);
    setActiveCard({ type: 'context', id });
  };
  const uploadContextFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingContext(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        window.alert(`上传失败：${error.error || '未知错误'}`);
        return;
      }

      const uploaded = (await res.json()) as UploadResponse;
      const id = store.createContext(selectedProject.id);
      store.updateContext(id, {
        title: uploaded.title || file.name,
        type: inferContextTypeFromFile(file.name),
        content: '文件已上传。后续可以基于这份资料补充摘要、结论或 AI 可用上下文。',
        url: uploaded.url,
        source: uploaded.originalName || file.name,
      });
      setActiveCard({ type: 'context', id });
    } catch {
      window.alert('上传失败，请重试');
    } finally {
      setUploadingContext(false);
      event.target.value = '';
    }
  };
  const createAndOpenDecision = () => {
    const id = store.createDecision(selectedProject.id);
    setActiveCard({ type: 'decision', id });
  };
  const deleteSelectedProject = () => {
    const confirmed = window.confirm(`确定删除项目「${selectedProject.name}」吗？这个项目下的任务、上下文、AI Record 和决策都会一起删除。`);
    if (!confirmed) return;

    setActiveCard(null);
    setActiveAIPanel(null);
    setActiveKnowledgePanel(null);
    store.deleteProject(selectedProject.id);
  };
  const selectedCard =
    activeCard?.type === 'task'
      ? store.tasks.find((task) => task.id === activeCard.id)
      : activeCard?.type === 'context'
        ? store.contexts.find((context) => context.id === activeCard.id)
        : activeCard?.type === 'decision'
          ? store.decisions.find((decision) => decision.id === activeCard.id)
          : undefined;

  return (
    <main className="min-h-screen bg-[#fff9ed] text-slate-950">
      <div className="grid min-h-screen grid-cols-[300px_1fr]">
        <aside className="border-r border-orange-100 bg-[#fffdf8]">
          <div className="sticky top-0 h-screen overflow-y-auto p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ff6b4a] text-white shadow-sm shadow-orange-200">
                <Target size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold">AI Project Cockpit</div>
                <div className="text-xs text-slate-500">产品研发自用驾驶舱</div>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                value={store.searchQuery}
                onChange={(event) => store.setSearchQuery(event.target.value)}
                placeholder="搜索项目..."
                className="h-9 w-full rounded-md border border-orange-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-300"
              />
            </div>

            <button
              onClick={store.createProject}
              className="mb-5 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#ff6b4a] text-sm font-medium text-white shadow-sm shadow-orange-200 hover:bg-[#f45f3d]"
            >
              <Plus size={16} />
              新建项目
            </button>

            <ProjectList
              projects={filteredProjects}
              tasks={store.tasks}
              selectedProjectId={selectedProject.id}
              canReorder={store.searchQuery.trim().length === 0}
              onSelect={store.selectProject}
              onReorder={store.reorderProjects}
            />
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mx-auto max-w-7xl px-7 py-6">
            <ProjectHeader
              project={selectedProject}
              openTasks={openTasks.length}
              assignees={store.settings.assignees}
              onChange={(updates) => store.updateProject(selectedProject.id, updates)}
              onDelete={deleteSelectedProject}
            />

            <div className="mt-6 space-y-5">
              <WeeklyFocus project={selectedProject} onChange={(weeklyFocus) => store.updateProject(selectedProject.id, { weeklyFocus })} />
              <Section
                icon={<ListTodo size={17} />}
                title="任务卡片"
                count={`${visibleTasks.length}/${projectTasks.length}`}
                actionLabel="新任务"
                onAction={createAndOpenTask}
                toolbar={(
                  <TaskFilterTabs
                    active={activeTaskFilter}
                    activeCount={openTasks.length}
                    doneCount={doneTasks.length}
                    totalCount={projectTasks.length}
                    onChange={setTaskFilter}
                  />
                )}
              >
                <TaskGrid tasks={visibleTasks} assignees={store.settings.assignees} onChange={store.updateTask} onCycle={store.cycleTaskStatus} onDelete={store.deleteTask} onOpen={(id) => setActiveCard({ type: 'task', id })} />
              </Section>
              <Section
                icon={<FileText size={17} />}
                title="工作台上下文"
                count={`${workspaceContexts.length}/${projectContexts.length}`}
                actionLabel="新上下文"
                onAction={createAndOpenContext}
                toolbar={(
                  <>
                    <UploadContextButton
                      uploading={uploadingContext}
                      onClick={() => contextUploadInputRef.current?.click()}
                    />
                    <InlineHeaderAction
                      label="查看全部上下文"
                      onClick={() => setActiveKnowledgePanel('contexts')}
                    />
                  </>
                )}
              >
                <ContextGrid contexts={workspaceContexts} onChange={store.updateContext} onDelete={store.deleteContext} onOpen={(id) => setActiveCard({ type: 'context', id })} />
              </Section>
              <Section
                icon={<Lightbulb size={17} />}
                title="关键决策"
                count={`${workspaceDecisions.length}/${projectDecisions.length}`}
                actionLabel="新决策"
                onAction={createAndOpenDecision}
                toolbar={(
                  <InlineHeaderAction
                    label="查看全部决策"
                    onClick={() => setActiveKnowledgePanel('decisions')}
                  />
                )}
              >
                <DecisionList decisions={workspaceDecisions} onChange={store.updateDecision} onDelete={store.deleteDecision} onOpen={(id) => setActiveCard({ type: 'decision', id })} />
              </Section>
            </div>
          </div>
        </section>
      </div>
      <AIFloatingDock
        activePanel={activeAIPanel}
        aiRecordCount={projectAIRecords.length}
        onOpen={setActiveAIPanel}
      />
      <McpGuideButton isOpen={isMcpGuideOpen} onOpen={() => setIsMcpGuideOpen(true)} />
      <SettingsFloatingButton isOpen={isSettingsOpen} onOpen={() => setIsSettingsOpen(true)} />
      <input
        ref={contextUploadInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.txt,.csv,.json,.jpg,.jpeg,.png,.webp,.gif"
        onChange={uploadContextFile}
      />
      <AIPanel
        activePanel={activeAIPanel}
        aiRecordCount={projectAIRecords.length}
        onClose={() => setActiveAIPanel(null)}
      >
        {activeAIPanel === 'assistant' ? (
          <AIAssistant
            projectId={selectedProject.id}
            output={store.aiOutput}
            changes={store.aiChanges}
            selectedChangeIds={store.selectedAIChangeIds}
            loading={store.aiLoading}
            onRun={store.runAiAction}
            onSave={store.createAIRecord}
            onToggleChange={store.toggleAIChange}
            onApplyChanges={store.applySelectedAIChanges}
          />
        ) : (
          <Section
            icon={<Bot size={17} />}
            title="AI Record"
            count={projectAIRecords.length}
            actionLabel="新记录"
            onAction={() => store.createAIRecord(selectedProject.id)}
          >
            <AIRecordList records={projectAIRecords} onChange={store.updateAIRecord} onDelete={store.deleteAIRecord} onConvertToTask={store.createTaskFromAIRecord} />
          </Section>
        )}
      </AIPanel>
      <KnowledgeDrawer
        activePanel={activeKnowledgePanel}
        contextCount={projectContexts.length}
        decisionCount={projectDecisions.length}
        onClose={() => setActiveKnowledgePanel(null)}
      >
        {activeKnowledgePanel === 'contexts' ? (
          <Section
            icon={<FileText size={17} />}
            title="全部上下文"
            count={`${libraryContexts.length}/${projectContexts.length}`}
            actionLabel="新上下文"
            onAction={createAndOpenContext}
            toolbar={(
              <UploadContextButton
                uploading={uploadingContext}
                onClick={() => contextUploadInputRef.current?.click()}
              />
            )}
          >
            <ContextLibraryFilters
              query={contextLibraryQuery}
              typeFilter={contextTypeFilter}
              importanceFilter={contextImportanceFilter}
              statusFilter={contextStatusFilter}
              onQueryChange={setContextLibraryQuery}
              onTypeChange={setContextTypeFilter}
              onImportanceChange={setContextImportanceFilter}
              onStatusChange={setContextStatusFilter}
            />
            <ContextGrid contexts={libraryContexts} onChange={store.updateContext} onDelete={store.deleteContext} onOpen={(id) => setActiveCard({ type: 'context', id })} />
          </Section>
        ) : (
          <Section
            icon={<Lightbulb size={17} />}
            title="完整决策日志"
            count={`${libraryDecisions.length}/${projectDecisions.length}`}
            actionLabel="新决策"
            onAction={createAndOpenDecision}
          >
            <DecisionLibraryFilters
              query={decisionLibraryQuery}
              statusFilter={decisionStatusFilter}
              onQueryChange={setDecisionLibraryQuery}
              onStatusChange={setDecisionStatusFilter}
            />
            <DecisionList decisions={libraryDecisions} onChange={store.updateDecision} onDelete={store.deleteDecision} onOpen={(id) => setActiveCard({ type: 'decision', id })} />
          </Section>
        )}
      </KnowledgeDrawer>
      <SettingsDrawer
        isOpen={isSettingsOpen}
        settings={store.settings}
        onChange={store.updateSettings}
        onClose={() => setIsSettingsOpen(false)}
      />
      <McpGuideDrawer endpoint={mcpEndpoint} isOpen={isMcpGuideOpen} onClose={() => setIsMcpGuideOpen(false)} />
      <CardDetailModal
        activeCard={activeCard}
        card={selectedCard}
        onClose={() => setActiveCard(null)}
        onTaskChange={store.updateTask}
        onContextChange={store.updateContext}
        onDecisionChange={store.updateDecision}
        assignees={store.settings.assignees}
      />
    </main>
  );
}

function isArchived(item: { archived?: boolean }) {
  return item.archived === true;
}

function isVisibleInWorkspace(item: { archived?: boolean; workspaceVisible?: boolean }) {
  return !isArchived(item) && item.workspaceVisible !== false;
}

function inferContextTypeFromFile(filename: string): ContextType {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'md', 'txt'].includes(ext || '')) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'file';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'json'].includes(ext || '')) return 'file';
  return 'file';
}

function matchesLibraryStatus(item: { archived?: boolean; workspaceVisible?: boolean }, status: LibraryStatusFilter) {
  if (status === 'archived') return isArchived(item);
  if (status === 'workspace') return isVisibleInWorkspace(item);
  return !isArchived(item);
}

function ProjectList({
  projects,
  tasks,
  selectedProjectId,
  canReorder,
  onSelect,
  onReorder,
}: {
  projects: Project[];
  tasks: TaskCard[];
  selectedProjectId: string;
  canReorder: boolean;
  onSelect: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  if (!canReorder) {
    return (
      <div className="space-y-2">
        {projects.map((project) => (
          <ProjectListCard
            key={project.id}
            project={project}
            tasks={tasks.filter((task) => task.projectId === project.id)}
            isActive={project.id === selectedProjectId}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={projects.map((project) => project.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {projects.map((project) => (
            <SortableProjectListItem
              key={project.id}
              project={project}
              tasks={tasks.filter((task) => task.projectId === project.id)}
              isActive={project.id === selectedProjectId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableProjectListItem({
  project,
  tasks,
  isActive,
  onSelect,
}: {
  project: Project;
  tasks: TaskCard[];
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'relative z-20 opacity-70' : undefined}>
      <ProjectListCard
        project={project}
        tasks={tasks}
        isActive={isActive}
        onSelect={onSelect}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function ProjectListCard({
  project,
  tasks,
  isActive,
  onSelect,
  dragHandleProps,
}: {
  project: Project;
  tasks: TaskCard[];
  isActive: boolean;
  onSelect: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const blocked = tasks.filter((task) => task.status === 'blocked').length;

  return (
    <div
      className={`flex w-full overflow-hidden rounded-md border text-left transition ${
        isActive ? 'border-[#ff6b4a] bg-[#fff0df] text-slate-950 shadow-sm' : 'border-orange-100 bg-white hover:border-orange-200 hover:bg-orange-50/40'
      }`}
    >
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          title="拖拽排序项目"
          aria-label="拖拽排序项目"
          className="flex w-8 shrink-0 cursor-grab items-center justify-center border-r border-orange-100 text-slate-400 outline-none hover:bg-white/70 hover:text-slate-600 active:cursor-grabbing"
        >
          <GripVertical size={15} />
        </button>
      )}
      <button onClick={() => onSelect(project.id)} className="min-w-0 flex-1 p-3 text-left">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold">{project.name}</div>
          {blocked > 0 && <span className="rounded bg-pink-100 px-1.5 py-0.5 text-[11px] text-pink-700">{blocked} 阻塞</span>}
        </div>
        <div className="line-clamp-2 text-xs text-slate-600">{project.oneLiner}</div>
        <div className="mt-2 text-[11px] text-slate-500">
          {stageLabel[project.stage]} · {tasks.length} 个任务
        </div>
      </button>
    </div>
  );
}

function orderContextsForWorkspace(contexts: ContextCard[]) {
  const importanceOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  return [...contexts].sort((a, b) => {
    const byPinned = Number(b.pinned === true) - Number(a.pinned === true);
    if (byPinned !== 0) return byPinned;
    const byImportance = importanceOrder[a.importance] - importanceOrder[b.importance];
    if (byImportance !== 0) return byImportance;
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });
}

function orderDecisionsForWorkspace(decisions: DecisionCard[]) {
  return [...decisions].sort((a, b) => {
    const byPinned = Number(b.pinned === true) - Number(a.pinned === true);
    if (byPinned !== 0) return byPinned;
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });
}

function ProjectHeader({
  project,
  openTasks,
  assignees,
  onChange,
  onDelete,
}: {
  project: Project;
  openTasks: number;
  assignees: string[];
  onChange: (updates: Partial<Project>) => void;
  onDelete: () => void;
}) {
  const [isOwnerPickerOpen, setIsOwnerPickerOpen] = useState(false);
  const ownerOptions = getAssigneeOptions(assignees, project.owner);

  return (
    <header className="rounded-md border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/70">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <input
            value={project.name}
            onChange={(event) => onChange({ name: event.target.value })}
            className="mb-2 w-full bg-transparent text-2xl font-semibold outline-none"
          />
          <input
            value={project.oneLiner}
            onChange={(event) => onChange({ oneLiner: event.target.value })}
            className="w-full bg-transparent text-sm text-slate-600 outline-none"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <select value={project.status} onChange={(event) => onChange({ status: event.target.value as Project['status'] })} className="rounded-md border border-orange-100 bg-orange-50 px-3 py-2 text-xs">
            <option value="active">推进中</option>
            <option value="paused">暂停</option>
            <option value="shipped">已上线</option>
            <option value="archived">归档</option>
          </select>
          <select value={project.stage} onChange={(event) => onChange({ stage: event.target.value as Project['stage'] })} className="rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-xs">
            <option value="exploring">探索</option>
            <option value="planning">规划</option>
            <option value="building">构建</option>
            <option value="testing">测试</option>
            <option value="launched">上线</option>
          </select>
          <button
            title="删除项目"
            aria-label="删除项目"
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-pink-100 bg-white text-pink-600 hover:bg-pink-50"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Metric label="负责人" value={project.owner || '未指定'} onClick={() => setIsOwnerPickerOpen(true)} />
        <Metric label="未完成任务" value={String(openTasks)} />
        <Metric label="阶段" value={stageLabel[project.stage]} />
        <Metric label="状态" value={statusLabel[project.status]} />
      </div>
      <textarea
        value={project.summary}
        onChange={(event) => onChange({ summary: event.target.value })}
        rows={2}
        className="mt-4 w-full resize-none rounded-md border border-orange-100 bg-[#fffaf1] p-3 text-sm leading-6 text-slate-700 outline-none focus:border-orange-300"
      />
      {isOwnerPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/25 px-4 py-5 sm:items-center">
          <section className="w-full max-w-sm rounded-md border border-orange-100 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">修改项目负责人</div>
                <div className="mt-1 text-xs text-slate-500">{project.name}</div>
              </div>
              <button
                title="关闭"
                aria-label="关闭"
                onClick={() => setIsOwnerPickerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              >
                <X size={15} />
              </button>
            </div>
            <select
              autoFocus
              value={project.owner}
              onChange={(event) => {
                onChange({ owner: event.target.value });
                setIsOwnerPickerOpen(false);
              }}
              className="h-10 w-full rounded-md border border-orange-100 bg-[#fffaf1] px-3 text-sm outline-none focus:border-orange-300"
            >
              <option value="">未指定负责人</option>
              {ownerOptions.map((assignee) => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
          </section>
        </div>
      )}
    </header>
  );
}

function Metric({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const className = `rounded-md bg-[#f2fbf7] p-3 text-left ${onClick ? 'cursor-pointer transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-200' : ''}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <div className="text-[11px] text-teal-600">{label}</div>
        <div className="mt-1 truncate text-sm font-medium">{value}</div>
      </button>
    );
  }

  return (
    <div className={className}>
      <div className="text-[11px] text-teal-600">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function WeeklyFocus({ project, onChange }: { project: Project; onChange: (weeklyFocus: string[]) => void }) {
  return (
    <section className="rounded-md border border-orange-100 bg-white p-4 shadow-sm shadow-orange-100/60">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Target size={17} />
        本周重点
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((index) => (
          <input
            key={index}
            value={project.weeklyFocus[index] || ''}
            onChange={(event) => {
              const next = [...project.weeklyFocus];
              next[index] = event.target.value;
              onChange(next.filter((item, itemIndex) => item.trim() || itemIndex <= index));
            }}
            placeholder={`重点 ${index + 1}`}
            className="h-10 rounded-md border border-orange-100 bg-[#fffaf1] px-3 text-sm outline-none focus:border-orange-300"
          />
        ))}
      </div>
    </section>
  );
}

function Section({
  icon,
  title,
  count,
  actionLabel,
  onAction,
  toolbar,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-orange-100 bg-white p-4 shadow-sm shadow-orange-100/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{count}</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <button onClick={onAction} className="flex h-8 items-center gap-1 rounded-md border border-orange-100 bg-orange-50 px-2.5 text-xs font-medium text-orange-700 hover:bg-orange-100">
            <Plus size={14} />
            {actionLabel}
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}

function TaskFilterTabs({
  active,
  activeCount,
  doneCount,
  totalCount,
  onChange,
}: {
  active: TaskFilter;
  activeCount: number;
  doneCount: number;
  totalCount: number;
  onChange: (filter: TaskFilter) => void;
}) {
  const filters = [
    { id: 'active' as const, label: '活跃', count: activeCount },
    { id: 'all' as const, label: '全部', count: totalCount },
    { id: 'done' as const, label: '已完成', count: doneCount },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => {
        const isActive = active === filter.id;
        return (
          <button
            key={filter.id}
            onClick={() => onChange(filter.id)}
            className={`flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium transition ${
              isActive ? 'border-[#ff6b4a] bg-[#fff0df] text-[#d94828]' : 'border-orange-100 bg-white text-slate-600 hover:bg-orange-50'
            }`}
          >
            {filter.label}
            <span className={`rounded px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white text-[#d94828]' : 'bg-slate-100 text-slate-500'}`}>
              {filter.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ContextLibraryFilters({
  query,
  typeFilter,
  importanceFilter,
  statusFilter,
  onQueryChange,
  onTypeChange,
  onImportanceChange,
  onStatusChange,
}: {
  query: string;
  typeFilter: 'all' | ContextType;
  importanceFilter: 'all' | Priority;
  statusFilter: LibraryStatusFilter;
  onQueryChange: (value: string) => void;
  onTypeChange: (value: 'all' | ContextType) => void;
  onImportanceChange: (value: 'all' | Priority) => void;
  onStatusChange: (value: LibraryStatusFilter) => void;
}) {
  return (
    <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_130px_120px_130px]">
      <LibrarySearchInput value={query} onChange={onQueryChange} placeholder="搜索标题、内容、来源..." />
      <select value={typeFilter} onChange={(event) => onTypeChange(event.target.value as 'all' | ContextType)} className="h-9 rounded-md border border-teal-100 bg-white px-3 text-xs outline-none focus:border-teal-300">
        <option value="all">全部类型</option>
        <option value="note">笔记</option>
        <option value="doc">文档</option>
        <option value="meeting">会议</option>
        <option value="feedback">反馈</option>
        <option value="research">调研</option>
        <option value="link">链接</option>
        <option value="file">文件</option>
      </select>
      <select value={importanceFilter} onChange={(event) => onImportanceChange(event.target.value as 'all' | Priority)} className="h-9 rounded-md border border-teal-100 bg-white px-3 text-xs outline-none focus:border-teal-300">
        <option value="all">全部重要性</option>
        <option value="high">重要</option>
        <option value="medium">普通</option>
        <option value="low">参考</option>
      </select>
      <LibraryStatusSelect value={statusFilter} onChange={onStatusChange} />
    </div>
  );
}

function DecisionLibraryFilters({
  query,
  statusFilter,
  onQueryChange,
  onStatusChange,
}: {
  query: string;
  statusFilter: LibraryStatusFilter;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: LibraryStatusFilter) => void;
}) {
  return (
    <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_130px]">
      <LibrarySearchInput value={query} onChange={onQueryChange} placeholder="搜索标题、决策、理由..." />
      <LibraryStatusSelect value={statusFilter} onChange={onStatusChange} />
    </div>
  );
}

function LibrarySearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-orange-100 bg-white pl-9 pr-3 text-xs outline-none focus:border-orange-300"
      />
    </div>
  );
}

function LibraryStatusSelect({ value, onChange }: { value: LibraryStatusFilter; onChange: (value: LibraryStatusFilter) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as LibraryStatusFilter)} className="h-9 rounded-md border border-orange-100 bg-white px-3 text-xs outline-none focus:border-orange-300">
      <option value="active">未归档</option>
      <option value="workspace">工作台可见</option>
      <option value="archived">已归档</option>
    </select>
  );
}

function InlineHeaderAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-8 items-center gap-1.5 rounded-md border border-orange-100 bg-white px-3 text-xs font-medium text-orange-700 hover:bg-orange-50">
      <Archive size={13} />
      {label}
    </button>
  );
}

function UploadContextButton({ uploading, onClick }: { uploading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={uploading}
      className="flex h-8 items-center gap-1.5 rounded-md border border-teal-100 bg-white px-3 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Upload size={13} />
      {uploading ? '上传中' : '上传文件'}
    </button>
  );
}

function AIFloatingDock({
  activePanel,
  aiRecordCount,
  onOpen,
}: {
  activePanel: 'assistant' | 'records' | null;
  aiRecordCount: number;
  onOpen: (panel: 'assistant' | 'records') => void;
}) {
  const items = [
    { id: 'assistant' as const, label: 'AI 辅助', icon: <Sparkles size={18} /> },
    { id: 'records' as const, label: 'AI Record', icon: <Bot size={18} />, count: aiRecordCount },
  ];

  return (
    <div className="fixed right-5 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2">
      {items.map((item) => {
        const isActive = activePanel === item.id;
        return (
          <button
            key={item.id}
            title={item.label}
            aria-label={item.label}
            onClick={() => onOpen(item.id)}
            className={`group relative flex h-11 w-11 items-center justify-center rounded-md border shadow-sm transition ${
              isActive ? 'border-[#ff6b4a] bg-[#ff6b4a] text-white shadow-orange-200' : 'border-orange-100 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50'
            }`}
          >
            {item.icon}
            {typeof item.count === 'number' && (
              <span className={`absolute -right-1 -top-1 min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isActive ? 'bg-white text-[#ff6b4a]' : 'bg-pink-100 text-pink-700'}`}>
                {item.count}
              </span>
            )}
            <span className="pointer-events-none absolute right-12 rounded bg-slate-950 px-2 py-1 text-xs text-white opacity-0 shadow-sm transition group-hover:opacity-100">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AIPanel({
  activePanel,
  aiRecordCount,
  onClose,
  children,
}: {
  activePanel: 'assistant' | 'records' | null;
  aiRecordCount: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!activePanel) return null;

  const title = activePanel === 'assistant' ? 'AI 辅助' : 'AI Record';
  const description = activePanel === 'assistant' ? '按需整理项目状态、建议下一步，输出后可保存为记录。' : `已沉淀 ${aiRecordCount} 条 AI 工作记录。`;
  const Icon = activePanel === 'assistant' ? Sparkles : Bot;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[1px]">
      <aside className="ml-auto flex h-full w-full max-w-[460px] flex-col border-l border-orange-100 bg-[#fffdf8] shadow-2xl shadow-slate-900/15">
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Icon size={17} />
              {title}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
          </div>
          <button title="关闭" aria-label="关闭" onClick={onClose} className="rounded-md border border-orange-100 bg-white p-2 text-slate-500 hover:bg-orange-50">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function McpGuideButton({ isOpen, onOpen }: { isOpen: boolean; onOpen: () => void }) {
  return (
    <button
      title="MCP 接入指南"
      aria-label="MCP 接入指南"
      onClick={onOpen}
      className={`group fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-md border shadow-lg transition ${
        isOpen ? 'border-teal-500 bg-teal-500 text-white shadow-teal-200' : 'border-teal-100 bg-white text-teal-700 shadow-teal-100 hover:border-teal-200 hover:bg-teal-50'
      }`}
    >
      <Cable size={20} />
      <span className="pointer-events-none absolute bottom-14 right-0 rounded bg-slate-950 px-2 py-1 text-xs text-white opacity-0 shadow-sm transition group-hover:opacity-100">
        MCP 接入
      </span>
    </button>
  );
}

function SettingsFloatingButton({ isOpen, onOpen }: { isOpen: boolean; onOpen: () => void }) {
  return (
    <button
      title="系统设置"
      aria-label="系统设置"
      onClick={onOpen}
      className={`group fixed bottom-20 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-md border shadow-lg transition ${
        isOpen ? 'border-slate-700 bg-slate-800 text-white shadow-slate-200' : 'border-slate-200 bg-white text-slate-700 shadow-slate-100 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <Settings size={20} />
      <span className="pointer-events-none absolute bottom-14 right-0 whitespace-nowrap rounded bg-slate-950 px-2 py-1 text-xs text-white opacity-0 shadow-sm transition group-hover:opacity-100">
        系统设置
      </span>
    </button>
  );
}

function SettingsDrawer({
  isOpen,
  settings,
  onChange,
  onClose,
}: {
  isOpen: boolean;
  settings: SystemSettings;
  onChange: (updates: SystemSettingsUpdate) => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[1px]">
      <aside className="ml-auto flex h-full w-full max-w-[520px] flex-col border-l border-slate-200 bg-[#fffdf8] shadow-2xl shadow-slate-900/15">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Settings size={17} />
              系统设置
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">配置会影响整个驾驶舱，例如任务负责人候选项。</div>
          </div>
          <button title="关闭" aria-label="关闭" onClick={onClose} className="rounded-md border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <AssigneeSettings assignees={settings.assignees} onChange={(assignees) => onChange({ assignees })} />
            <ProjectTemplateSettings settings={settings} onChange={onChange} />
            <TaskDefaultsSettings settings={settings} onChange={onChange} />
            <WorkspacePreferenceSettings settings={settings} onChange={onChange} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function ProjectTemplateSettings({
  settings,
  onChange,
}: {
  settings: SystemSettings;
  onChange: (updates: SystemSettingsUpdate) => void;
}) {
  const template = settings.projectTemplate;
  const updateTemplate = (updates: Partial<SystemSettings['projectTemplate']>) => {
    onChange({ projectTemplate: { ...template, ...updates } });
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold">默认项目模板</div>
        <div className="mt-1 text-xs text-slate-500">新建项目会使用这些初始内容。</div>
      </div>
      <div className="space-y-3">
        <input
          value={template.name}
          onChange={(event) => updateTemplate({ name: event.target.value })}
          placeholder="项目名称"
          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
        />
        <input
          value={template.oneLiner}
          onChange={(event) => updateTemplate({ oneLiner: event.target.value })}
          placeholder="一句话说明"
          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
        />
        <div className="grid grid-cols-2 gap-2">
          <select value={template.owner} onChange={(event) => updateTemplate({ owner: event.target.value })} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
            {getAssigneeOptions(settings.assignees, template.owner).map((assignee) => (
              <option key={assignee} value={assignee}>{assignee}</option>
            ))}
          </select>
          <select value={template.priority} onChange={(event) => updateTemplate({ priority: event.target.value as Priority })} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
          </select>
          <select value={template.status} onChange={(event) => updateTemplate({ status: event.target.value as Project['status'] })} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
            <option value="active">推进中</option>
            <option value="paused">暂停</option>
            <option value="shipped">已上线</option>
            <option value="archived">归档</option>
          </select>
          <select value={template.stage} onChange={(event) => updateTemplate({ stage: event.target.value as Project['stage'] })} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
            <option value="exploring">探索</option>
            <option value="planning">规划</option>
            <option value="building">构建</option>
            <option value="testing">测试</option>
            <option value="launched">上线</option>
          </select>
        </div>
        <textarea
          value={template.summary}
          onChange={(event) => updateTemplate({ summary: event.target.value })}
          rows={3}
          placeholder="默认项目摘要"
          className="w-full resize-none rounded-md border border-slate-200 bg-white p-3 text-sm leading-5 outline-none focus:border-slate-400"
        />
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <input
              key={index}
              value={template.weeklyFocus[index] || ''}
              onChange={(event) => {
                const weeklyFocus = [...template.weeklyFocus];
                weeklyFocus[index] = event.target.value;
                updateTemplate({ weeklyFocus });
              }}
              placeholder={`默认重点 ${index + 1}`}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TaskDefaultsSettings({
  settings,
  onChange,
}: {
  settings: SystemSettings;
  onChange: (updates: SystemSettingsUpdate) => void;
}) {
  const defaults = settings.taskDefaults;
  const updateDefaults = (updates: Partial<SystemSettings['taskDefaults']>) => {
    onChange({ taskDefaults: { ...defaults, ...updates } });
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold">任务默认值</div>
        <div className="mt-1 text-xs text-slate-500">点击“新任务”时自动带入。</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={defaults.owner} onChange={(event) => updateDefaults({ owner: event.target.value })} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
          <option value="">未指定负责人</option>
          {getAssigneeOptions(settings.assignees, defaults.owner).map((assignee) => (
            <option key={assignee} value={assignee}>{assignee}</option>
          ))}
        </select>
        <select value={defaults.priority} onChange={(event) => updateDefaults({ priority: event.target.value as Priority })} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
          <option value="high">高优先级</option>
          <option value="medium">中优先级</option>
          <option value="low">低优先级</option>
        </select>
        <select value={defaults.status} onChange={(event) => updateDefaults({ status: event.target.value as TaskCard['status'] })} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
          <option value="todo">待办</option>
          <option value="doing">进行中</option>
          <option value="blocked">阻塞</option>
          <option value="done">完成</option>
          <option value="canceled">取消</option>
        </select>
        <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm">
          <span className="shrink-0 text-xs text-slate-500">截止 +</span>
          <input
            type="number"
            min={0}
            max={365}
            value={defaults.dueDateOffsetDays}
            onChange={(event) => updateDefaults({ dueDateOffsetDays: Number(event.target.value) })}
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
          <span className="shrink-0 text-xs text-slate-500">天</span>
        </label>
      </div>
    </section>
  );
}

function WorkspacePreferenceSettings({
  settings,
  onChange,
}: {
  settings: SystemSettings;
  onChange: (updates: SystemSettingsUpdate) => void;
}) {
  const workspace = settings.workspace;
  const updateWorkspace = (updates: Partial<SystemSettings['workspace']>) => {
    onChange({ workspace: { ...workspace, ...updates } });
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold">工作台偏好</div>
        <div className="mt-1 text-xs text-slate-500">控制首页默认显示方式。</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={workspace.defaultTaskFilter} onChange={(event) => updateWorkspace({ defaultTaskFilter: event.target.value as TaskFilter })} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
          <option value="active">默认看活跃任务</option>
          <option value="all">默认看全部任务</option>
          <option value="done">默认看已完成</option>
        </select>
        <NumberSetting
          label="上下文"
          value={workspace.contextLimit}
          min={1}
          max={24}
          onChange={(contextLimit) => updateWorkspace({ contextLimit })}
        />
        <NumberSetting
          label="决策"
          value={workspace.decisionLimit}
          min={1}
          max={12}
          onChange={(decisionLimit) => updateWorkspace({ decisionLimit })}
        />
      </div>
    </section>
  );
}

function NumberSetting({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-w-0 flex-1 bg-transparent outline-none"
      />
      <span className="shrink-0 text-xs text-slate-500">条</span>
    </label>
  );
}

function AssigneeSettings({ assignees, onChange }: { assignees: string[]; onChange: (assignees: string[]) => void }) {
  const normalized = assignees.length > 0 ? assignees : ['Combo', 'Codex', 'Claude'];
  const updateAssignee = (index: number, value: string) => {
    const next = normalized.map((assignee, itemIndex) => (itemIndex === index ? value : assignee));
    onChange(cleanAssignees(next));
  };
  const addAssignee = () => {
    onChange([...normalized, nextAssigneeName(normalized)]);
  };
  const removeAssignee = (index: number) => {
    const next = normalized.filter((_, itemIndex) => itemIndex !== index);
    onChange(cleanAssignees(next.length > 0 ? next : ['Combo']));
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">负责人候选项</div>
          <div className="mt-1 text-xs text-slate-500">任务卡片和任务详情会使用这里的名单。</div>
        </div>
        <button onClick={addAssignee} className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
          <Plus size={14} />
          添加
        </button>
      </div>
      <div className="space-y-2">
        {normalized.map((assignee, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={assignee}
              onChange={(event) => updateAssignee(index, event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            />
            <button
              title="删除负责人"
              aria-label="删除负责人"
              onClick={() => removeAssignee(index)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-pink-100 bg-white text-pink-600 hover:bg-pink-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function cleanAssignees(assignees: string[]) {
  const cleaned = assignees.map((assignee) => assignee.trim()).filter(Boolean);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : ['Combo'];
}

function nextAssigneeName(assignees: string[]) {
  const base = '新负责人';
  if (!assignees.includes(base)) return base;
  let index = 2;
  while (assignees.includes(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function getAssigneeOptions(assignees: string[], currentOwner: string) {
  const options = cleanAssignees(assignees);
  if (currentOwner.trim() && !options.includes(currentOwner)) return [currentOwner, ...options];
  return options;
}

function McpGuideDrawer({ endpoint, isOpen, onClose }: { endpoint: string; isOpen: boolean; onClose: () => void }) {
  const [guide, setGuide] = useState<McpGuidePayload | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    fetch('/api/mcp-guide', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as McpGuidePayload;
        if (!cancelled) setGuide(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setGuide({
            configured: false,
            endpoint,
            message: '无法读取服务端 MCP 接入配置。',
          });
        }
      })

    return () => {
      cancelled = true;
    };
  }, [endpoint, isOpen]);

  if (!isOpen) return null;

  const activeGuide = guide || { configured: false, endpoint };
  const loading = guide === null;
  const displayEndpoint = activeGuide.endpoint || endpoint;
  const codexConfig =
    activeGuide.codexConfig ||
    `# ~/.codex/config.toml
[mcp_servers.ai-project-cockpit-remote]
url = "${displayEndpoint}"
bearer_token_env_var = "${mcpTokenEnvName}"`;
  const claudeConfig =
    activeGuide.claudeConfig ||
    `{
  "mcpServers": {
    "ai-project-cockpit-remote": {
      "type": "http",
      "url": "${displayEndpoint}",
      "headers": {
        "Authorization": "Bearer \${${mcpTokenEnvName}}"
      }
    }
  }
}`;
  const smokeCommand =
    activeGuide.smokeCommand ||
    `${mcpTokenEnvName}=<your-token> \\
MCP_HTTP_URL=${displayEndpoint} \\
npm --prefix mcp-server run smoke:http`;
  const agentPrompt =
    activeGuide.agentPrompt ||
    `请连接我的 AI Project Cockpit 远程 MCP。

MCP 地址：
${displayEndpoint}

鉴权请求头：
Authorization: Bearer <your-token>`;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[1px]">
      <aside className="ml-auto flex h-full w-full max-w-[620px] flex-col border-l border-teal-100 bg-[#fffdf8] shadow-2xl shadow-slate-900/15">
        <div className="flex items-start justify-between gap-4 border-b border-teal-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Cable size={17} />
              MCP 接入指南
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">把自己的 agent 连接到这个项目，让工作结果能直接沉淀为任务、上下文、AI Record 和决策。</div>
          </div>
          <button title="关闭" aria-label="关闭" onClick={onClose} className="rounded-md border border-teal-100 bg-white p-2 text-slate-500 hover:bg-teal-50">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <McpCodeBlock
            title={loading ? '正在生成完整接入说明' : '复制给 Agent'}
            code={agentPrompt}
            featured
            copyDisabled={!activeGuide.agentPrompt}
          />
          <McpInfoBlock
            icon={<Cable size={16} />}
            title="远程 MCP 地址"
            value={displayEndpoint}
            copyValue={displayEndpoint}
          />
          <McpInfoBlock
            icon={<KeyRound size={16} />}
            title="鉴权方式"
            value={activeGuide.authHeader || `Authorization: Bearer <${mcpTokenEnvName}>`}
            copyValue={activeGuide.authHeader || 'Authorization: Bearer <your-token>'}
          />

          <McpCodeBlock title="Codex 配置" code={codexConfig} />
          <McpCodeBlock title="Claude / 通用 HTTP MCP 配置" code={claudeConfig} />
          <McpCodeBlock title="连接 smoke 测试" code={smokeCommand} />

          <div className={`rounded-md border p-3 text-xs leading-5 ${activeGuide.configured ? 'border-teal-100 bg-teal-50/70 text-teal-900' : 'border-amber-100 bg-amber-50/70 text-amber-900'}`}>
            {activeGuide.configured
              ? '这份内容已经包含可用 token，复制给 agent 后即可连接。请只发给你信任的 agent。'
              : activeGuide.message || '服务端还没有给 Web 进程配置 MCP_AUTH_TOKEN，当前仍是占位说明。'}
          </div>
        </div>
      </aside>
    </div>
  );
}

function McpInfoBlock({
  icon,
  title,
  value,
  copyValue,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  copyValue: string;
}) {
  return (
    <div className="rounded-md border border-teal-100 bg-[#f2fbf7] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-teal-800">
        {icon}
        {title}
      </div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded border border-teal-100 bg-white px-2 py-2 text-xs text-slate-700">{value}</code>
        <CopyButton value={copyValue} label={`复制${title}`} />
      </div>
    </div>
  );
}

function McpCodeBlock({
  title,
  code,
  featured = false,
  copyDisabled = false,
}: {
  title: string;
  code: string;
  featured?: boolean;
  copyDisabled?: boolean;
}) {
  return (
    <div className={`rounded-md border bg-white ${featured ? 'border-teal-200 shadow-sm shadow-teal-100' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
        <div className="text-xs font-semibold text-slate-700">{title}</div>
        <CopyButton value={code} label={`复制${title}`} disabled={copyDisabled} />
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-5 text-slate-700">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function CopyButton({ value, label, disabled = false }: { value: string; label: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (disabled) return;
    await copyText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      title={label}
      aria-label={label}
      onClick={copy}
      disabled={disabled}
      className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-teal-100 bg-white px-2 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Clipboard size={13} />
      {copied ? '已复制' : '复制'}
    </button>
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function KnowledgeDrawer({
  activePanel,
  contextCount,
  decisionCount,
  onClose,
  children,
}: {
  activePanel: KnowledgePanel | null;
  contextCount: number;
  decisionCount: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!activePanel) return null;

  const isContexts = activePanel === 'contexts';
  const title = isContexts ? '上下文资料库' : '决策日志';
  const description = isContexts ? `完整保存 ${contextCount} 条上下文，工作台只引用其中最值得关注的部分。` : `完整保存 ${decisionCount} 条决策，工作台只露出最近关键判断。`;
  const Icon = isContexts ? FileText : Lightbulb;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[1px]">
      <aside className="ml-auto flex h-full w-full max-w-[760px] flex-col border-l border-orange-100 bg-[#fffdf8] shadow-2xl shadow-slate-900/15">
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Icon size={17} />
              {title}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
          </div>
          <button title="关闭" aria-label="关闭" onClick={onClose} className="rounded-md border border-orange-100 bg-white p-2 text-slate-500 hover:bg-orange-50">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function CardDetailModal({
  activeCard,
  card,
  onClose,
  onTaskChange,
  onContextChange,
  onDecisionChange,
  assignees,
}: {
  activeCard: ActiveCard | null;
  card: TaskCard | ContextCard | DecisionCard | undefined;
  onClose: () => void;
  onTaskChange: (id: string, updates: Partial<TaskCard>) => void;
  onContextChange: (id: string, updates: Partial<ContextCard>) => void;
  onDecisionChange: (id: string, updates: Partial<DecisionCard>) => void;
  assignees: string[];
}) {
  if (!activeCard || !card) return null;

  const title = activeCard.type === 'task' ? '任务详情' : activeCard.type === 'context' ? '上下文详情' : '决策详情';
  const tone = activeCard.type === 'task' ? 'orange' : activeCard.type === 'context' ? 'teal' : 'amber';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-6 backdrop-blur-[1px]" onClick={onClose}>
      <section
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[86vh] w-full max-w-3xl flex-col rounded-md border border-orange-100 bg-[#fffdf8] shadow-2xl shadow-slate-900/20"
      >
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Maximize2 size={16} className={tone === 'teal' ? 'text-teal-600' : tone === 'amber' ? 'text-amber-600' : 'text-orange-600'} />
              {title}
            </div>
            <div className="mt-1 text-xs text-slate-500">小卡片负责预览，详细阅读和编辑在这里完成。</div>
          </div>
          <button title="关闭" aria-label="关闭" onClick={onClose} className="rounded-md border border-orange-100 bg-white p-2 text-slate-500 hover:bg-orange-50">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activeCard.type === 'task' && (
            <TaskDetailEditor task={card as TaskCard} assignees={assignees} onChange={onTaskChange} />
          )}
          {activeCard.type === 'context' && (
            <ContextDetailEditor context={card as ContextCard} onChange={onContextChange} />
          )}
          {activeCard.type === 'decision' && (
            <DecisionDetailEditor decision={card as DecisionCard} onChange={onDecisionChange} />
          )}
        </div>
      </section>
    </div>
  );
}

function TaskDetailEditor({ task, assignees, onChange }: { task: TaskCard; assignees: string[]; onChange: (id: string, updates: Partial<TaskCard>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <select value={task.status} onChange={(event) => onChange(task.id, { status: event.target.value as TaskCard['status'] })} className="rounded-md border border-orange-100 bg-white px-3 py-2 text-sm">
          <option value="todo">待办</option>
          <option value="doing">进行中</option>
          <option value="blocked">阻塞</option>
          <option value="done">完成</option>
          <option value="canceled">取消</option>
        </select>
        <select value={task.priority} onChange={(event) => onChange(task.id, { priority: event.target.value as Priority })} className={`rounded-md border px-3 py-2 text-sm ${priorityStyle[task.priority]}`}>
          <option value="high">高优先级</option>
          <option value="medium">中优先级</option>
          <option value="low">低优先级</option>
        </select>
        <input type="date" value={task.dueDate} onChange={(event) => onChange(task.id, { dueDate: event.target.value })} className="rounded-md border border-orange-100 bg-white px-3 py-2 text-sm" />
      </div>
      <input value={task.title} onChange={(event) => onChange(task.id, { title: event.target.value })} className="w-full bg-transparent text-2xl font-semibold outline-none" />
      <textarea value={task.description} onChange={(event) => onChange(task.id, { description: event.target.value })} rows={7} placeholder="任务说明" className="w-full resize-none rounded-md border border-orange-100 bg-[#fffaf1] p-3 text-sm leading-6 text-slate-700 outline-none focus:border-orange-300" />
      <div className="grid grid-cols-2 gap-3">
        <select value={task.owner} onChange={(event) => onChange(task.id, { owner: event.target.value })} className="h-10 rounded-md border border-orange-100 bg-white px-3 text-sm outline-none">
          <option value="">未指定</option>
          {getAssigneeOptions(assignees, task.owner).map((assignee) => (
            <option key={assignee} value={assignee}>{assignee}</option>
          ))}
        </select>
        <input value={task.notes} onChange={(event) => onChange(task.id, { notes: event.target.value })} placeholder="备注" className="h-10 rounded-md border border-orange-100 bg-white px-3 text-sm outline-none" />
      </div>
    </div>
  );
}

function ContextDetailEditor({ context, onChange }: { context: ContextCard; onChange: (id: string, updates: Partial<ContextCard>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <select value={context.type} onChange={(event) => onChange(context.id, { type: event.target.value as ContextCard['type'] })} className="rounded-md border border-teal-100 bg-white px-3 py-2 text-sm">
          <option value="note">笔记</option>
          <option value="doc">文档</option>
          <option value="meeting">会议</option>
          <option value="feedback">反馈</option>
          <option value="research">调研</option>
          <option value="link">链接</option>
          <option value="file">文件</option>
        </select>
        <select value={context.importance} onChange={(event) => onChange(context.id, { importance: event.target.value as Priority })} className={`rounded-md border px-3 py-2 text-sm ${priorityStyle[context.importance]}`}>
          <option value="high">重要</option>
          <option value="medium">普通</option>
          <option value="low">参考</option>
        </select>
        <input value={context.source} onChange={(event) => onChange(context.id, { source: event.target.value })} placeholder="来源" className="rounded-md border border-teal-100 bg-white px-3 py-2 text-sm outline-none" />
      </div>
      <KnowledgeStateControls
        pinned={context.pinned === true}
        workspaceVisible={context.workspaceVisible !== false}
        archived={context.archived === true}
        onChange={(updates) => onChange(context.id, updates)}
      />
      <input value={context.title} onChange={(event) => onChange(context.id, { title: event.target.value })} className="w-full bg-transparent text-2xl font-semibold outline-none" />
      <textarea value={context.content} onChange={(event) => onChange(context.id, { content: event.target.value })} rows={9} placeholder="上下文内容" className="w-full resize-none rounded-md border border-teal-100 bg-[#f2fbf7] p-3 text-sm leading-6 text-slate-700 outline-none focus:border-teal-300" />
      <input value={context.url} onChange={(event) => onChange(context.id, { url: event.target.value })} placeholder="链接，可选" className="h-10 w-full rounded-md border border-teal-100 bg-white px-3 text-sm outline-none" />
      {context.url && (
        <a href={context.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-teal-100 bg-white px-3 text-xs font-medium text-teal-700 hover:bg-teal-50">
          <FileText size={13} />
          打开文件/链接
        </a>
      )}
    </div>
  );
}

function DecisionDetailEditor({ decision, onChange }: { decision: DecisionCard; onChange: (id: string, updates: Partial<DecisionCard>) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-amber-700">{new Date(decision.createdAt).toLocaleDateString('zh-CN')}</div>
        <KnowledgeStateControls
          pinned={decision.pinned === true}
          workspaceVisible={decision.workspaceVisible !== false}
          archived={decision.archived === true}
          onChange={(updates) => onChange(decision.id, updates)}
        />
      </div>
      <input value={decision.title} onChange={(event) => onChange(decision.id, { title: event.target.value })} className="w-full bg-transparent text-2xl font-semibold outline-none" />
      <textarea value={decision.decision} onChange={(event) => onChange(decision.id, { decision: event.target.value })} rows={5} placeholder="决策内容" className="w-full resize-none rounded-md border border-amber-100 bg-amber-50/60 p-3 text-sm leading-6 text-slate-700 outline-none focus:border-amber-300" />
      <textarea value={decision.rationale} onChange={(event) => onChange(decision.id, { rationale: event.target.value })} rows={5} placeholder="为什么这么决定" className="w-full resize-none rounded-md border border-amber-100 bg-white p-3 text-sm leading-6 text-slate-700 outline-none focus:border-amber-300" />
      <textarea value={decision.alternatives} onChange={(event) => onChange(decision.id, { alternatives: event.target.value })} rows={3} placeholder="备选方案" className="w-full resize-none rounded-md border border-amber-100 bg-white p-3 text-sm leading-6 text-slate-700 outline-none focus:border-amber-300" />
      <textarea value={decision.impact} onChange={(event) => onChange(decision.id, { impact: event.target.value })} rows={3} placeholder="影响" className="w-full resize-none rounded-md border border-amber-100 bg-white p-3 text-sm leading-6 text-slate-700 outline-none focus:border-amber-300" />
    </div>
  );
}

function KnowledgeStateControls({
  pinned,
  workspaceVisible,
  archived,
  onChange,
}: {
  pinned: boolean;
  workspaceVisible: boolean;
  archived: boolean;
  onChange: (updates: { pinned?: boolean; workspaceVisible?: boolean; archived?: boolean }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-600">
        <input type="checkbox" checked={pinned} onChange={(event) => onChange({ pinned: event.target.checked })} className="accent-[#ff6b4a]" />
        置顶
      </label>
      <label className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={workspaceVisible}
          onChange={(event) => onChange({ workspaceVisible: event.target.checked })}
          className="accent-[#ff6b4a]"
        />
        工作台可见
      </label>
      <label className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-600">
        <input type="checkbox" checked={archived} onChange={(event) => onChange({ archived: event.target.checked })} className="accent-[#ff6b4a]" />
        归档
      </label>
    </div>
  );
}

function TaskGrid({
  tasks,
  assignees,
  onChange,
  onCycle,
  onDelete,
  onOpen,
}: {
  tasks: TaskCard[];
  assignees: string[];
  onChange: (id: string, updates: Partial<TaskCard>) => void;
  onCycle: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const ordered = [...tasks].sort((a, b) => {
    const order = { blocked: 0, doing: 1, todo: 2, done: 3, canceled: 4 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      {ordered.length === 0 && <EmptySection text="还没有任务，先加一张最小可执行卡片。" />}
      {ordered.map((task) => (
        <article
          key={task.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(task.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onOpen(task.id);
          }}
          className="group cursor-pointer rounded-md border border-orange-100 bg-[#fffaf1] p-3 transition hover:border-orange-200 hover:shadow-sm hover:shadow-orange-100"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button onClick={(event) => { event.stopPropagation(); onCycle(task.id); }} className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] ${task.status === 'blocked' ? 'border-pink-200 bg-pink-50 text-pink-700' : task.status === 'done' ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-orange-100 bg-white text-slate-600'}`}>
              {task.status === 'done' ? <Check size={12} /> : task.status === 'blocked' ? <Flame size={12} /> : null}
              {statusLabel[task.status]}
            </button>
            <div className="flex items-center gap-1">
              <select value={task.priority} onClick={(event) => event.stopPropagation()} onChange={(event) => onChange(task.id, { priority: event.target.value as Priority })} className={`rounded border px-2 py-1 text-[11px] ${priorityStyle[task.priority]}`}>
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
              <IconButton label="删除任务" onClick={() => onDelete(task.id)} />
            </div>
          </div>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="line-clamp-2 min-h-10 text-sm font-semibold">{task.title || '未命名任务'}</div>
            <Maximize2 size={14} className="mt-0.5 shrink-0 text-slate-300 transition group-hover:text-orange-500" />
          </div>
          <p className="line-clamp-3 min-h-[3.75rem] text-xs leading-5 text-slate-600">{task.description || '任务说明'}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
            <select
              aria-label="负责人"
              value={task.owner}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onChange={(event) => onChange(task.id, { owner: event.target.value })}
              className="h-8 min-w-0 rounded border border-orange-100 bg-white px-2 text-xs text-slate-600 outline-none focus:border-orange-300"
            >
              <option value="">负责人</option>
              {getAssigneeOptions(assignees, task.owner).map((assignee) => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
            <input
              aria-label="截止日"
              type="date"
              value={task.dueDate}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onChange={(event) => onChange(task.id, { dueDate: event.target.value })}
              className="h-8 min-w-0 rounded border border-orange-100 bg-white px-2 text-xs text-slate-600 outline-none focus:border-orange-300"
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function ContextGrid({ contexts, onChange, onDelete, onOpen }: { contexts: ContextCard[]; onChange: (id: string, updates: Partial<ContextCard>) => void; onDelete: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      {contexts.length === 0 && <EmptySection text="还没有上下文，把 PRD、反馈或技术判断先丢进来。" />}
      {contexts.map((context) => (
        <article
          key={context.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(context.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onOpen(context.id);
          }}
          className="group cursor-pointer rounded-md border border-teal-100 bg-[#f2fbf7] p-3 transition hover:border-teal-200 hover:shadow-sm hover:shadow-teal-100"
        >
          <div className="mb-3 flex items-center justify-between">
            <select value={context.type} onClick={(event) => event.stopPropagation()} onChange={(event) => onChange(context.id, { type: event.target.value as ContextCard['type'] })} className="rounded border border-teal-100 bg-white px-2 py-1 text-[11px]">
              <option value="note">笔记</option>
              <option value="doc">文档</option>
              <option value="meeting">会议</option>
              <option value="feedback">反馈</option>
              <option value="research">调研</option>
              <option value="link">链接</option>
              <option value="file">文件</option>
            </select>
            <div className="flex items-center gap-1">
              <select value={context.importance} onClick={(event) => event.stopPropagation()} onChange={(event) => onChange(context.id, { importance: event.target.value as Priority })} className={`rounded border px-2 py-1 text-[11px] ${priorityStyle[context.importance]}`}>
                <option value="high">重要</option>
                <option value="medium">普通</option>
                <option value="low">参考</option>
              </select>
              <IconButton label="删除上下文" onClick={() => onDelete(context.id)} />
            </div>
          </div>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="line-clamp-2 min-h-10 text-sm font-semibold">{context.title || '未命名上下文'}</div>
              <KnowledgeBadges pinned={context.pinned === true} archived={context.archived === true} workspaceVisible={context.workspaceVisible !== false} />
            </div>
            <Maximize2 size={14} className="mt-0.5 shrink-0 text-slate-300 transition group-hover:text-teal-600" />
          </div>
          <p className="line-clamp-4 min-h-20 text-xs leading-5 text-slate-600">{context.content || '上下文内容'}</p>
          {context.url && (
            <a
              href={context.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="mt-2 block truncate rounded border border-teal-100 bg-white px-2 py-1.5 text-xs text-teal-700 hover:bg-teal-50"
            >
              {context.url}
            </a>
          )}
        </article>
      ))}
    </div>
  );
}

function AIAssistant({
  projectId,
  output,
  changes,
  selectedChangeIds,
  loading,
  onRun,
  onSave,
  onToggleChange,
  onApplyChanges,
}: {
  projectId: string;
  output: string;
  changes: AIChange[];
  selectedChangeIds: string[];
  loading: boolean;
  onRun: (projectId: string, action: string) => void;
  onSave: (projectId: string, output?: string) => void;
  onToggleChange: (id: string) => void;
  onApplyChanges: (projectId: string) => void;
}) {
  return (
    <section className="rounded-md border border-pink-100 bg-white p-4 shadow-sm shadow-pink-100/60">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={17} />
        AI 辅助
      </div>
      <div className="mb-3 grid grid-cols-1 gap-2">
        {['总结当前项目状态', '生成下一步任务建议', '整理外部 AI 输出'].map((action) => (
          <button key={action} onClick={() => onRun(projectId, action)} className="rounded-md border border-pink-100 bg-pink-50/60 px-3 py-2 text-left text-xs text-pink-800 hover:bg-pink-100">
            {action}
          </button>
        ))}
      </div>
      <div className="min-h-28 rounded-md bg-[#1f2a44] p-3 text-xs leading-5 text-slate-100">
        {loading ? '正在整理项目上下文...' : output ? <MarkdownLite text={output} /> : 'AI 输出会显示在这里。没有配置 AI_API_URL / AI_API_KEY 时，会使用本地 fallback。'}
      </div>
      {changes.length > 0 && (
        <div className="mt-3 rounded-md border border-pink-100 bg-pink-50/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-pink-900">AI 建议变更</div>
            <div className="text-[11px] text-pink-700">已选 {selectedChangeIds.length}/{changes.length}</div>
          </div>
          <div className="space-y-2">
            {changes.map((change) => (
              <label key={change.id} className="flex cursor-pointer items-start gap-2 rounded border border-white bg-white p-2 text-xs shadow-sm">
                <input
                  type="checkbox"
                  checked={selectedChangeIds.includes(change.id)}
                  onChange={() => onToggleChange(change.id)}
                  className="mt-0.5 accent-[#ff6b4a]"
                />
                <span className="min-w-0">
                  <span className="mb-1 inline-flex rounded bg-pink-100 px-1.5 py-0.5 text-[10px] text-pink-700">{aiChangeTypeLabel(change.type)}</span>
                  <span className="block font-medium text-slate-900">{change.title}</span>
                  <span className="mt-1 line-clamp-2 block text-slate-500">{aiChangePreview(change)}</span>
                </span>
              </label>
            ))}
          </div>
          <button
            disabled={selectedChangeIds.length === 0}
            onClick={() => onApplyChanges(projectId)}
            className="mt-3 w-full rounded-md bg-[#ff6b4a] px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            应用选中的 {selectedChangeIds.length} 个变更
          </button>
        </div>
      )}
      <button disabled={!output} onClick={() => onSave(projectId, output)} className="mt-3 w-full rounded-md border border-pink-100 bg-white px-3 py-2 text-xs font-medium text-pink-700 disabled:cursor-not-allowed disabled:opacity-40">
        保存输出为 AI Record
      </button>
    </section>
  );
}

function aiChangeTypeLabel(type: AIChange['type']) {
  const labels = {
    create_task: '新增任务',
    create_context: '新增上下文',
    create_decision: '新增决策',
    update_project_summary: '更新摘要',
    update_weekly_focus: '更新本周重点',
  };
  return labels[type];
}

function aiChangePreview(change: AIChange) {
  if (change.type === 'create_task') return change.payload.description || change.payload.title;
  if (change.type === 'create_context') return change.payload.content;
  if (change.type === 'create_decision') return change.payload.decision;
  if (change.type === 'update_project_summary') return change.payload.summary;
  return change.payload.weeklyFocus.join(' / ');
}

function AIRecordList({ records, onChange, onDelete, onConvertToTask }: { records: AIRecordCard[]; onChange: (id: string, updates: Partial<AIRecordCard>) => void; onDelete: (id: string) => void; onConvertToTask: (id: string) => void }) {
  return (
    <div className="space-y-3">
      {records.length === 0 && <EmptySection text="保存一次有价值的 AI 输出，它就会变成项目记忆。" />}
      {records.map((record) => (
        <article key={record.id} className="rounded-md border border-pink-100 bg-pink-50/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <input value={record.title} onChange={(event) => onChange(record.id, { title: event.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
            <div className="flex items-center gap-1">
              <span className="rounded bg-white px-2 py-1 text-[11px] text-slate-500">{record.tool}</span>
              <button title="转成任务" onClick={() => onConvertToTask(record.id)} className="rounded border border-pink-100 bg-white p-1.5 text-pink-600 hover:bg-pink-100">
                <CopyPlus size={13} />
              </button>
              <IconButton label="删除 AI Record" onClick={() => onDelete(record.id)} />
            </div>
          </div>
          <textarea value={record.outputSummary} onChange={(event) => onChange(record.id, { outputSummary: event.target.value })} rows={3} className="w-full resize-none bg-transparent text-xs leading-5 text-slate-600 outline-none" />
        </article>
      ))}
    </div>
  );
}

function DecisionList({ decisions, onDelete, onOpen }: { decisions: DecisionCard[]; onChange: (id: string, updates: Partial<DecisionCard>) => void; onDelete: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      {decisions.length === 0 && <EmptySection text="关键判断写在这里，未来的你和 AI 都不用猜。" />}
      {decisions.map((decision) => (
        <article
          key={decision.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(decision.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onOpen(decision.id);
          }}
          className="group cursor-pointer rounded-md border border-amber-100 bg-amber-50/60 p-3 transition hover:border-amber-200 hover:shadow-sm hover:shadow-amber-100"
        >
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-amber-700">
            <span className="flex items-center gap-2">
              <Calendar size={13} />
              {new Date(decision.createdAt).toLocaleDateString('zh-CN')}
            </span>
            <IconButton label="删除决策" onClick={() => onDelete(decision.id)} />
          </div>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="line-clamp-2 min-h-10 text-sm font-semibold">{decision.title || '未命名决策'}</div>
              <KnowledgeBadges pinned={decision.pinned === true} archived={decision.archived === true} workspaceVisible={decision.workspaceVisible !== false} />
            </div>
            <Maximize2 size={14} className="mt-0.5 shrink-0 text-slate-300 transition group-hover:text-amber-600" />
          </div>
          <p className="line-clamp-3 min-h-[3.75rem] text-xs leading-5 text-slate-600">{decision.decision || '决策内容'}</p>
          <p className="mt-2 line-clamp-2 rounded border border-amber-100 bg-white p-2 text-xs leading-5 text-slate-600">{decision.rationale || '为什么这么决定'}</p>
        </article>
      ))}
    </div>
  );
}

function KnowledgeBadges({ pinned, archived, workspaceVisible }: { pinned: boolean; archived: boolean; workspaceVisible: boolean }) {
  if (!pinned && !archived && workspaceVisible) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {pinned && <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-orange-700">置顶</span>}
      {!workspaceVisible && <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500">不在工作台</span>}
      {archived && <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500">归档</span>}
    </div>
  );
}

function MarkdownLite({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;
        if (trimmed.startsWith('## ')) {
          return <div key={index} className="pt-1 text-sm font-semibold text-orange-200">{trimmed.replace(/^##\s*/, '')}</div>;
        }
        if (trimmed.startsWith('- ')) {
          return <div key={index} className="pl-3 text-slate-100 before:mr-2 before:text-teal-200 before:content-['•']">{trimmed.replace(/^-\s*/, '')}</div>;
        }
        return <div key={index}>{trimmed}</div>;
      })}
    </div>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button title={label} aria-label={label} onClick={(event) => { event.stopPropagation(); onClick(); }} className="rounded border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600">
      <Trash2 size={13} />
    </button>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-md border border-dashed border-orange-200 bg-orange-50/50 p-4 text-sm text-slate-500">
      {text}
    </div>
  );
}
