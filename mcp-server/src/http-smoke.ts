import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

type TextContent = {
  type: 'text';
  text: string;
};

const url = process.env.MCP_HTTP_URL || 'http://127.0.0.1:22643/mcp';
const token = process.env.MCP_AUTH_TOKEN;

if (!token) {
  throw new Error('MCP_AUTH_TOKEN is required for HTTP smoke tests.');
}

const client = new Client({
  name: 'ai-project-cockpit-http-smoke',
  version: '0.1.0',
});

const transport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: {
    headers: {
      authorization: `Bearer ${token}`,
    },
  },
});

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const projectResult = await client.callTool({
    name: 'cockpit_list_projects',
    arguments: {},
  });

  const content = 'content' in projectResult && Array.isArray(projectResult.content) ? projectResult.content : [];
  const firstText = content.find((item): item is TextContent => {
    return typeof item === 'object' && item !== null && 'type' in item && item.type === 'text' && 'text' in item;
  });

  if (!firstText) {
    throw new Error('cockpit_list_projects did not return text content.');
  }

  const payload = JSON.parse(firstText.text) as {
    databaseExists?: boolean;
    projects?: unknown[];
  };

  if (!tools.tools.some((tool) => tool.name === 'cockpit_list_projects')) {
    throw new Error('Expected cockpit_list_projects in tool list.');
  }

  if (!payload.databaseExists || !Array.isArray(payload.projects)) {
    throw new Error('Unexpected cockpit_list_projects payload.');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        url,
        toolCount: tools.tools.length,
        projectCount: payload.projects.length,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
