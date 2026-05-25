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
  Bug,
  Download,
  ExternalLink,
  Flame,
  FileText,
  GripVertical,
  KeyRound,
  Lightbulb,
  ListTodo,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { useCockpitStore } from '@/store/useCockpitStore';
import type { AIChange, AIRecordCard, ContextCard, ContextType, DecisionCard, FinanceCard, FinanceCategory, FinanceStatus, OutlineStatus, Priority, Project, ProjectOutlineItem, ProjectOutlineStageGoal, SystemSettings, SystemSettingsUpdate, TaskCard, TestIssue, TestIssueSeverity, TestIssueStatus } from '@/types/cockpit';

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

const outlineStatusLabel: Record<OutlineStatus, string> = {
  not_started: '未开始',
  doing: '进行中',
  done: '已完成',
  risk: '有风险',
};

const financeCategoryLabel: Record<FinanceCategory, string> = {
  travel: '差旅',
  team_building: '团建',
  compute: '算力',
  service: '服务',
  hardware: '硬件',
  other: '其他',
};

const financeStatusLabel: Record<FinanceStatus, string> = {
  pending: '待处理',
  approved: '已审批',
  reimbursed: '已报销',
};

const financeCategoryStyle: Record<FinanceCategory, string> = {
  travel: 'border-amber-200 bg-amber-50 text-amber-700',
  team_building: 'border-orange-200 bg-orange-50 text-orange-700',
  compute: 'border-blue-200 bg-blue-50 text-blue-700',
  service: 'border-violet-200 bg-violet-50 text-violet-700',
  hardware: 'border-slate-200 bg-slate-50 text-slate-700',
  other: 'border-gray-200 bg-gray-50 text-gray-700',
};

const financeStatusStyle: Record<FinanceStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  reimbursed: 'border-teal-200 bg-teal-50 text-teal-700',
};

const testIssueSeverityLabel: Record<TestIssueSeverity, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
};

const testIssueStatusLabel: Record<TestIssueStatus, string> = {
  new: '新提交',
  triaging: '处理中',
  fixed: '已处理',
  archived: '已归档',
};

const testIssueSeverityStyle: Record<TestIssueSeverity, string> = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-pink-200 bg-pink-50 text-pink-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-slate-200 bg-slate-50 text-slate-700',
};

