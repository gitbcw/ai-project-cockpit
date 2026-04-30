import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tempDir = mkdtempSync(path.join(tmpdir(), 'cockpit-mcp-'));
process.env.COCKPIT_DB_PATH = path.join(tempDir, 'cockpit.sqlite');

const { writeState } = await import('./db.js');
const {
  createAIRecord,
  createContext,
  createDecision,
  createTask,
  getProject,
  listProjects,
  searchMemory,
  updateProjectSummary,
  updateTaskStatus,
  updateWeeklyFocus,
} = await import('./operations.js');

const timestamp = new Date().toISOString();

writeState({
  selectedProjectId: 'project-smoke',
  projects: [
    {
      id: 'project-smoke',
      name: 'Smoke Project',
      oneLiner: 'Verify MCP tools',
      description: '',
      status: 'active',
      stage: 'building',
      owner: 'Codex',
      members: ['Codex'],
      priority: 'medium',
      weeklyFocus: ['Smoke test'],
      summary: 'Initial summary',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  tasks: [],
  contexts: [],
  aiRecords: [],
  decisions: [],
});

const task = createTask({ title: 'Write MCP smoke test', priority: 'high' });
updateTaskStatus({ taskId: task.id, status: 'done', notes: 'Verified.' });
createContext({ title: 'MCP direction', content: 'External agents should write back to Cockpit.', type: 'note' });
createAIRecord({ title: 'Agent output', outputSummary: 'MCP server works.', tool: 'smoke' });
createDecision({ title: 'Use MCP', decision: 'Expose Cockpit through local MCP.', rationale: 'Agents work outside the web UI.' });
updateProjectSummary({ summary: 'Smoke summary updated.' });
updateWeeklyFocus({ weeklyFocus: ['Expose MCP', 'Verify tools'] });

const project = getProject('Smoke Project');
const search = searchMemory('MCP');
const projects = listProjects();

if (projects.length !== 1 || project.tasks.length !== 1 || project.contexts.length !== 1 || project.aiRecords.length !== 1 || project.decisions.length !== 1) {
  throw new Error('Smoke test failed: unexpected object counts.');
}

if (search.tasks.length < 1 || project.project.summary !== 'Smoke summary updated.') {
  throw new Error('Smoke test failed: search or summary update did not work.');
}

rmSync(tempDir, { recursive: true, force: true });
console.log('MCP smoke test passed.');
