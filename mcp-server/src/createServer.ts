import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { getDatabasePath, hasDatabase } from './db.js';
import {
  createAIRecord,
  createContext,
  createDecision,
  createTask,
  getProject,
  jsonText,
  listProjects,
  searchMemory,
  updateProjectSummary,
  updateTaskStatus,
  updateWeeklyFocus,
} from './operations.js';

const prioritySchema = z.enum(['high', 'medium', 'low']);
const taskStatusSchema = z.enum(['todo', 'doing', 'blocked', 'done', 'canceled']);
const contextTypeSchema = z.enum(['note', 'doc', 'meeting', 'feedback', 'research', 'link', 'file', 'idea', 'technical']);
const aiRecordValueSchema = z.enum(['insight', 'task_suggestion', 'draft', 'code', 'research', 'decision_support']);

function text(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: typeof value === 'string' ? value : jsonText(value),
      },
    ],
  };
}

export function createServer() {
  const server = new McpServer({
    name: 'ai-project-cockpit',
    version: '0.1.0',
  });

  server.registerTool(
    'cockpit_list_projects',
    {
      title: 'List Cockpit Projects',
      description: 'List all AI Project Cockpit projects with lightweight counts.',
      inputSchema: {},
    },
    async () => text({ databasePath: getDatabasePath(), databaseExists: hasDatabase(), projects: listProjects() }),
  );

  server.registerTool(
    'cockpit_get_project',
    {
      title: 'Get Cockpit Project',
      description: 'Get one project plus its tasks, contexts, AI records, and decisions. Defaults to the selected project.',
      inputSchema: {
        projectIdOrName: z.string().optional(),
      },
    },
    async ({ projectIdOrName }) => text(getProject(projectIdOrName)),
  );

  server.registerTool(
    'cockpit_search',
    {
      title: 'Search Cockpit Memory',
      description: 'Search project memory across projects, tasks, contexts, AI records, and decisions.',
      inputSchema: {
        query: z.string().min(1),
        projectIdOrName: z.string().optional(),
      },
    },
    async ({ query, projectIdOrName }) => text(searchMemory(query, projectIdOrName)),
  );

  server.registerTool(
    'cockpit_create_task',
    {
      title: 'Create Cockpit Task',
      description: 'Create a task in a Cockpit project. Defaults to the selected project.',
      inputSchema: {
        projectIdOrName: z.string().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        owner: z.string().optional(),
        status: taskStatusSchema.optional(),
        priority: prioritySchema.optional(),
        dueDate: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async (input) => text(createTask(input)),
  );

  server.registerTool(
    'cockpit_update_task_status',
    {
      title: 'Update Cockpit Task Status',
      description: 'Update a task status. Does not delete or rewrite the task.',
      inputSchema: {
        taskId: z.string().min(1),
        status: taskStatusSchema,
        notes: z.string().optional(),
      },
    },
    async (input) => text(updateTaskStatus(input)),
  );

  server.registerTool(
    'cockpit_create_context',
    {
      title: 'Create Cockpit Context',
      description: 'Create a context card in a Cockpit project.',
      inputSchema: {
        projectIdOrName: z.string().optional(),
        title: z.string().min(1),
        content: z.string().min(1),
        type: contextTypeSchema.optional(),
        importance: prioritySchema.optional(),
        source: z.string().optional(),
        url: z.string().optional(),
      },
    },
    async (input) => text(createContext(input)),
  );

  server.registerTool(
    'cockpit_create_ai_record',
    {
      title: 'Create Cockpit AI Record',
      description: 'Save a useful external agent or AI result back into a Cockpit project.',
      inputSchema: {
        projectIdOrName: z.string().optional(),
        title: z.string().min(1),
        tool: z.string().optional(),
        inputSummary: z.string().optional(),
        outputSummary: z.string().min(1),
        rawOutput: z.string().optional(),
        value: aiRecordValueSchema.optional(),
        status: z.enum(['saved', 'used', 'rejected', 'converted']).optional(),
      },
    },
    async (input) => text(createAIRecord(input)),
  );

  server.registerTool(
    'cockpit_create_decision',
    {
      title: 'Create Cockpit Decision',
      description: 'Record a key project decision with rationale.',
      inputSchema: {
        projectIdOrName: z.string().optional(),
        title: z.string().min(1),
        decision: z.string().min(1),
        rationale: z.string().optional(),
        alternatives: z.string().optional(),
        impact: z.string().optional(),
        decidedBy: z.array(z.string()).optional(),
      },
    },
    async (input) => text(createDecision(input)),
  );

  server.registerTool(
    'cockpit_update_project_summary',
    {
      title: 'Update Cockpit Project Summary',
      description: 'Update the selected or named project summary.',
      inputSchema: {
        projectIdOrName: z.string().optional(),
        summary: z.string().min(1),
      },
    },
    async (input) => text(updateProjectSummary(input)),
  );

  server.registerTool(
    'cockpit_update_weekly_focus',
    {
      title: 'Update Cockpit Weekly Focus',
      description: 'Update up to three weekly focus items for a project.',
      inputSchema: {
        projectIdOrName: z.string().optional(),
        weeklyFocus: z.array(z.string().min(1)).min(1).max(3),
      },
    },
    async (input) => text(updateWeeklyFocus(input)),
  );

  return server;
}
