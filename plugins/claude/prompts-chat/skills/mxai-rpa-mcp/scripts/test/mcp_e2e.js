// MCP e2e 冒烟：真实启动浏览器（独立 profile，避免与 REST 服务抢锁）验证 MCP→适配器链路。
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

const HARD_TIMEOUT = setTimeout(() => { console.error('HARD TIMEOUT'); process.exit(2); }, 300000);

(async () => {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, '..', 'mxai_mcp_server.js')],
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, MXAI_PROFILE: path.join(__dirname, '..', '.browser-profile-mcp-test') },
  });
  const client = new Client({ name: 'e2e', version: '1.0.0', timeout: 240000 });
  await client.connect(transport);

  console.log('>> mxai_start ...');
  const start = await client.callTool({ name: 'mxai_start', arguments: {} }, undefined, { timeout: 240000 });
  console.log('mxai_start =>', start.content[0].text);

  const st = await client.callTool({ name: 'mxai_status', arguments: {} });
  console.log('mxai_status =>', st.content[0].text);

  console.log('>> mxai_close ...');
  const close = await client.callTool({ name: 'mxai_close', arguments: {} });
  console.log('mxai_close =>', close.content[0].text);

  await client.close();
  clearTimeout(HARD_TIMEOUT);
  process.exit(0);
})().catch((e) => {
  console.error('E2E ERROR:', e && e.message);
  clearTimeout(HARD_TIMEOUT);
  process.exit(1);
});
