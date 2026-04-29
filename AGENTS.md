<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Project Cockpit Agent Guide

This repo is both the product codebase and a real project tracked inside AI Project Cockpit.

When you work in this repository, treat Cockpit as the project memory:

- Read the project state before significant work.
- Save useful work results back as AI Records.
- Create or update tasks when your work changes the plan.
- Record decisions when you make or discover a meaningful product/technical choice.
- Add context cards for reusable facts, constraints, links, implementation notes, or research findings.

## MCP Server

Use the local MCP server when it is available:

- `cockpit_list_projects`
- `cockpit_get_project`
- `cockpit_search`
- `cockpit_create_task`
- `cockpit_update_task_status`
- `cockpit_create_context`
- `cockpit_create_ai_record`
- `cockpit_create_decision`
- `cockpit_update_project_summary`
- `cockpit_update_weekly_focus`

Setup details are in `docs/mcp-server.md`.

Default target project:

- Project name: `AI Project Cockpit`

If MCP is unavailable, continue the coding task normally and mention the missed writeback in your final response.

## Start Of Work

For any non-trivial task:

1. Call `cockpit_get_project` for `AI Project Cockpit`.
2. Skim open tasks, important contexts, AI Records, and decisions.
3. Search Cockpit memory if the task touches an existing product decision or unclear area.

Keep this lightweight. Do not spend more time on project memory than the task deserves.

## End Of Work

At the end of meaningful work, write back at least one of:

- `cockpit_create_ai_record`: summarize what you did and what changed.
- `cockpit_create_task`: add a follow-up task when something remains.
- `cockpit_update_task_status`: mark a known task done/blocked/doing if you touched it.
- `cockpit_create_context`: save durable implementation notes or constraints.
- `cockpit_create_decision`: save product or architecture decisions.

Prefer concise, high-signal entries. Cockpit should become clearer after your writeback, not noisier.

## Writeback Style

AI Record:

- Title: short result name.
- Tool: the agent/tool used, such as `Codex` or `Claude Code`.
- Input summary: what the user asked for.
- Output summary: what was done, what changed, and verification results.
- Value: use `code`, `insight`, `decision_support`, `task_suggestion`, `draft`, or `research`.

Task:

- Title should start with a verb.
- Description should state the expected outcome.
- Use `blocked` only when there is a concrete blocker.

Decision:

- Capture the choice, rationale, alternatives considered, and impact.
- Do not record every small implementation detail as a decision.

Context:

- Use for facts future agents should know.
- Include source or path when relevant.

## Safety

Do not use MCP tools to delete data. The first MCP version intentionally has no delete tools.

Do not bulk rewrite project state unless the user explicitly asks for it.

Do not put secrets, API keys, tokens, or private credentials into Cockpit records.
