'use client';

import { useEffect, useMemo } from 'react';
import {
  Bot,
  Calendar,
  Check,
  CopyPlus,
  Flame,
  FileText,
  Lightbulb,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { useCockpitStore } from '@/store/useCockpitStore';
import type { AIChange, AIRecordCard, ContextCard, DecisionCard, Priority, Project, TaskCard } from '@/types/cockpit';

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

export default function Home() {
  const store = useCockpitStore();

  useEffect(() => {
    store.load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!store.hydrated) return;
    const timer = window.setTimeout(() => {
      store.save().catch(() => undefined);
    }, 350);
    return () => window.clearTimeout(timer);
    // Zustand actions are stable here; this effect intentionally tracks data snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.projects, store.tasks, store.contexts, store.aiRecords, store.decisions, store.selectedProjectId, store.hydrated]);

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

            <div className="space-y-2">
              {filteredProjects.map((project) => {
                const tasks = store.tasks.filter((task) => task.projectId === project.id);
                const blocked = tasks.filter((task) => task.status === 'blocked').length;
                const isActive = project.id === selectedProject.id;

                return (
                  <button
                    key={project.id}
                    onClick={() => store.selectProject(project.id)}
                    className={`w-full rounded-md border p-3 text-left transition ${
                      isActive ? 'border-[#ff6b4a] bg-[#fff0df] text-slate-950 shadow-sm' : 'border-orange-100 bg-white hover:border-orange-200 hover:bg-orange-50/40'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold">{project.name}</div>
                      {blocked > 0 && <span className="rounded bg-pink-100 px-1.5 py-0.5 text-[11px] text-pink-700">{blocked} 阻塞</span>}
                    </div>
                    <div className="line-clamp-2 text-xs text-slate-600">{project.oneLiner}</div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      {stageLabel[project.stage]} · {tasks.length} 个任务
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mx-auto max-w-7xl px-7 py-6">
            <ProjectHeader project={selectedProject} openTasks={openTasks.length} onChange={(updates) => store.updateProject(selectedProject.id, updates)} />

            <div className="mt-6 grid grid-cols-[1fr_360px] gap-5">
              <div className="space-y-5">
                <WeeklyFocus project={selectedProject} onChange={(weeklyFocus) => store.updateProject(selectedProject.id, { weeklyFocus })} />
                <Section
                  icon={<ListTodo size={17} />}
                  title="任务卡片"
                  count={projectTasks.length}
                  actionLabel="新任务"
                  onAction={() => store.createTask(selectedProject.id)}
                >
                  <TaskGrid tasks={projectTasks} onChange={store.updateTask} onCycle={store.cycleTaskStatus} onDelete={store.deleteTask} />
                </Section>
                <Section
                  icon={<FileText size={17} />}
                  title="上下文卡片"
                  count={projectContexts.length}
                  actionLabel="新上下文"
                  onAction={() => store.createContext(selectedProject.id)}
                >
                  <ContextGrid contexts={projectContexts} onChange={store.updateContext} onDelete={store.deleteContext} />
                </Section>
              </div>

              <div className="space-y-5">
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
                <Section
                  icon={<Bot size={17} />}
                  title="AI Record"
                  count={projectAIRecords.length}
                  actionLabel="新记录"
                  onAction={() => store.createAIRecord(selectedProject.id)}
                >
                  <AIRecordList records={projectAIRecords} onChange={store.updateAIRecord} onDelete={store.deleteAIRecord} onConvertToTask={store.createTaskFromAIRecord} />
                </Section>
                <Section
                  icon={<Lightbulb size={17} />}
                  title="决策日志"
                  count={projectDecisions.length}
                  actionLabel="新决策"
                  onAction={() => store.createDecision(selectedProject.id)}
                >
                  <DecisionList decisions={projectDecisions} onChange={store.updateDecision} onDelete={store.deleteDecision} />
                </Section>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProjectHeader({ project, openTasks, onChange }: { project: Project; openTasks: number; onChange: (updates: Partial<Project>) => void }) {
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
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Metric label="负责人" value={project.owner || '未指定'} />
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
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f2fbf7] p-3">
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

function Section({ icon, title, count, actionLabel, onAction, children }: { icon: React.ReactNode; title: string; count: number; actionLabel: string; onAction: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-orange-100 bg-white p-4 shadow-sm shadow-orange-100/60">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{count}</span>
        </div>
        <button onClick={onAction} className="flex items-center gap-1 rounded-md border border-orange-100 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100">
          <Plus size={14} />
          {actionLabel}
        </button>
      </div>
      {children}
    </section>
  );
}

function TaskGrid({ tasks, onChange, onCycle, onDelete }: { tasks: TaskCard[]; onChange: (id: string, updates: Partial<TaskCard>) => void; onCycle: (id: string) => void; onDelete: (id: string) => void }) {
  const ordered = [...tasks].sort((a, b) => {
    const order = { blocked: 0, doing: 1, todo: 2, done: 3, canceled: 4 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="grid grid-cols-2 gap-3">
      {ordered.length === 0 && <EmptySection text="还没有任务，先加一张最小可执行卡片。" />}
      {ordered.map((task) => (
        <article key={task.id} className="rounded-md border border-orange-100 bg-[#fffaf1] p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button onClick={() => onCycle(task.id)} className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] ${task.status === 'blocked' ? 'border-pink-200 bg-pink-50 text-pink-700' : task.status === 'done' ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-orange-100 bg-white text-slate-600'}`}>
              {task.status === 'done' ? <Check size={12} /> : task.status === 'blocked' ? <Flame size={12} /> : null}
              {statusLabel[task.status]}
            </button>
            <div className="flex items-center gap-1">
              <select value={task.priority} onChange={(event) => onChange(task.id, { priority: event.target.value as Priority })} className={`rounded border px-2 py-1 text-[11px] ${priorityStyle[task.priority]}`}>
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
              <IconButton label="删除任务" onClick={() => onDelete(task.id)} />
            </div>
          </div>
          <input value={task.title} onChange={(event) => onChange(task.id, { title: event.target.value })} className="mb-2 w-full bg-transparent text-sm font-semibold outline-none" />
          <textarea value={task.description} onChange={(event) => onChange(task.id, { description: event.target.value })} rows={2} placeholder="任务说明" className="mb-3 w-full resize-none bg-transparent text-xs leading-5 text-slate-600 outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={task.owner} onChange={(event) => onChange(task.id, { owner: event.target.value })} placeholder="负责人" className="h-8 rounded border border-orange-100 bg-white px-2 text-xs outline-none" />
            <input type="date" value={task.dueDate} onChange={(event) => onChange(task.id, { dueDate: event.target.value })} className="h-8 rounded border border-orange-100 bg-white px-2 text-xs outline-none" />
          </div>
        </article>
      ))}
    </div>
  );
}

function ContextGrid({ contexts, onChange, onDelete }: { contexts: ContextCard[]; onChange: (id: string, updates: Partial<ContextCard>) => void; onDelete: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {contexts.length === 0 && <EmptySection text="还没有上下文，把 PRD、反馈或技术判断先丢进来。" />}
      {contexts.map((context) => (
        <article key={context.id} className="rounded-md border border-teal-100 bg-[#f2fbf7] p-3">
          <div className="mb-3 flex items-center justify-between">
            <select value={context.type} onChange={(event) => onChange(context.id, { type: event.target.value as ContextCard['type'] })} className="rounded border border-teal-100 bg-white px-2 py-1 text-[11px]">
              <option value="idea">产品想法</option>
              <option value="feedback">用户反馈</option>
              <option value="research">调研资料</option>
              <option value="technical">技术说明</option>
              <option value="link">链接/资料</option>
            </select>
            <div className="flex items-center gap-1">
              <select value={context.importance} onChange={(event) => onChange(context.id, { importance: event.target.value as Priority })} className={`rounded border px-2 py-1 text-[11px] ${priorityStyle[context.importance]}`}>
                <option value="high">重要</option>
                <option value="medium">普通</option>
                <option value="low">参考</option>
              </select>
              <IconButton label="删除上下文" onClick={() => onDelete(context.id)} />
            </div>
          </div>
          <input value={context.title} onChange={(event) => onChange(context.id, { title: event.target.value })} className="mb-2 w-full bg-transparent text-sm font-semibold outline-none" />
          <textarea value={context.content} onChange={(event) => onChange(context.id, { content: event.target.value })} rows={3} placeholder="上下文内容" className="w-full resize-none bg-transparent text-xs leading-5 text-slate-600 outline-none" />
          <input value={context.url} onChange={(event) => onChange(context.id, { url: event.target.value })} placeholder="链接，可选" className="mt-2 h-8 w-full rounded border border-teal-100 bg-white px-2 text-xs outline-none" />
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

function DecisionList({ decisions, onChange, onDelete }: { decisions: DecisionCard[]; onChange: (id: string, updates: Partial<DecisionCard>) => void; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-3">
      {decisions.length === 0 && <EmptySection text="关键判断写在这里，未来的你和 AI 都不用猜。" />}
      {decisions.map((decision) => (
        <article key={decision.id} className="rounded-md border border-amber-100 bg-amber-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-amber-700">
            <span className="flex items-center gap-2">
              <Calendar size={13} />
              {new Date(decision.createdAt).toLocaleDateString('zh-CN')}
            </span>
            <IconButton label="删除决策" onClick={() => onDelete(decision.id)} />
          </div>
          <input value={decision.title} onChange={(event) => onChange(decision.id, { title: event.target.value })} className="mb-2 w-full bg-transparent text-sm font-semibold outline-none" />
          <textarea value={decision.decision} onChange={(event) => onChange(decision.id, { decision: event.target.value })} rows={2} placeholder="决策内容" className="w-full resize-none bg-transparent text-xs leading-5 text-slate-600 outline-none" />
          <textarea value={decision.rationale} onChange={(event) => onChange(decision.id, { rationale: event.target.value })} rows={2} placeholder="为什么这么决定" className="mt-2 w-full resize-none rounded border border-amber-100 bg-white p-2 text-xs leading-5 outline-none" />
        </article>
      ))}
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
    <button title={label} aria-label={label} onClick={onClick} className="rounded border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600">
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
