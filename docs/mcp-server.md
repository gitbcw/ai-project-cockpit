# AI Project Cockpit MCP Server

本地 MCP server 让 Claude Code、Codex 或其他 agent 在工作时读写 AI Project Cockpit 数据。

## 能力范围

只读：

- `cockpit_list_projects`
- `cockpit_get_project`
- `cockpit_search`

写入：

- `cockpit_create_task`
- `cockpit_update_task_status`
- `cockpit_create_context`
- `cockpit_create_ai_record`
- `cockpit_create_decision`
- `cockpit_update_project_summary`
- `cockpit_update_weekly_focus`

第一版不提供删除、批量重写、改成员、改项目状态等高风险工具。

## 数据

默认读取项目根目录下的：

```text
data/cockpit.sqlite
```

可通过环境变量覆盖：

```bash
COCKPIT_DB_PATH=/absolute/path/to/cockpit.sqlite
```

## 本地运行

```bash
cd /Users/combo/MyFile/projects/ai-project-cockpit/mcp-server
npm install
npm run build
npm run start
```

## MCP 客户端配置

推荐直接使用构建后的 server：

```json
{
  "mcpServers": {
    "ai-project-cockpit": {
      "command": "node",
      "args": [
        "/Users/combo/MyFile/projects/ai-project-cockpit/mcp-server/dist/server.js"
      ],
      "env": {
        "COCKPIT_DB_PATH": "/Users/combo/MyFile/projects/ai-project-cockpit/data/cockpit.sqlite"
      }
    }
  }
}
```

开发时也可以用：

```json
{
  "mcpServers": {
    "ai-project-cockpit": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/combo/MyFile/projects/ai-project-cockpit/mcp-server/src/server.ts"
      ],
      "env": {
        "COCKPIT_DB_PATH": "/Users/combo/MyFile/projects/ai-project-cockpit/data/cockpit.sqlite"
      }
    }
  }
}
```

## 推荐工作流

外部 agent 开始工作前：

1. 调用 `cockpit_list_projects` 找项目。
2. 调用 `cockpit_get_project` 读取目标、上下文、任务和决策。
3. 工作完成后调用：
   - `cockpit_create_ai_record` 保存工作结果。
   - `cockpit_create_context` 沉淀关键上下文。
   - `cockpit_create_task` 或 `cockpit_update_task_status` 同步任务状态。
   - `cockpit_create_decision` 记录关键判断。

更完整的 agent 写回模板见 [agent-writeback-workflow.md](agent-writeback-workflow.md)。
