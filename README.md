# AI Project Cockpit

自用的产品研发项目驾驶舱，用卡片集中管理项目目标、任务、上下文、AI 工作记录和关键决策。

## 当前取舍

- 纯自用，不做登录、租户、复杂权限或 SaaS 化能力。
- 服务产品研发项目。
- 左侧项目列表，右侧当前项目驾驶舱。
- Task、Context、AI Record、Decision 都采用卡片形态。
- AI 是辅助模块，用于项目总结、下一步建议和整理外部 AI 输出，不作为主工作区。
- AI Record 和 AI Chat 区分；第一版重点记录有价值的 AI 结果。
- 第一版使用本地 SQLite 保存数据。
- 第一版做极简搜索，不接飞书。

## 开发

```bash
npm install
npm run dev
```

默认开发地址是 [http://localhost:3112](http://localhost:3112)。

本地数据会保存在 `data/cockpit.sqlite`，不会提交到版本库。上传的上下文文件会保存在 `public/uploads/`，部署同步代码时也应保留该目录，避免覆盖用户上传资料。

## 文档

原始 PRD 位于 [docs/ai_project_cockpit_prd.md](docs/ai_project_cockpit_prd.md)。

MCP server 配置见 [docs/mcp-server.md](docs/mcp-server.md)。

Agent 写回工作流见 [docs/agent-writeback-workflow.md](docs/agent-writeback-workflow.md)。
