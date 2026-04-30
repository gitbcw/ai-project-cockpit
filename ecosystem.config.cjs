module.exports = {
  apps: [
    {
      name: 'ai-project-cockpit',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 22642',
      cwd: '/home/claude/apps/ai-project-cockpit',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: '22642',
        MCP_HTTP_PORT: '22643',
        MCP_AUTH_TOKEN: process.env.MCP_AUTH_TOKEN || '',
      },
    },
    {
      name: 'ai-project-cockpit-mcp',
      script: 'mcp-server/dist/http.js',
      cwd: '/home/claude/apps/ai-project-cockpit',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        MCP_HTTP_HOST: '0.0.0.0',
        MCP_HTTP_PORT: '22643',
        MCP_ALLOWED_HOSTS: '118.145.115.197,localhost,127.0.0.1',
        MCP_AUTH_TOKEN: process.env.MCP_AUTH_TOKEN || '',
        COCKPIT_DB_PATH: '/home/claude/apps/ai-project-cockpit/data/cockpit.sqlite',
      },
    },
  ],
};
