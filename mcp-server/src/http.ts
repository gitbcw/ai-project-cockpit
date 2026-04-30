import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { NextFunction, Request, Response } from 'express';
import { createServer } from './createServer.js';

const DEFAULT_PORT = 22643;
const host = process.env.MCP_HTTP_HOST || '127.0.0.1';
const port = Number(process.env.MCP_HTTP_PORT || DEFAULT_PORT);
const authToken = process.env.MCP_AUTH_TOKEN;
const allowedHosts = process.env.MCP_ALLOWED_HOSTS
  ?.split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function jsonRpcError(res: Response, status: number, code: number, message: string) {
  res.status(status).json({
    jsonrpc: '2.0',
    error: { code, message },
    id: null,
  });
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!authToken) {
    jsonRpcError(res, 503, -32001, 'MCP_AUTH_TOKEN is not configured.');
    return;
  }

  if (req.header('authorization') !== `Bearer ${authToken}`) {
    jsonRpcError(res, 401, -32000, 'Unauthorized.');
    return;
  }

  next();
}

const app = createMcpExpressApp({ host, allowedHosts });

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    name: 'ai-project-cockpit-mcp',
  });
});

app.post('/mcp', requireAuth, async (req: Request, res: Response) => {
  const server = createServer();

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('Error handling MCP HTTP request:', error);
    server.close();

    if (!res.headersSent) {
      jsonRpcError(res, 500, -32603, 'Internal server error.');
    }
  }
});

app.get('/mcp', requireAuth, (_req: Request, res: Response) => {
  jsonRpcError(res, 405, -32000, 'Method not allowed.');
});

app.delete('/mcp', requireAuth, (_req: Request, res: Response) => {
  jsonRpcError(res, 405, -32000, 'Method not allowed.');
});

app.listen(port, host, (error?: Error) => {
  if (error) {
    console.error('Failed to start MCP HTTP server:', error);
    process.exit(1);
  }

  console.log(`AI Project Cockpit MCP HTTP server listening at http://${host}:${port}/mcp`);
});
