/**
 * MXAI MCP Server (stdio)
 * ---------------------------------------------------------------------------
 * 把 MXAI 生图自动化能力以 MCP 工具暴露给 WorkBuddy / Codex 等客户端。
 *
 * 运行方式（团队成员本机）：
 *   node mxai_mcp_server.js
 * 由客户端的 mcpServers 配置以 stdio 方式 spawn，无需常驻服务。
 *
 * 重要约定：
 *   - 所有日志只写 stderr / 日志文件，绝不写 stdout（stdout 是 JSON-RPC 通道）。
 *   - 浏览器默认 headless:false，需要使用者本机带桌面环境，并各自登录自己的 mxai.cn 账号。
 *   - 环境变量可覆盖：MXAI_URL / MXAI_HEADLESS / MXAI_PROFILE
 *
 * 安全边界（与 REST 版一致）：
 *   - 本地只读自动化，不绕过验证码/风控；生成是付费动作，由调用方（人）授权。
 *   - 不存储凭据，登录态保存在本机 .browser-profile。
 */

const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// 关键：stdout 是 MCP 的 JSON-RPC 通道，任何 console.log 都会破坏协议。
// 适配器内部大量使用 console.log，必须在其加载前重定向到 stderr。
const _mcpStderr = (...args) => {
  process.stderr.write(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n');
};
console.log = _mcpStderr;
console.error = _mcpStderr;

const MxaiAdapter = require('./mxai_adapter.js');

const RESULTS_DIR = path.join(__dirname, '.automation', 'results');
const LOG_FILE = path.join(__dirname, '.automation', 'mcp-server.log');

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`;
  try { fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true }); fs.appendFileSync(LOG_FILE, line); } catch (_) { /* ignore */ }
  process.stderr.write(line);
}

// 单例适配器
let adapter = null;
function getAdapter() {
  if (!adapter) adapter = new MxaiAdapter({});
  return adapter;
}
async function ensureStarted() {
  const a = getAdapter();
  if (!a.page) {
    await a.launch();
    await a.navigate();
  }
  return a;
}

function ok(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}
function fail(message, extra = {}) {
  return { content: [{ type: 'text', text: JSON.stringify({ ok: false, error: message, ...extra }, null, 2) }], isError: true };
}

const server = new McpServer({
  name: 'mxai-rpa',
  version: '1.0.0',
});

// 启动浏览器并进入生图页（含弹窗清理）
server.registerTool('mxai_start', {
  description: '启动 Edge 浏览器并导航到 MXAI 生图页，自动清理广告/签到弹窗。返回是否已登录（loggedIn）。未登录时请在弹出的浏览器窗口中手动登录。',
  inputSchema: z.object({}),
}, async () => {
  try {
    const a = getAdapter();
    await a.launch();
    await a.navigate();
    const loggedIn = await a.isLoggedIn();
    return ok({ ok: true, running: true, loggedIn, note: loggedIn ? '已登录，可直接生成' : '未登录，请在浏览器窗口手动登录后重试' });
  } catch (e) {
    return fail(e.message);
  }
});

// 返回当前状态
server.registerTool('mxai_status', {
  description: '返回浏览器运行状态与登录状态。',
  inputSchema: z.object({}),
}, async () => {
  const a = getAdapter();
  const running = !!a.page;
  let loggedIn = false;
  if (running) { try { loggedIn = await a.isLoggedIn(); } catch (_) { loggedIn = false; } }
  return ok({ ok: true, running, loggedIn });
});

// 关闭浏览器
server.registerTool('mxai_close', {
  description: '关闭浏览器并释放资源。',
  inputSchema: z.object({}),
}, async () => {
  try {
    if (adapter) { await adapter.close(); adapter = null; }
    return ok({ ok: true, note: '浏览器已关闭' });
  } catch (e) {
    return fail(e.message);
  }
});

// 关闭广告弹窗
server.registerTool('mxai_dismiss', {
  description: '主动关闭页面上残留的广告/活动/签到弹窗。可在任意时刻调用。',
  inputSchema: z.object({}),
}, async () => {
  try {
    const a = await ensureStarted();
    const r = await a.dismissAds();
    return ok({ ok: true, ...r });
  } catch (e) {
    return fail(e.message);
  }
});

// 页面诊断
server.registerTool('mxai_diag', {
  description: '输出当前页面 DOM 关键信息（记录容器、图片 src、弹窗候选、按钮），用于排查页面结构变化。',
  inputSchema: z.object({}),
}, async () => {
  try {
    const a = await ensureStarted();
    const diag = await a.diagnose();
    return ok({ ok: true, ...diag });
  } catch (e) {
    return fail(e.message);
  }
});

// 生成（含自动下载高清原图）
server.registerTool('mxai_generate', {
  description: '完整生图流程：填提示词→选参数→点生成→轮询等待→下载高清原图。生成是付费动作，调用即代表已获授权。返回 success 与下载的文件路径。',
  inputSchema: {
    prompt: z.string().describe('MJ 提示词（可含 --v 8.2 --ar 9:16 --stylize 250 等参数）'),
    task_id: z.string().optional().nullable().describe('任务ID，用作结果文件名前缀（如 MJ_01）'),
    version: z.string().optional().nullable().describe('模型版本，默认 v8.2'),
    aspect: z.string().optional().nullable().describe('生成尺寸，如 9:16 / 1:1 / 16:9，默认 9:16'),
    mode: z.string().optional().nullable().describe('模式 normal / fast，默认 normal'),
    timeout: z.number().optional().nullable().describe('等待生成完成的超时毫秒数，默认 240000'),
  },
}, async ({ prompt, task_id, version, aspect, mode, timeout }) => {
  if (!prompt || !String(prompt).trim()) return fail('prompt 不能为空');
  try {
    const a = await ensureStarted();
    const loggedIn = await a.isLoggedIn();
    if (!loggedIn) return fail('MXAI 未登录，请在浏览器窗口手动登录后重试', { needLogin: true });
    const result = await a.generate(prompt, {
      version: version || 'v8.2',
      aspect: aspect || '9:16',
      mode: mode || 'normal',
      outputDir: RESULTS_DIR,
      filePrefix: task_id || `mxai_${Date.now()}`,
      timeout: timeout || 240000,
    });
    return ok({ ok: result.success, ...result });
  } catch (e) {
    return fail(e.message);
  }
});

// 下载最新结果（页面下载按钮 → 高清原图）
server.registerTool('mxai_download_latest', {
  description: '下载最新一条生成结果。默认 via=button：通过页面下载/预览逻辑获取高清原图（1856x2464 整图）；via=url 退回 URL 抓取（仅缩略图）。结果保存到 .automation/results。',
  inputSchema: {
    task_id: z.string().optional().nullable().describe('任务ID，用作结果文件名前缀，默认 latest'),
    via: z.string().optional().nullable().describe('button（高清，默认）或 url（缩略图兜底）'),
    timeout: z.number().optional().nullable().describe('等待下载事件超时毫秒数，默认 30000'),
  },
}, async ({ task_id, via, timeout }) => {
  try {
    const a = await ensureStarted();
    const prefix = task_id || 'latest';
    if (via === 'url') {
      const files = await a.downloadLatest(RESULTS_DIR, prefix);
      return ok({ ok: files.length > 0, files, note: 'URL 抓取（仅缩略图）' });
    }
    const r = await a.downloadLatestViaButton(RESULTS_DIR, prefix, timeout || 30000);
    return ok({ ok: !!(r.success || (r.downloaded && r.downloaded.length)), ...r });
  } catch (e) {
    return fail(e.message);
  }
});

// 仅打印，避免调试信息串入 stdout
log('mxai_mcp_server 初始化完成，等待客户端连接（stdio）');

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('MCP server connected over stdio');
}

main().catch((e) => {
  log('FATAL', e && e.message);
  process.exit(1);
});

// 优雅退出
process.on('SIGINT', async () => {
  log('收到 SIGINT，关闭浏览器...');
  try { if (adapter) await adapter.close(); } catch (_) { /* ignore */ }
  process.exit(0);
});
process.on('SIGTERM', async () => {
  log('收到 SIGTERM，关闭浏览器...');
  try { if (adapter) await adapter.close(); } catch (_) { /* ignore */ }
  process.exit(0);
});