const testIssueStatusStyle: Record<TestIssueStatus, string> = {
  new: 'border-blue-200 bg-blue-50 text-blue-700',
  triaging: 'border-amber-200 bg-amber-50 text-amber-700',
  fixed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  archived: 'border-slate-200 bg-slate-50 text-slate-500',
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
type ActiveCard = { type: 'task' | 'context' | 'decision' | 'finance'; id: string };
type ResourcePreview = { title: string; url: string };
type OutlineFocusMode = 'current' | 'all';
type TestIssueViewFilter = 'active' | 'all' | 'archived';

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mcpEndpoint, setMcpEndpoint] = useState(defaultMcpEndpoint);
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);
  const [resourcePreview, setResourcePreview] = useState<ResourcePreview | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isProjectOutlineOpen, setIsProjectOutlineOpen] = useState(false);
  const [outlineFocusMode, setOutlineFocusMode] = useState<OutlineFocusMode>('current');
  const [isTestIssuePanelOpen, setIsTestIssuePanelOpen] = useState(false);
  const [testIssueProjectFilter, setTestIssueProjectFilter] = useState('all');
  const [testIssueStatusFilter, setTestIssueStatusFilter] = useState<TestIssueViewFilter>('active');
  const [testIssueQuery, setTestIssueQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<TaskFilter | null>(null);
  const [contextLibraryQuery, setContextLibraryQuery] = useState('');
  const [contextTypeFilter, setContextTypeFilter] = useState<'all' | ContextType>('all');
  const [contextImportanceFilter, setContextImportanceFilter] = useState<'all' | Priority>('all');
  const [contextStatusFilter, setContextStatusFilter] = useState<LibraryStatusFilter>('active');
  const [decisionLibraryQuery, setDecisionLibraryQuery] = useState('');
  const [decisionStatusFilter, setDecisionStatusFilter] = useState<LibraryStatusFilter>('active');
  const [isFinancePanelOpen, setIsFinancePanelOpen] = useState(false);
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState<'all' | FinanceCategory>('all');
  const [financeStatusFilter, setFinanceStatusFilter] = useState<'all' | FinanceStatus>('all');
  const [financeProjectFilter, setFinanceProjectFilter] = useState('all');
  const [financeMonthFilter, setFinanceMonthFilter] = useState('');
  const [financeQuery, setFinanceQuery] = useState('');
  const [uploadingContext, setUploadingContext] = useState(false);
  const contextUploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    store.load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.location.hostname) return;
    setMcpEndpoint(`${window.location.protocol}//${window.location.hostname}:22643/mcp`);
  }, []);

  useEffect(() => {
    if (window.location.search.includes('outline=1')) {
      setIsProjectOutlineOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!store.hydrated) return;
    const timer = window.setTimeout(() => {
      store.save().catch(() => undefined);
    }, 350);
    return () => window.clearTimeout(timer);
    // Zustand actions are stable here; this effect intentionally tracks data snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.settings, store.projects, store.outlineStageGoals, store.outlineItems, store.tasks, store.contexts, store.aiRecords, store.decisions, store.finances, store.testIssues, store.selectedProjectId, store.hydrated]);

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
  const projectOutlineItems = store.outlineItems
    .filter((item) => item.projectId === selectedProject.id)
    .filter((item) => matches([item.task, item.note, item.stage, item.status]));
  const projectOutlineStageGoals = store.outlineStageGoals
    .filter((item) => item.projectId === selectedProject.id)
    .filter((item) => matches([item.goal, item.stage]));
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
  const openTestIssueCount = store.testIssues.filter((issue) => issue.status !== 'archived' && !issue.archived).length;
  const createAndOpenTask = () => {
    const id = store.createTask(selectedProject.id);
    setActiveCard({ type: 'task', id });
  };
  const createOutlineItem = (stage: Project['stage']) => {
    store.createOutlineItem(selectedProject.id, stage);
  };
  const openProjectOutline = () => {
    setIsProjectOutlineOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set('outline', '1');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };
  const closeProjectOutline = () => {
    setIsProjectOutlineOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('outline');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
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
  const openResourcePreview = (resource: ResourcePreview) => {
    setResourcePreview(resource);
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
          : activeCard?.type === 'finance'
            ? store.finances.find((finance) => finance.id === activeCard.id)
            : undefined;

  return (
    <main className="min-h-screen bg-[#fff9ed] text-slate-950">
      <div className={`grid min-h-screen transition-[grid-template-columns] duration-200 ${isSidebarCollapsed ? 'grid-cols-[72px_1fr]' : 'grid-cols-[300px_1fr]'}`}>
        <aside className="border-r border-orange-100 bg-[#fffdf8]">
          <div className={`sticky top-0 h-screen overflow-y-auto ${isSidebarCollapsed ? 'p-3' : 'p-5'}`}>
            <div className={`mb-5 flex items-center ${isSidebarCollapsed ? 'flex-col gap-3' : 'gap-3'}`}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#ff6b4a] text-white shadow-sm shadow-orange-200">
                <Target size={18} />
              </div>
              <div className={isSidebarCollapsed ? 'hidden' : 'min-w-0 flex-1'}>
                <div className="text-sm font-semibold">AI Project Cockpit</div>
                <div className="text-xs text-slate-500">产品研发自用驾驶舱</div>
              </div>
              <button
                type="button"
                title={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
                aria-label={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
                aria-expanded={!isSidebarCollapsed}
                onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-orange-100 bg-white text-slate-600 hover:bg-orange-50"
              >
                {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>

            {isSidebarCollapsed ? (
              <CollapsedProjectRail
                projects={filteredProjects}
                tasks={store.tasks}
                selectedProjectId={selectedProject.id}
                onCreate={store.createProject}
                onSelect={store.selectProject}
              />
            ) : (
              <>
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
                  canReorder={isMounted && store.searchQuery.trim().length === 0}
                  onSelect={store.selectProject}
                  onReorder={store.reorderProjects}
                />
              </>
            )}
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
              onOpenOutline={openProjectOutline}
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
                <ContextGrid contexts={workspaceContexts} onChange={store.updateContext} onDelete={store.deleteContext} onOpen={(id) => setActiveCard({ type: 'context', id })} onOpenResource={openResourcePreview} />
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
      <TestIssueFloatingButton isOpen={isTestIssuePanelOpen} openCount={openTestIssueCount} onOpen={() => setIsTestIssuePanelOpen(true)} />
      <FinanceFloatingButton isOpen={isFinancePanelOpen} onOpen={() => setIsFinancePanelOpen(true)} />
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
            <ContextGrid contexts={libraryContexts} onChange={store.updateContext} onDelete={store.deleteContext} onOpen={(id) => setActiveCard({ type: 'context', id })} onOpenResource={openResourcePreview} />
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
      <FinancePanel
        isOpen={isFinancePanelOpen}
        finances={store.finances}
        projects={store.projects}
        assignees={store.settings.assignees}
        categoryFilter={financeCategoryFilter}
        statusFilter={financeStatusFilter}
        projectFilter={financeProjectFilter}
        monthFilter={financeMonthFilter}
        query={financeQuery}
        onCategoryChange={setFinanceCategoryFilter}
        onStatusChange={setFinanceStatusFilter}
        onProjectChange={setFinanceProjectFilter}
        onMonthChange={setFinanceMonthFilter}
        onQueryChange={setFinanceQuery}
        onCreate={() => {
          const id = store.createFinance();
          setActiveCard({ type: 'finance', id });
        }}
        onEdit={(id) => setActiveCard({ type: 'finance', id })}
        onDelete={store.deleteFinance}
        onOpenResource={openResourcePreview}
        onClose={() => setIsFinancePanelOpen(false)}
      />
      <TestIssuePanel
        isOpen={isTestIssuePanelOpen}
        issues={store.testIssues}
        projects={store.projects}
        assignees={store.settings.assignees}
        projectFilter={testIssueProjectFilter}
        statusFilter={testIssueStatusFilter}
        query={testIssueQuery}
        onProjectChange={setTestIssueProjectFilter}
        onStatusChange={setTestIssueStatusFilter}
        onQueryChange={setTestIssueQuery}
        onCreate={store.createTestIssue}
        onChange={store.updateTestIssue}
        onArchive={store.archiveTestIssue}
        onDelete={store.deleteTestIssue}
        onOpenResource={openResourcePreview}
        onClose={() => setIsTestIssuePanelOpen(false)}
      />
      <SettingsDrawer
        isOpen={isSettingsOpen}
        settings={store.settings}
        onChange={store.updateSettings}
        onClose={() => setIsSettingsOpen(false)}
      />
      <McpGuideDrawer endpoint={mcpEndpoint} isOpen={isMcpGuideOpen} onClose={() => setIsMcpGuideOpen(false)} />
      <ProjectOutlineModal
        isOpen={isProjectOutlineOpen}
        project={selectedProject}
        focusMode={outlineFocusMode}
        outlineStageGoals={projectOutlineStageGoals}
        outlineItems={projectOutlineItems}
        onClose={closeProjectOutline}
        onProjectChange={(updates) => store.updateProject(selectedProject.id, updates)}
        onFocusModeChange={setOutlineFocusMode}
        onStageGoalChange={store.updateOutlineStageGoal}
        onOutlineItemChange={store.updateOutlineItem}
        onOutlineItemCreate={createOutlineItem}
        onOutlineItemDelete={store.deleteOutlineItem}
      />
      <CardDetailModal
        activeCard={activeCard}
        card={selectedCard}
        onClose={() => setActiveCard(null)}
        onTaskChange={store.updateTask}
        onContextChange={store.updateContext}
        onDecisionChange={store.updateDecision}
        onFinanceChange={store.updateFinance}
        onOpenResource={openResourcePreview}
        assignees={store.settings.assignees}
        projects={store.projects}
      />
      <ResourcePreviewModal resource={resourcePreview} onClose={() => setResourcePreview(null)} />
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

function CollapsedProjectRail({
  projects,
  tasks,
  selectedProjectId,
  onCreate,
  onSelect,
}: {
  projects: Project[];
  tasks: TaskCard[];
  selectedProjectId: string;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        title="新建项目"
        aria-label="新建项目"
        onClick={onCreate}
        className="flex h-10 w-10 items-center justify-center rounded-md bg-[#ff6b4a] text-white shadow-sm shadow-orange-200 hover:bg-[#f45f3d]"
      >
        <Plus size={17} />
      </button>

      <div className="mt-2 flex w-full flex-col items-center gap-2">
        {projects.map((project) => {
          const isActive = project.id === selectedProjectId;
          const blocked = tasks.some((task) => task.projectId === project.id && task.status === 'blocked');

          return (
            <button
              key={project.id}
              type="button"
              title={project.name}
              aria-label={`切换到项目：${project.name}`}
              onClick={() => onSelect(project.id)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-md border text-xs font-semibold transition ${
                isActive
                  ? 'border-[#ff6b4a] bg-[#fff0df] text-[#d94828] shadow-sm'
                  : 'border-orange-100 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50'
              }`}
            >
              {getProjectInitials(project.name)}
              {blocked && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white bg-pink-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getProjectInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '项';

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  }

  return Array.from(trimmed).slice(0, 2).join('').toUpperCase();
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
  onOpenOutline,
}: {
  project: Project;
  openTasks: number;
  assignees: string[];
  onChange: (updates: Partial<Project>) => void;
  onDelete: () => void;
  onOpenOutline: () => void;
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
          <a
            href="?outline=1"
            onClick={(event) => {
              event.preventDefault();
              onOpenOutline();
            }}
            className="flex h-9 items-center gap-1.5 rounded-md border border-teal-100 bg-white px-3 text-xs font-medium text-teal-700 hover:bg-teal-50"
          >
            <ListTodo size={14} />
            项目大纲
          </a>
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

const projectStageOrder: Project['stage'][] = ['exploring', 'planning', 'building', 'testing', 'launched'];

function ProjectOutlineModal({
  isOpen,
  project,
  focusMode,
  outlineStageGoals,
  outlineItems,
  onClose,
  onProjectChange,
  onFocusModeChange,
  onStageGoalChange,
  onOutlineItemChange,
  onOutlineItemCreate,
  onOutlineItemDelete,
}: {
  isOpen: boolean;
  project: Project;
  focusMode: OutlineFocusMode;
  outlineStageGoals: ProjectOutlineStageGoal[];
  outlineItems: ProjectOutlineItem[];
  onClose: () => void;
  onProjectChange: (updates: Partial<Project>) => void;
  onFocusModeChange: (mode: OutlineFocusMode) => void;
  onStageGoalChange: (projectId: string, stage: Project['stage'], goal: string) => void;
  onOutlineItemChange: (id: string, updates: Partial<ProjectOutlineItem>) => void;
  onOutlineItemCreate: (stage: Project['stage']) => void;
  onOutlineItemDelete: (id: string) => void;
}) {
  if (!isOpen) return null;

  const visibleStages = focusMode === 'current' ? [project.stage] : projectStageOrder;
  const visibleOutlineItems = outlineItems.filter((item) => visibleStages.includes(item.stage));
  const outlineStats = getOutlineStats(visibleOutlineItems);
  const progressPercent = visibleOutlineItems.length > 0 ? Math.round((outlineStats.done / visibleOutlineItems.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]">
      <section className="mx-auto flex h-full w-full max-w-7xl flex-col bg-[#fffdf8] shadow-2xl shadow-slate-900/20">
        <div className="border-b border-orange-100 px-6 py-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-800">
                <ListTodo size={17} />
                项目大纲
                <span className="rounded bg-teal-50 px-1.5 py-0.5 text-xs">{progressPercent}%</span>
              </div>
              <input
                value={project.name}
                onChange={(event) => onProjectChange({ name: event.target.value })}
                className="w-full bg-transparent text-2xl font-semibold text-slate-950 outline-none"
              />
              <input
                value={project.oneLiner}
                onChange={(event) => onProjectChange({ oneLiner: event.target.value })}
                className="mt-1 w-full bg-transparent text-sm text-slate-600 outline-none"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-9 overflow-hidden rounded-md border border-teal-100 bg-white">
                <button
                  type="button"
                  onClick={() => onFocusModeChange('current')}
                  className={`px-3 text-xs font-medium ${focusMode === 'current' ? 'bg-teal-600 text-white' : 'text-teal-700 hover:bg-teal-50'}`}
                >
                  当前阶段
                </button>
                <button
                  type="button"
                  onClick={() => onFocusModeChange('all')}
                  className={`border-l border-teal-100 px-3 text-xs font-medium ${focusMode === 'all' ? 'bg-teal-600 text-white' : 'text-teal-700 hover:bg-teal-50'}`}
                >
                  全部阶段
                </button>
              </div>
              <select value={project.stage} onChange={(event) => onProjectChange({ stage: event.target.value as Project['stage'] })} className="h-9 rounded-md border border-teal-100 bg-teal-50 px-3 text-xs outline-none">
                {projectStageOrder.map((stage) => (
                  <option key={stage} value={stage}>{stageLabel[stage]}</option>
                ))}
              </select>
              <button title="关闭" aria-label="关闭" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_420px]">
            <textarea
              value={project.summary}
              onChange={(event) => onProjectChange({ summary: event.target.value })}
              rows={3}
              placeholder="项目规划目标、范围和当前判断"
              className="w-full resize-none rounded-md border border-orange-100 bg-white p-3 text-sm leading-6 text-slate-700 outline-none focus:border-orange-300"
            />
            <div className="grid grid-cols-4 gap-2">
              <OutlineStat label="显示" value={visibleOutlineItems.length} />
              <OutlineStat label="进行中" value={outlineStats.doing} />
              <OutlineStat label="风险" value={outlineStats.risk} />
              <OutlineStat label="完成" value={outlineStats.done} />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="grid grid-cols-[120px_minmax(320px,1.5fr)_130px_minmax(180px,0.8fr)_64px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              <div>阶段</div>
              <div>主要任务</div>
              <div>状态</div>
              <div>备注</div>
              <div className="text-right">操作</div>
            </div>
            {visibleStages.map((stage) => (
              <OutlineStageRows
                key={stage}
                stage={stage}
                isCurrent={stage === project.stage}
                goal={outlineStageGoals.find((item) => item.stage === stage)?.goal || ''}
                items={outlineItems.filter((item) => item.stage === stage)}
                onGoalChange={(goal) => onStageGoalChange(project.id, stage, goal)}
                onItemChange={onOutlineItemChange}
                onItemCreate={onOutlineItemCreate}
                onItemDelete={onOutlineItemDelete}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function OutlineStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-teal-100 bg-teal-50 p-3">
      <div className="text-[11px] text-teal-700">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function OutlineStageRows({
  stage,
  isCurrent,
  goal,
  items,
  onGoalChange,
  onItemChange,
  onItemCreate,
  onItemDelete,
}: {
  stage: Project['stage'];
  isCurrent: boolean;
  goal: string;
  items: ProjectOutlineItem[];
  onGoalChange: (goal: string) => void;
  onItemChange: (id: string, updates: Partial<ProjectOutlineItem>) => void;
  onItemCreate: (stage: Project['stage']) => void;
  onItemDelete: (id: string) => void;
}) {
  const ordered = orderOutlineItems(items);
  const doneCount = ordered.filter((item) => item.status === 'done').length;

  return (
    <div className={`border-b border-slate-100 last:border-b-0 ${isCurrent ? 'bg-teal-50/30 ring-1 ring-inset ring-teal-100' : ''}`}>
      <div className={`grid grid-cols-[120px_minmax(320px,1.5fr)_130px_minmax(180px,0.8fr)_64px] items-center px-3 py-2 text-xs ${isCurrent ? 'bg-teal-50' : 'bg-[#fffaf1]'}`}>
        <div className="font-semibold text-slate-800">
          {stageLabel[stage]}
          {isCurrent && <span className="ml-2 rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-medium text-white">当前</span>}
        </div>
        <div className="col-span-3 text-slate-500">{ordered.length === 0 ? '这个阶段还没有主要任务' : `${doneCount}/${ordered.length} 已完成`}</div>
        <div className="flex justify-end">
          <button type="button" onClick={() => onItemCreate(stage)} className="flex h-7 items-center gap-1 rounded-md border border-orange-100 bg-white px-2 text-xs font-medium text-orange-700 hover:bg-orange-50">
            <Plus size={13} />
            添加
          </button>
        </div>
      </div>
      <div className="grid grid-cols-[120px_1fr] border-t border-slate-100 px-3 py-3">
        <div className="pt-1 text-xs font-medium text-slate-500">阶段目标</div>
        <textarea
          value={goal}
          onChange={(event) => onGoalChange(event.target.value)}
          rows={2}
          placeholder="这个阶段总体要达成什么"
          className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none focus:border-teal-300"
        />
      </div>
      {ordered.map((item) => (
        <div key={item.id} className="grid grid-cols-[120px_minmax(320px,1.5fr)_130px_minmax(180px,0.8fr)_64px] items-start gap-0 border-t border-slate-100 px-3 py-2">
          <select value={item.stage} onChange={(event) => onItemChange(item.id, { stage: event.target.value as Project['stage'] })} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none">
            {projectStageOrder.map((item) => (
              <option key={item} value={item}>{stageLabel[item]}</option>
            ))}
          </select>
          <div className="px-2">
            <textarea value={item.task} onChange={(event) => onItemChange(item.id, { task: event.target.value })} rows={2} placeholder="主要任务或关键事项" className="w-full resize-none bg-transparent text-sm leading-5 text-slate-700 outline-none" />
          </div>
          <select value={item.status} onChange={(event) => onItemChange(item.id, { status: event.target.value as OutlineStatus })} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none">
            {Object.entries(outlineStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <textarea value={item.note} onChange={(event) => onItemChange(item.id, { note: event.target.value })} rows={2} placeholder="备注" className="w-full resize-none bg-transparent px-2 text-xs leading-5 text-slate-500 outline-none" />
          <div className="flex justify-end">
            <button type="button" title="删除大纲项" aria-label="删除大纲项" onClick={() => onItemDelete(item.id)} className="flex h-8 w-8 items-center justify-center rounded-md border border-pink-100 bg-white text-pink-600 hover:bg-pink-50">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function getOutlineStats(items: ProjectOutlineItem[]) {
  return {
    notStarted: items.filter((item) => item.status === 'not_started').length,
    doing: items.filter((item) => item.status === 'doing').length,
    risk: items.filter((item) => item.status === 'risk').length,
    done: items.filter((item) => item.status === 'done').length,
  };
}

function orderOutlineItems(items: ProjectOutlineItem[]) {
  const statusOrder: Record<OutlineStatus, number> = { risk: 0, doing: 1, not_started: 2, done: 3 };

  return [...items]
    .sort((a, b) => {
      const byStatus = statusOrder[a.status] - statusOrder[b.status];
      if (byStatus !== 0) return byStatus;
      const byOrder = a.order - b.order;
      if (byOrder !== 0) return byOrder;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
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

function TestIssueFloatingButton({ isOpen, openCount, onOpen }: { isOpen: boolean; openCount: number; onOpen: () => void }) {
  return (
    <button
      title="测试问题"
      aria-label="测试问题"
      onClick={onOpen}
      className={`group fixed bottom-44 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-md border shadow-lg transition ${
        isOpen ? 'border-rose-500 bg-rose-600 text-white shadow-rose-200' : 'border-rose-100 bg-white text-rose-700 shadow-rose-100 hover:border-rose-200 hover:bg-rose-50'
      }`}
    >
      <Bug size={20} />
      {openCount > 0 && (
        <span className={`absolute -right-1.5 -top-1.5 min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isOpen ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'}`}>
          {openCount > 99 ? '99+' : openCount}
        </span>
      )}
      <span className="pointer-events-none absolute bottom-14 right-0 whitespace-nowrap rounded bg-slate-950 px-2 py-1 text-xs text-white opacity-0 shadow-sm transition group-hover:opacity-100">
        测试问题
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
  onFinanceChange,
  onOpenResource,
  assignees,
  projects,
}: {
  activeCard: ActiveCard | null;
  card: TaskCard | ContextCard | DecisionCard | FinanceCard | undefined;
  onClose: () => void;
  onTaskChange: (id: string, updates: Partial<TaskCard>) => void;
  onContextChange: (id: string, updates: Partial<ContextCard>) => void;
  onDecisionChange: (id: string, updates: Partial<DecisionCard>) => void;
  onFinanceChange: (id: string, updates: Partial<FinanceCard>) => void;
  onOpenResource: (resource: ResourcePreview) => void;
  assignees: string[];
  projects: Project[];
}) {
  if (!activeCard || !card) return null;

  const title = activeCard.type === 'task' ? '任务详情' : activeCard.type === 'context' ? '上下文详情' : activeCard.type === 'finance' ? '开支详情' : '决策详情';
  const tone = activeCard.type === 'task' ? 'orange' : activeCard.type === 'context' ? 'teal' : activeCard.type === 'finance' ? 'emerald' : 'amber';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-6 backdrop-blur-[1px]" onClick={onClose}>
      <section
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[86vh] w-full max-w-3xl flex-col rounded-md border border-orange-100 bg-[#fffdf8] shadow-2xl shadow-slate-900/20"
      >
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Maximize2 size={16} className={tone === 'teal' ? 'text-teal-600' : tone === 'amber' ? 'text-amber-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-orange-600'} />
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
            <ContextDetailEditor context={card as ContextCard} onChange={onContextChange} onOpenResource={onOpenResource} />
          )}
          {activeCard.type === 'decision' && (
            <DecisionDetailEditor decision={card as DecisionCard} onChange={onDecisionChange} />
          )}
          {activeCard.type === 'finance' && (
            <FinanceDetailEditor finance={card as FinanceCard} assignees={assignees} projects={projects} onChange={onFinanceChange} onOpenResource={onOpenResource} />
          )}
        </div>
      </section>
    </div>
  );
}

function ResourcePreviewModal({ resource, onClose }: { resource: ResourcePreview | null; onClose: () => void }) {
  if (!resource) return null;

  const info = getResourceInfo(resource.url);
  const canEmbed = info.kind === 'image' || (!info.isExternal && ['pdf', 'text'].includes(info.kind));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-6 backdrop-blur-[1px]" onClick={onClose}>
      <section
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-teal-100 bg-[#fffdf8] shadow-2xl shadow-slate-900/25"
      >
        <div className="flex items-start justify-between gap-4 border-b border-teal-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText size={17} className="text-teal-700" />
              资源预览
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">{resource.title}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {info.isUploadedFile && (
              <a
                href={resource.url}
                download={info.filename}
                className="flex h-8 items-center gap-1.5 rounded-md border border-teal-100 bg-white px-3 text-xs font-medium text-teal-700 hover:bg-teal-50"
              >
                <Download size={13} />
                下载
              </a>
            )}
            <CopyButton value={resource.url} label="复制资源链接" />
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 items-center gap-1.5 rounded-md border border-orange-100 bg-white px-3 text-xs font-medium text-orange-700 hover:bg-orange-50"
            >
              <ExternalLink size={13} />
              {info.isExternal ? '打开外链' : '新窗口打开'}
            </a>
            <button title="关闭" aria-label="关闭" onClick={onClose} className="rounded-md border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="border-b border-teal-50 bg-teal-50/40 px-5 py-3 text-xs leading-5 text-slate-600">
          <span className="font-medium text-teal-800">{info.label}</span>
          <span className="mx-2 text-slate-300">/</span>
          <span className="break-all">{resource.url}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-white p-4">
          {canEmbed ? (
            <ResourceEmbed resource={resource} kind={info.kind} />
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
              <FileText size={34} className="mb-3 text-slate-400" />
              <div className="text-sm font-semibold text-slate-800">{info.isExternal ? '外部链接不在页面内强制嵌入' : '这个文件类型暂不支持内嵌预览'}</div>
              <p className="mt-2 max-w-md text-xs leading-6 text-slate-500">
                {info.isExternal
                  ? '外部网站可能有跨站限制，也可能包含登录态或跳转。这里先保留在 Cockpit 内确认，再由你决定是否打开。'
                  : '当前先提供下载和新窗口打开，后续可以为 Word、Excel、PPT 等类型接入专门的解析或预览服务。'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ResourceEmbed({ resource, kind }: { resource: ResourcePreview; kind: ResourceInfo['kind'] }) {
  if (kind === 'image') {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-md bg-slate-50 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resource.url} alt={resource.title} className="max-h-[68vh] max-w-full rounded-md object-contain" />
      </div>
    );
  }

  return (
    <iframe
      title={resource.title}
      src={resource.url}
      className="h-[68vh] w-full rounded-md border border-slate-200 bg-white"
    />
  );
}

type ResourceInfo = {
  filename: string;
  isExternal: boolean;
  isUploadedFile: boolean;
  kind: 'image' | 'pdf' | 'text' | 'other';
  label: string;
};

function getResourceInfo(url: string): ResourceInfo {
  const trimmed = url.trim();
  const parsed = safeParseUrl(trimmed);
  const pathname = parsed?.pathname || trimmed.split('?')[0] || '';
  const filename = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || 'resource');
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const isExternal = /^https?:\/\//i.test(trimmed) && !pathname.startsWith('/uploads/');
  const isUploadedFile = pathname.startsWith('/uploads/');

  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extension)) {
    return { filename, isExternal, isUploadedFile, kind: 'image', label: isUploadedFile ? '上传图片' : '图片链接' };
  }
  if (extension === 'pdf') {
    return { filename, isExternal, isUploadedFile, kind: 'pdf', label: isUploadedFile ? '上传 PDF' : 'PDF 链接' };
  }
  if (['txt', 'md', 'csv', 'json'].includes(extension)) {
    return { filename, isExternal, isUploadedFile, kind: 'text', label: isUploadedFile ? '上传文本文件' : '文本链接' };
  }

  return { filename, isExternal, isUploadedFile, kind: 'other', label: isExternal ? '外部链接' : isUploadedFile ? '上传文件' : '资源链接' };
}

function safeParseUrl(url: string) {
  try {
    return new URL(url, 'http://cockpit.local');
  } catch {
    return null;
  }
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

function ContextDetailEditor({
  context,
  onChange,
  onOpenResource,
}: {
  context: ContextCard;
  onChange: (id: string, updates: Partial<ContextCard>) => void;
  onOpenResource: (resource: ResourcePreview) => void;
}) {
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
        <button
          type="button"
          onClick={() => onOpenResource({ title: context.title || '上下文资源', url: context.url })}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-teal-100 bg-white px-3 text-xs font-medium text-teal-700 hover:bg-teal-50"
        >
          <FileText size={13} />
          预览文件/链接
        </button>
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

function ContextGrid({
  contexts,
  onChange,
  onDelete,
  onOpen,
  onOpenResource,
}: {
  contexts: ContextCard[];
  onChange: (id: string, updates: Partial<ContextCard>) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onOpenResource: (resource: ResourcePreview) => void;
}) {
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
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenResource({ title: context.title || '上下文资源', url: context.url });
              }}
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

// ─── Finance Floating Button ───

function FinanceFloatingButton({ isOpen, onOpen }: { isOpen: boolean; onOpen: () => void }) {
  return (
    <button
      title="财务管理"
      aria-label="财务管理"
      onClick={onOpen}
      className={`group fixed bottom-32 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-md border shadow-lg transition ${
        isOpen ? 'border-emerald-500 bg-emerald-600 text-white shadow-emerald-200' : 'border-emerald-100 bg-white text-emerald-700 shadow-emerald-100 hover:border-emerald-200 hover:bg-emerald-50'
      }`}
    >
      <Wallet size={20} />
      <span className="pointer-events-none absolute bottom-14 right-0 whitespace-nowrap rounded bg-slate-950 px-2 py-1 text-xs text-white opacity-0 shadow-sm transition group-hover:opacity-100">
        财务管理
      </span>
    </button>
  );
}

// ─── Finance Panel ───

function TestIssuePanel({
  isOpen,
  issues,
  projects,
  assignees,
  projectFilter,
  statusFilter,
  query,
  onProjectChange,
  onStatusChange,
  onQueryChange,
  onCreate,
  onChange,
  onArchive,
  onDelete,
  onOpenResource,
  onClose,
}: {
  isOpen: boolean;
  issues: TestIssue[];
  projects: Project[];
  assignees: string[];
  projectFilter: string;
  statusFilter: TestIssueViewFilter;
  query: string;
  onProjectChange: (v: string) => void;
  onStatusChange: (v: TestIssueViewFilter) => void;
  onQueryChange: (v: string) => void;
  onCreate: () => string;
  onChange: (id: string, updates: Partial<TestIssue>) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenResource: (resource: ResourcePreview) => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const filtered = issues.filter((issue) => {
    const linkedProject = issue.projectId ? projects.find((project) => project.id === issue.projectId) : null;
    const isArchived = issue.archived || issue.status === 'archived';
    if (statusFilter === 'active' && isArchived) return false;
    if (statusFilter === 'archived' && !isArchived) return false;
    if (projectFilter === 'unassigned' && issue.projectId) return false;
    if (projectFilter !== 'all' && projectFilter !== 'unassigned' && issue.projectId !== projectFilter) return false;
    if (q && ![issue.title, issue.description, issue.reporter, linkedProject?.name || ''].some((field) => field.toLowerCase().includes(q))) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const openCount = issues.filter((issue) => !issue.archived && issue.status !== 'archived').length;
  const criticalCount = issues.filter((issue) => !issue.archived && issue.status !== 'archived' && issue.severity === 'critical').length;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[1px]">
      <aside className="ml-auto flex h-full w-full max-w-[960px] flex-col border-l border-rose-100 bg-[#fffdf8] shadow-2xl shadow-slate-900/15">
        <div className="flex items-start justify-between gap-4 border-b border-rose-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
              <Bug size={17} />
              测试问题
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">收集团队和测试反馈，关联项目，处理完成后归档。</div>
          </div>
          <button title="关闭" aria-label="关闭" onClick={onClose} className="rounded-md border border-rose-100 bg-white p-2 text-slate-500 hover:bg-rose-50">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-5 rounded-md border border-rose-100 bg-gradient-to-r from-rose-50/80 to-amber-50/60 p-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <div className="text-[11px] text-slate-500">待处理</div>
                <div className="mt-1 text-2xl font-bold text-rose-700">{openCount}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">严重问题</div>
                <div className="mt-1 text-2xl font-bold text-red-700">{criticalCount}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">当前筛选</div>
                <div className="mt-1 text-lg font-semibold text-slate-800">{sorted.length}</div>
              </div>
              <div className="text-right text-xs text-slate-500">
                总计 {issues.length} 条
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="搜索标题、说明、提交人、项目..."
                className="h-8 w-full rounded-md border border-rose-100 bg-white pl-8 pr-3 text-xs outline-none focus:border-rose-300"
              />
            </div>
            <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value as TestIssueViewFilter)} className="h-8 rounded-md border border-rose-100 bg-white px-2 text-xs">
              <option value="active">待处理</option>
              <option value="all">全部</option>
              <option value="archived">已归档</option>
            </select>
            <select value={projectFilter} onChange={(event) => onProjectChange(event.target.value)} className="h-8 max-w-[180px] rounded-md border border-rose-100 bg-white px-2 text-xs">
              <option value="all">All Projects</option>
              <option value="unassigned">No Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <button
              onClick={onCreate}
              className="flex h-8 items-center gap-1 rounded-md bg-rose-600 px-3 text-xs font-medium text-white shadow-sm shadow-rose-200 hover:bg-rose-700"
            >
              <Plus size={14} />
              新问题
            </button>
          </div>

          <TestIssueList issues={sorted} projects={projects} assignees={assignees} onChange={onChange} onArchive={onArchive} onDelete={onDelete} onOpenResource={onOpenResource} />
        </div>
      </aside>
    </div>
  );
}

function TestIssueList({
  issues,
  projects,
  assignees,
  onChange,
  onArchive,
  onDelete,
  onOpenResource,
}: {
  issues: TestIssue[];
  projects: Project[];
  assignees: string[];
  onChange: (id: string, updates: Partial<TestIssue>) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenResource: (resource: ResourcePreview) => void;
}) {
  if (issues.length === 0) return <EmptySection text="暂无测试问题。" />;

  return (
    <div className="space-y-3">
      {issues.map((issue) => {
        const linkedProject = issue.projectId ? projects.find((project) => project.id === issue.projectId) : null;
        const isArchived = issue.archived || issue.status === 'archived';
        return (
          <TestIssueItem
            key={issue.id}
            issue={issue}
            projects={projects}
            assignees={assignees}
            linkedProject={linkedProject}
            isArchived={isArchived}
            onChange={onChange}
            onArchive={onArchive}
            onDelete={onDelete}
            onOpenResource={onOpenResource}
          />
        );
      })}
    </div>
  );
}

function TestIssueItem({
  issue,
  projects,
  assignees,
  linkedProject,
  isArchived,
  onChange,
  onArchive,
  onDelete,
  onOpenResource,
}: {
  issue: TestIssue;
  projects: Project[];
  assignees: string[];
  linkedProject: Project | null | undefined;
  isArchived: boolean;
  onChange: (id: string, updates: Partial<TestIssue>) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenResource: (resource: ResourcePreview) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const attachments = issue.attachments || [];

  const uploadAttachments = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedAttachments = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          window.alert(`上传失败：${error.error || file.name}`);
          continue;
        }
        const uploaded = (await res.json()) as UploadResponse;
        uploadedAttachments.push({
          url: uploaded.url,
          type: uploaded.mimeType.startsWith('image/') ? 'image' as const : 'file' as const,
          name: uploaded.originalName || file.name,
        });
      }
      if (uploadedAttachments.length > 0) {
        onChange(issue.id, { attachments: [...attachments, ...uploadedAttachments] });
      }
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    onChange(issue.id, { attachments: attachments.filter((_, i) => i !== index) });
  };

  return (
    <article className={`rounded-md border p-3 ${isArchived ? 'border-slate-200 bg-slate-50/70' : 'border-rose-100 bg-rose-50/30'}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={issue.severity} onChange={(event) => onChange(issue.id, { severity: event.target.value as TestIssueSeverity })} className={`h-8 rounded border px-2 text-xs ${testIssueSeverityStyle[issue.severity]}`}>
          {Object.entries(testIssueSeverityLabel).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select value={issue.status} onChange={(event) => onChange(issue.id, { status: event.target.value as TestIssueStatus })} className={`h-8 rounded border px-2 text-xs ${testIssueStatusStyle[issue.status]}`}>
          {Object.entries(testIssueStatusLabel).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select value={issue.projectId || ''} onChange={(event) => onChange(issue.id, { projectId: event.target.value || null })} className="h-8 min-w-[160px] rounded border border-rose-100 bg-white px-2 text-xs">
          <option value="">未关联项目</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select value={issue.reporter} onChange={(event) => onChange(issue.id, { reporter: event.target.value })} className="h-8 w-28 rounded border border-rose-100 bg-white px-2 text-xs outline-none focus:border-rose-300">
          <option value="">提交人</option>
          {getAssigneeOptions(assignees, issue.reporter).map((assignee) => (
            <option key={assignee} value={assignee}>{assignee}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-1">
          <input ref={attachmentInputRef} type="file" multiple accept="image/*" className="hidden" onChange={uploadAttachments} />
          <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={uploading} className="flex h-8 items-center gap-1 rounded border border-rose-100 bg-white px-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
            <Upload size={13} />
            {uploading ? '上传中' : '上传图片'}
          </button>
          {!isArchived && (
            <button onClick={() => onArchive(issue.id)} className="flex h-8 items-center gap-1 rounded border border-rose-100 bg-white px-2 text-xs font-medium text-rose-700 hover:bg-rose-50">
              <Archive size={13} />
              归档
            </button>
          )}
          <IconButton label="删除" onClick={() => onDelete(issue.id)} />
        </div>
      </div>
      <input value={issue.title} onChange={(event) => onChange(issue.id, { title: event.target.value })} className="mb-2 w-full bg-transparent text-base font-semibold outline-none" placeholder="问题标题" />
      <textarea value={issue.description} onChange={(event) => onChange(issue.id, { description: event.target.value })} rows={3} placeholder="复现步骤、现象、期望结果..." className="w-full resize-none rounded-md border border-rose-100 bg-white/80 p-3 text-sm leading-6 text-slate-700 outline-none focus:border-rose-300" />
      {attachments.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {attachments.map((attachment, index) => (
            <div key={`${attachment.url}-${index}`} className="group relative overflow-hidden rounded-md border border-rose-100 bg-white">
              <button
                type="button"
                onClick={() => onOpenResource({ title: attachment.name || issue.title || '测试问题图片', url: attachment.url })}
                className="block aspect-video w-full bg-rose-50 text-left"
              >
                {attachment.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.url} alt={attachment.name || issue.title || '测试问题图片'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-xs text-rose-700">{attachment.name || attachment.url}</div>
                )}
              </button>
              <button
                type="button"
                title="删除图片"
                aria-label="删除图片"
                onClick={() => removeAttachment(index)}
                className="absolute right-1 top-1 rounded border border-rose-100 bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition hover:bg-rose-50 hover:text-rose-700 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
              <div className="truncate px-2 py-1 text-[11px] text-slate-500">{attachment.name || attachment.url}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>{linkedProject ? `关联：${linkedProject.name}` : '未关联项目'}</span>
        <span>更新于 {new Date(issue.updatedAt).toLocaleString('zh-CN')}</span>
      </div>
    </article>
  );
}
function FinancePanel({
  isOpen,
  finances,
  projects,
  assignees,
  categoryFilter,
  statusFilter,
  projectFilter,
  monthFilter,
  query,
  onCategoryChange,
  onStatusChange,
  onProjectChange,
  onMonthChange,
  onQueryChange,
  onCreate,
  onEdit,
  onDelete,
  onOpenResource,
  onClose,
}: {
  isOpen: boolean;
  finances: FinanceCard[];
  projects: Project[];
  assignees: string[];
  categoryFilter: 'all' | FinanceCategory;
  statusFilter: 'all' | FinanceStatus;
  projectFilter: string;
  monthFilter: string;
  query: string;
  onCategoryChange: (v: 'all' | FinanceCategory) => void;
  onStatusChange: (v: 'all' | FinanceStatus) => void;
  onProjectChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onQueryChange: (v: string) => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenResource: (resource: ResourcePreview) => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const filtered = finances.filter((f) => {
    const linkedProject = f.projectId ? projects.find((project) => project.id === f.projectId) : null;
    if (q && ![f.title, f.description, f.payer, String(f.amount), linkedProject?.name || ''].some((field) => field.toLowerCase().includes(q))) return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (projectFilter === 'unassigned' && f.projectId) return false;
    if (projectFilter !== 'all' && projectFilter !== 'unassigned' && f.projectId !== projectFilter) return false;
    if (monthFilter && !f.date.startsWith(monthFilter)) return false;
    return true;
  });

  const totalAmount = filtered.reduce((sum, f) => sum + f.amount, 0);
  const pendingCount = filtered.filter((f) => f.status === 'pending').length;
  const approvedCount = filtered.filter((f) => f.status === 'approved').length;
  const reimbursedCount = filtered.filter((f) => f.status === 'reimbursed').length;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthTotal = finances.filter((f) => f.date.startsWith(thisMonth)).reduce((sum, f) => sum + f.amount, 0);
  const lastMonthTotal = finances.filter((f) => f.date.startsWith(lastMonth)).reduce((sum, f) => sum + f.amount, 0);
  const monthDiff = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : thisMonthTotal > 0 ? '100' : '0';

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[1px]">
      <aside className="ml-auto flex h-full w-full max-w-[1100px] flex-col border-l border-emerald-100 bg-[#fffdf8] shadow-2xl shadow-slate-900/15">
        <div className="flex items-start justify-between gap-4 border-b border-emerald-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <Wallet size={17} />
              财务管理
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">记录团队开支，管理凭据，掌握资金流向。</div>
          </div>
          <button title="关闭" aria-label="关闭" onClick={onClose} className="rounded-md border border-emerald-100 bg-white p-2 text-slate-500 hover:bg-emerald-50">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* 统计摘要 */}
          <div className="mb-5 rounded-md border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 p-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div>
                <div className="text-[11px] text-slate-500">筛选后总额</div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">¥{totalAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">本月支出</div>
                <div className="mt-1 text-lg font-semibold text-slate-800">¥{thisMonthTotal.toLocaleString()}</div>
                <div className={`text-[11px] ${Number(monthDiff) > 0 ? 'text-amber-600' : Number(monthDiff) < 0 ? 'text-teal-600' : 'text-slate-400'}`}>
                  {Number(monthDiff) > 0 ? '↑' : Number(monthDiff) < 0 ? '↓' : '—'} 较上月 {Math.abs(Number(monthDiff))}%
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-lg font-semibold text-amber-600">{pendingCount}</div>
                  <div className="text-[10px] text-slate-500">待处理</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-emerald-600">{approvedCount}</div>
                  <div className="text-[10px] text-slate-500">已审批</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-teal-600">{reimbursedCount}</div>
                  <div className="text-[10px] text-slate-500">已报销</div>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                共 {filtered.length} 条记录<br />总计 {finances.length} 条
              </div>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="搜索用途、说明、付款人..."
                className="h-8 w-full rounded-md border border-emerald-100 bg-white pl-8 pr-3 text-xs outline-none focus:border-emerald-300"
              />
            </div>
            <select value={categoryFilter} onChange={(event) => onCategoryChange(event.target.value as 'all' | FinanceCategory)} className="h-8 rounded-md border border-emerald-100 bg-white px-2 text-xs">
              <option value="all">全部分类</option>
              {Object.entries(financeCategoryLabel).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value as 'all' | FinanceStatus)} className="h-8 rounded-md border border-emerald-100 bg-white px-2 text-xs">
              <option value="all">全部状态</option>
              {Object.entries(financeStatusLabel).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select value={projectFilter} onChange={(event) => onProjectChange(event.target.value)} className="h-8 max-w-[180px] rounded-md border border-emerald-100 bg-white px-2 text-xs">
              <option value="all">All Projects</option>
              <option value="unassigned">No Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <input
              type="month"
              value={monthFilter}
              onChange={(event) => onMonthChange(event.target.value)}
              className="h-8 rounded-md border border-emerald-100 bg-white px-2 text-xs"
            />
            {monthFilter && (
              <button onClick={() => onMonthChange('')} className="text-xs text-slate-400 hover:text-slate-600">清除月份</button>
            )}
            <button
              onClick={onCreate}
              className="flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white shadow-sm shadow-emerald-200 hover:bg-emerald-700"
            >
              <Plus size={14} />
              新开支
            </button>
          </div>

          {/* 卡片网格 */}
          <FinanceGrid finances={filtered} projects={projects} onEdit={onEdit} onDelete={onDelete} onOpenResource={onOpenResource} />
        </div>
      </aside>
    </div>
  );
}

// ─── Finance Grid ───

function FinanceGrid({
  finances,
  projects,
  onEdit,
  onDelete,
  onOpenResource,
}: {
  finances: FinanceCard[];
  projects: Project[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenResource: (resource: ResourcePreview) => void;
}) {
  const sorted = [...finances].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      {sorted.length === 0 && <EmptySection text="还没有开支记录，点击「新开支」开始记录。" />}
      {sorted.map((finance) => {
        const linkedProject = finance.projectId ? projects.find((p) => p.id === finance.projectId) : null;
        return (
          <article
            key={finance.id}
            role="button"
            tabIndex={0}
            onClick={() => onEdit(finance.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onEdit(finance.id);
            }}
            className="group cursor-pointer rounded-md border border-emerald-100 bg-emerald-50/40 p-3 transition hover:border-emerald-200 hover:shadow-sm hover:shadow-emerald-100"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className={`rounded border px-2 py-0.5 text-[11px] ${financeCategoryStyle[finance.category]}`}>
                {financeCategoryLabel[finance.category]}
              </span>
              <div className="flex items-center gap-1">
                <span className={`rounded border px-2 py-0.5 text-[11px] ${financeStatusStyle[finance.status]}`}>
                  {financeStatusLabel[finance.status]}
                </span>
                <IconButton label="删除" onClick={() => onDelete(finance.id)} />
              </div>
            </div>
            <div className="mb-1 line-clamp-1 text-sm font-semibold">{finance.title || '未命名开支'}</div>
            <div className="mb-2 text-xl font-bold text-emerald-700">¥{finance.amount.toLocaleString()}</div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{finance.date || '未填日期'}</span>
              <span>{finance.payer || '未指定'}</span>
            </div>
            {linkedProject && (
              <div className="mt-1 text-[11px] text-slate-400">关联：{linkedProject.name}</div>
            )}
            {finance.receipts.length > 0 && (
              <div className="mt-2 space-y-1">
                {finance.receipts.map((receipt, idx) => (
                  <a
                    key={idx}
                    href={receipt.url}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onOpenResource({ title: receipt.name || finance.title || '凭据', url: receipt.url });
                    }}
                    className="block truncate rounded border border-emerald-100 bg-white px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                  >
                    {receipt.type === 'file' ? '📎 ' : '🔗 '}{receipt.name || receipt.url}
                  </a>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

// ─── Finance Detail Editor ───

function FinanceDetailEditor({
  finance,
  assignees,
  projects,
  onChange,
  onOpenResource,
}: {
  finance: FinanceCard;
  assignees: string[];
  projects: Project[];
  onChange: (id: string, updates: Partial<FinanceCard>) => void;
  onOpenResource: (resource: ResourcePreview) => void;
}) {
  const receiptUploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const getAssigneeOptions = (list: string[], current: string) => {
    const options = [...list];
    if (current && !options.includes(current)) options.push(current);
    return options;
  };

  const uploadReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
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
      onChange(finance.id, {
        receipts: [...finance.receipts, { url: uploaded.url, type: 'file' as const, name: uploaded.originalName || file.name }],
      });
    } catch {
      window.alert('上传失败，请重试');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const addLinkReceipt = () => {
    const url = window.prompt('请输入凭据链接：');
    if (!url?.trim()) return;
    onChange(finance.id, {
      receipts: [...finance.receipts, { url: url.trim(), type: 'link' as const }],
    });
  };

  const removeReceipt = (index: number) => {
    onChange(finance.id, {
      receipts: finance.receipts.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <select value={finance.category} onChange={(event) => onChange(finance.id, { category: event.target.value as FinanceCategory })} className="rounded-md border border-emerald-100 bg-white px-3 py-2 text-sm">
          {Object.entries(financeCategoryLabel).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select value={finance.status} onChange={(event) => onChange(finance.id, { status: event.target.value as FinanceStatus })} className={`rounded-md border px-3 py-2 text-sm ${financeStatusStyle[finance.status]}`}>
          {Object.entries(financeStatusLabel).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input type="date" value={finance.date} onChange={(event) => onChange(finance.id, { date: event.target.value })} className="rounded-md border border-emerald-100 bg-white px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">金额（元）</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={finance.amount || ''}
            onChange={(event) => onChange(finance.id, { amount: Math.max(0, Number(event.target.value)) })}
            className="w-full rounded-md border border-emerald-100 bg-white px-3 py-2 text-lg font-semibold text-emerald-700 outline-none focus:border-emerald-300"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">付款人</label>
          <select value={finance.payer} onChange={(event) => onChange(finance.id, { payer: event.target.value })} className="w-full rounded-md border border-emerald-100 bg-white px-3 py-2 text-sm">
            <option value="">未指定</option>
            {getAssigneeOptions(assignees, finance.payer).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
      <input value={finance.title} onChange={(event) => onChange(finance.id, { title: event.target.value })} className="w-full bg-transparent text-2xl font-semibold outline-none" placeholder="用途/摘要" />
      <textarea value={finance.description} onChange={(event) => onChange(finance.id, { description: event.target.value })} rows={5} placeholder="说明（可选）" className="w-full resize-none rounded-md border border-emerald-100 bg-emerald-50/40 p-3 text-sm leading-6 text-slate-700 outline-none focus:border-emerald-300" />
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">关联项目（可选）</label>
        <select value={finance.projectId || ''} onChange={(event) => onChange(finance.id, { projectId: event.target.value || null })} className="w-full rounded-md border border-emerald-100 bg-white px-3 py-2 text-sm">
          <option value="">不关联项目</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* 凭据区域 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] text-slate-500">凭据材料（{finance.receipts.length}）</label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={addLinkReceipt}
              className="flex h-7 items-center gap-1 rounded-md border border-emerald-100 bg-white px-2.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <ExternalLink size={11} />
              添加链接
            </button>
            <button
              type="button"
              onClick={() => receiptUploadRef.current?.click()}
              disabled={uploading}
              className="flex h-7 items-center gap-1 rounded-md border border-emerald-100 bg-white px-2.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={11} />
              {uploading ? '上传中...' : '上传文件'}
            </button>
          </div>
        </div>
        <input
          ref={receiptUploadRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.txt,.csv,.json,.jpg,.jpeg,.png,.webp,.gif"
          onChange={uploadReceipt}
        />
        {finance.receipts.length === 0 ? (
          <div className="rounded-md border border-dashed border-emerald-200 bg-emerald-50/30 p-3 text-center text-xs text-slate-400">
            暂无凭据，可上传文件或添加链接
          </div>
        ) : (
          <div className="space-y-2">
            {finance.receipts.map((receipt, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-md border border-emerald-100 bg-white p-2">
                <span className="shrink-0 text-xs">{receipt.type === 'file' ? '📎' : '🔗'}</span>
                <button
                  type="button"
                  onClick={() => onOpenResource({ title: receipt.name || finance.title || '凭据', url: receipt.url })}
                  className="min-w-0 flex-1 truncate text-left text-xs text-emerald-700 hover:underline"
                >
                  {receipt.name || receipt.url}
                </button>
                <button
                  type="button"
                  onClick={() => removeReceipt(idx)}
                  className="shrink-0 rounded p-1 text-slate-400 hover:bg-pink-50 hover:text-pink-600"
                  title="移除"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
