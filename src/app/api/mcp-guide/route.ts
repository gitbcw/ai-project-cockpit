import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const mcpPort = process.env.MCP_HTTP_PORT || '22643';
const tokenEnvName = 'MCP_AUTH_TOKEN';

export async function GET(request: Request) {
  const token = process.env.MCP_AUTH_TOKEN || process.env.AI_PROJECT_COCKPIT_MCP_TOKEN || '';
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || requestUrl.host;
  const protocol = forwardedProto || requestUrl.protocol.replace(':', '') || 'http';
  const hostname = host.split(':')[0] || requestUrl.hostname;
  const endpoint = `${protocol}://${hostname}:${mcpPort}/mcp`;

  if (!token) {
    return NextResponse.json(
      {
        configured: false,
        endpoint,
        tokenEnvName,
        message: 'MCP_AUTH_TOKEN is not configured for the web process.',
      },
      { status: 503 },
    );
  }

  const authHeader = `Authorization: Bearer ${token}`;
  const codexConfig = `# ~/.codex/config.toml
[mcp_servers.ai-project-cockpit-remote]
url = "${endpoint}"
bearer_token = "${token}"`;
  const claudeConfig = `{
  "mcpServers": {
    "ai-project-cockpit-remote": {
      "type": "http",
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer ${token}"
      }
    }
  }
}`;
  const agentPrompt = `请连接我的 AI Project Cockpit 远程 MCP，并把本项目作为长期项目记忆使用。

MCP 地址：
${endpoint}

鉴权请求头：
${authHeader}

如果你支持 Codex TOML 配置，请使用：
${codexConfig}

如果你支持 Claude / 通用 HTTP MCP JSON 配置，请使用：
${claudeConfig}

连接后请先调用 cockpit_get_project，项目名使用：AI Project Cockpit。`;

  return NextResponse.json({
    configured: true,
    endpoint,
    authHeader,
    codexConfig,
    claudeConfig,
    agentPrompt,
    smokeCommand: `MCP_AUTH_TOKEN='${token}' MCP_HTTP_URL='${endpoint}' npm --prefix mcp-server run smoke:http`,
  });
}
