// MCP stdio 冒烟测试：验证工具注册与传输，不启动浏览器。
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

(async () => {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, '..', 'mxai_mcp_server.js')],
    cwd: path.join(__dirname, '..'),
    env: { ...process.env },
  });
  const client = new Client({ name: 'smoke', version: '1.0.0' });
  await client.connect(transport);

  const list = await client.listTools();
  console.log('TOOLS:', list.tools.map(t => t.name).join(', '));

  const st = await client.callTool({ name: 'mxai_status', arguments: {} });
  console.log('mxai_status =>', st.content[0].text);

  await client.close();
  process.exit(0);
})().catch((e) => {
  console.error('SMOKE ERROR:', e && e.message);
  process.exit(1);
});
