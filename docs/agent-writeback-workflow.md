# Agent Writeback Workflow

This workflow is for agents working on AI Project Cockpit from Claude Code, Codex, or another MCP-capable environment.

Goal: make sure useful work done outside the web UI is written back into Cockpit so the project dashboard stays current.

## Quick Prompt

Use this when starting an agent session:

```text
Use the AI Project Cockpit MCP server as project memory.

Before working:
1. Call cockpit_get_project for "AI Project Cockpit".
2. Read the project summary, open tasks, contexts, AI Records, and decisions.
3. Search Cockpit memory if the request touches an unclear product or technical decision.

While working:
- Keep changes scoped to the user request.
- Preserve existing product decisions unless the user changes direction.

Before finishing:
1. Create an AI Record summarizing what you did, changed files, and verification.
2. Create follow-up tasks for unresolved work.
3. Record decisions or context only if they are durable and useful for future agents.
4. Do not write secrets or credentials into Cockpit.
```

## Start Checklist

Call:

```text
cockpit_get_project({
  "projectIdOrName": "AI Project Cockpit"
})
```

Then inspect:

- Project goal and summary
- Weekly focus
- Open tasks
- Important contexts
- Recent decisions
- Recent AI Records

If the user request is ambiguous, search:

```text
cockpit_search({
  "projectIdOrName": "AI Project Cockpit",
  "query": "<keyword>"
})
```

## End Checklist

Create an AI Record for meaningful work:

```json
{
  "projectIdOrName": "AI Project Cockpit",
  "title": "Short result title",
  "tool": "Codex",
  "inputSummary": "What the user asked for.",
  "outputSummary": "What changed, important files, verification results, and remaining risks.",
  "value": "code",
  "status": "used"
}
```

Create follow-up tasks when useful:

```json
{
  "projectIdOrName": "AI Project Cockpit",
  "title": "Improve the project search result view",
  "description": "Show grouped search results instead of only filtering visible cards.",
  "priority": "medium",
  "status": "todo",
  "notes": "Created after agent session."
}
```

Record context when a reusable fact matters:

```json
{
  "projectIdOrName": "AI Project Cockpit",
  "title": "MCP writes to SQLite snapshot",
  "content": "The first MCP version reads and writes the same cockpit_state/main JSON snapshot used by the web app.",
  "type": "technical",
  "importance": "high",
  "source": "mcp-server/src/db.ts"
}
```

Record decisions only when the choice affects future work:

```json
{
  "projectIdOrName": "AI Project Cockpit",
  "title": "Use user-confirmed AI changes",
  "decision": "AI may propose structured project changes, but users must confirm before applying them.",
  "rationale": "Keeps AI useful while preserving trust in project data.",
  "alternatives": "Let AI directly mutate data; keep AI as text-only assistant.",
  "impact": "AI change plans need preview, selection, and apply UI."
}
```

## What To Write Back

Write back:

- Code or product work that changed project direction or state
- Decisions future agents should not rediscover
- Follow-up work that should not be lost
- Context that explains why implementation is shaped a certain way
- Verification results that affect confidence

Do not write back:

- Routine command output
- Every tiny implementation step
- Sensitive data, credentials, tokens, or local secrets
- Speculation without marking it clearly as a hypothesis
- Duplicate notes already present in Cockpit

## Suggested AI Record Format

```markdown
## Work Completed

## Files Changed

## Verification

## Follow-ups

## Notes / Risks
```

Keep entries concise. A good writeback should let someone understand the session in under a minute.
