import { NextResponse } from 'next/server';
import type { AIChange, CockpitStateSnapshot } from '@/types/cockpit';

export const dynamic = 'force-dynamic';

interface AIRequest {
  projectId: string;
  action: string;
  state: CockpitStateSnapshot;
}

const stageLabel: Record<string, string> = {
  exploring: '探索',
  planning: '规划',
  building: '构建',
  testing: '测试',
  launched: '上线',
};

const taskStatusLabel: Record<string, string> = {
  todo: '待办',
  doing: '进行中',
  blocked: '阻塞',
  done: '完成',
  canceled: '取消',
};

function buildProjectDigest({ projectId, action, state }: AIRequest) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return '没有找到当前项目。';

  const tasks = state.tasks.filter((item) => item.projectId === projectId);
  const contexts = state.contexts.filter((item) => item.projectId === projectId);
  const decisions = state.decisions.filter((item) => item.projectId === projectId);

  return [
    `动作：${action}`,
    `项目：${project.name}`,
    `目标：${project.oneLiner}`,
    `阶段：${stageLabel[project.stage] || project.stage}`,
    `本周重点：${project.weeklyFocus.join(' / ') || '暂无'}`,
    `任务：${tasks.map((task) => `${taskStatusLabel[task.status] || task.status} - ${task.title}`).join('；') || '暂无'}`,
    `重要上下文：${contexts.filter((item) => item.importance === 'high').map((item) => item.title).join('；') || '暂无'}`,
    `最近决策：${decisions.map((item) => item.title).join('；') || '暂无'}`,
  ].join('\n');
}

function fallbackOutput(input: AIRequest) {
  const project = input.state.projects.find((item) => item.id === input.projectId);
  const tasks = input.state.tasks.filter((item) => item.projectId === input.projectId);
  const blocked = tasks.filter((task) => task.status === 'blocked');
  const doing = tasks.filter((task) => task.status === 'doing');

  return [
    '## 当前判断',
    project
      ? `${project.name} 当前处于${stageLabel[project.stage] || project.stage}阶段，重点是把项目目标、任务、上下文和决策沉淀成可持续使用的驾驶舱。`
      : '当前没有选中项目。',
    '',
    '## 主要依据',
    `- 本周重点：${project?.weeklyFocus.join('；') || '暂无'}`,
    `- 进行中任务：${doing.map((task) => task.title).join('；') || '暂无'}`,
    `- 阻塞任务：${blocked.map((task) => task.title).join('；') || '暂无'}`,
    '',
    '## 建议下一步',
    '- 保持第一版范围克制，先验证卡片式驾驶舱是否顺手。',
    '- 优先补齐真实项目样例数据，用一天的工作流检查信息是否好找。',
    '- 把 AI 输出保存为 AI Record，再从中转出任务或决策。',
    '',
    '## 需要确认',
    '- SQLite 快照模式是否足够支撑第一周试用，还是要尽早拆成正式数据表。',
  ].join('\n');
}

function fallbackChanges(input: AIRequest): AIChange[] {
  const project = input.state.projects.find((item) => item.id === input.projectId);
  const tasks = input.state.tasks.filter((item) => item.projectId === input.projectId);
  const contexts = input.state.contexts.filter((item) => item.projectId === input.projectId);
  const timestamp = Date.now();

  if (!project) return [];

  const changes: AIChange[] = [];

  if (input.action.includes('任务')) {
    changes.push(
      {
        id: `ai-change-${timestamp}-task-1`,
        type: 'create_task',
        title: '新增任务：梳理项目详情页信息优先级',
        payload: {
          title: '梳理项目详情页信息优先级',
          description: '确认打开项目后第一眼必须看到哪些信息，减少卡片堆叠带来的噪音。',
          priority: 'high',
          status: 'todo',
        },
      },
      {
        id: `ai-change-${timestamp}-task-2`,
        type: 'create_task',
        title: '新增任务：验证 AI 建议变更面板',
        payload: {
          title: '验证 AI 建议变更面板',
          description: '用真实项目输入测试 AI 生成的任务、上下文、决策是否可信且可控。',
          priority: 'medium',
          status: 'todo',
        },
      },
    );
  }

  if (input.action.includes('总结') || input.action.includes('本周')) {
    changes.push({
      id: `ai-change-${timestamp}-summary`,
      type: 'update_project_summary',
      title: '更新项目摘要',
      payload: {
        summary: `${project.name} 当前处于${stageLabel[project.stage] || project.stage}阶段。已有 ${tasks.length} 个任务和 ${contexts.length} 条上下文，下一步应优先验证驾驶舱是否能让项目状态一眼清楚。`,
      },
    });
  }

  if (input.action.includes('本周') || input.action.includes('任务')) {
    changes.push({
      id: `ai-change-${timestamp}-focus`,
      type: 'update_weekly_focus',
      title: '更新本周重点',
      payload: {
        weeklyFocus: ['验证项目驾驶舱手感', '补齐 AI 建议变更流程', '整理第一批真实项目上下文'],
      },
    });
  }

  if (input.action.includes('整理')) {
    changes.push({
      id: `ai-change-${timestamp}-context`,
      type: 'create_context',
      title: '新增上下文：AI 建议变更原则',
      payload: {
        title: 'AI 建议变更原则',
        content: 'AI 可以提出结构化变更，但第一版必须由用户确认后再应用，不允许自动删除或批量改动关键项目字段。',
        type: 'technical',
        importance: 'high',
        source: 'Cockpit AI',
      },
    });
  }

  if (changes.length === 0) {
    changes.push({
      id: `ai-change-${timestamp}-decision`,
      type: 'create_decision',
      title: '记录决策：AI 变更需人工确认',
      payload: {
        title: 'AI 变更需人工确认',
        decision: 'AI 可以生成项目数据变更草案，但必须由用户勾选并确认应用。',
        rationale: '这样既能让面板被 AI 推动，又保留项目数据的可信度和控制感。',
      },
    });
  }

  return changes;
}

function normalizeChanges(value: unknown): AIChange[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is AIChange => {
      if (!item || typeof item !== 'object') return false;
      const change = item as { id?: unknown; type?: unknown; title?: unknown; payload?: unknown };
      return typeof change.id === 'string' && typeof change.type === 'string' && typeof change.title === 'string' && !!change.payload;
    })
    .slice(0, 6);
}

function parseModelJson(content: string | undefined, input: AIRequest) {
  if (!content) {
    return { output: fallbackOutput(input), changes: fallbackChanges(input) };
  }

  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    const changes = normalizeChanges(parsed.changes);
    return {
      output: typeof parsed.output === 'string' ? parsed.output : fallbackOutput(input),
      changes: changes.length > 0 ? changes : fallbackChanges(input),
    };
  } catch {
    return { output: content, changes: fallbackChanges(input) };
  }
}

function anthropicUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/v1/messages')) return trimmed;
  if (trimmed.endsWith('/v1')) return `${trimmed}/messages`;
  return `${trimmed}/v1/messages`;
}

export async function POST(request: Request) {
  const input = (await request.json()) as AIRequest;
  const apiUrl = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4.1-mini';
  const anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL;
  const anthropicToken = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
  const anthropicModel = process.env.ANTHROPIC_MODEL || process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'MiniMax-M2.7';

  if (!apiUrl || !apiKey) {
    if (anthropicBaseUrl && anthropicToken) {
      const prompt = [
        '请返回 JSON，格式为：{"output":"中文 Markdown 总结","changes":[...]}。',
        'changes 最多 5 条，只能使用这些 type：create_task、create_context、create_decision、update_project_summary、update_weekly_focus。',
        '不要生成删除动作，不要直接修改项目状态、负责人或成员。',
        '',
        buildProjectDigest(input),
      ].join('\n');

      const res = await fetch(anthropicUrl(anthropicBaseUrl), {
        method: 'POST',
        headers: {
          authorization: `Bearer ${anthropicToken}`,
          'x-api-key': anthropicToken,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 1800,
          temperature: 0.2,
          system: '你是项目协作助手。必须只输出可解析 JSON，不要输出 Markdown 代码块。',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        return NextResponse.json({ output: fallbackOutput(input), changes: fallbackChanges(input), mode: 'fallback' });
      }

      const data = await res.json();
      const content = Array.isArray(data?.content)
        ? data.content.map((item: { text?: string }) => item.text || '').join('\n')
        : data?.content;
      return NextResponse.json({ ...parseModelJson(content, input), mode: 'anthropic' });
    }

    return NextResponse.json({ output: fallbackOutput(input), changes: fallbackChanges(input), mode: 'fallback' });
  }

  const prompt = [
    '你是一个产品研发项目驾驶舱里的辅助 AI。基于项目上下文输出简洁、结构化、可执行的建议。不要编造上下文不存在的信息。',
    '请返回 JSON，格式为：{"output":"中文 Markdown 总结","changes":[...]}。',
    'changes 最多 5 条，只能使用这些 type：create_task、create_context、create_decision、update_project_summary、update_weekly_focus。',
    '不要生成删除动作，不要直接修改项目状态、负责人或成员。',
    '',
    buildProjectDigest(input),
  ].join('\n');

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是项目协作助手。必须只输出可解析 JSON，不要输出 Markdown 代码块。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ output: fallbackOutput(input), changes: fallbackChanges(input), mode: 'fallback' });
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return NextResponse.json({ ...parseModelJson(content, input), mode: 'api' });
}
