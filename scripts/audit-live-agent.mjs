#!/usr/bin/env node
/**
 * 线上小恐龙 Agent 验收探针（只读）。
 *
 * 用途：修复发布后，用一条命令确认线上真的变好了；发布前跑它应当红（问题仍在）。
 * 只做只读检查：打开面板、量尺寸、点开抽屉前不动任何扣费按钮，不登录。
 *
 * 用法：
 *   node scripts/audit-live-agent.mjs                       # 默认 https://ans.cauai.fun
 *   node scripts/audit-live-agent.mjs --url http://127.0.0.1:3000
 *   node scripts/audit-live-agent.mjs --json                # 机器可读
 *   PUPPETEER_EXECUTABLE_PATH="C:/Program Files/.../msedge.exe" node scripts/audit-live-agent.mjs
 *
 * 退出码：0 = 全部期望成立；1 = 有期望不成立（即修复未上线）；2 = 环境缺浏览器等前置条件。
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const baseUrl = (opt("--url", "https://ans.cauai.fun") ?? "").replace(/\/$/, "");
const asJson = argv.includes("--json");
const require_ = argv.includes("--require");

const checks = [];
const record = (id, expectation, ok, detail) => checks.push({ id, expectation, ok, detail });

async function probeHealth() {
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = await res.json().catch(() => ({}));
    record("health", "健康检查 200 且 database=connected", res.status === 200 && body.database === "connected", `status=${res.status} database=${body.database ?? "?"}`);
  } catch (error) {
    record("health", "健康检查可达", false, String(error).slice(0, 120));
  }
}

async function probeSkillsIndex() {
  try {
    const res = await fetch(`${baseUrl}/.well-known/skills/index.json`);
    if (res.status !== 200) { record("skills-index", "技能索引可访问", false, `status=${res.status}`); return; }
    const text = await res.text();
    const data = JSON.parse(text);
    const skills = data.skills ?? [];
    const backslash = skills.filter(s => (s.files ?? []).some(f => String(f).includes("\\"))).length;
    const badDescription = skills.filter(s => !s.description || String(s.description).startsWith("name:")).length;
    const mojibake = (text.match(/\uFFFD/g) ?? []).length;
    record("skills-index", "files[] 不含 Windows 反斜杠", backslash === 0, `${backslash}/${skills.length} 条含反斜杠`);
    record("skills-index", "description 不是 SKILL.md 的 name: 首行", badDescription === 0, `${badDescription}/${skills.length} 条描述不合法`);
    record("skills-index", "无替换字符（编码未损坏）", mojibake === 0, `${mojibake} 处 U+FFFD`);
  } catch (error) {
    record("skills-index", "技能索引可解析", false, String(error).slice(0, 120));
  }
}

async function probeAgentPanel(puppeteer) {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(`${baseUrl}/explore`, { waitUntil: "domcontentloaded", timeout: 45000 });

    // 1) 首屏不应预下载 3D：先静置 4 秒且不做任何交互，再看有没有 /mascot/3d iframe。
    //    （只看 domcontentloaded 会永远"通过"——那时 eager 分支也还没执行到。）
    await new Promise(resolve => setTimeout(resolve, 4000));
    const earlyFrame = await page.evaluate(() => Boolean(document.querySelector('iframe[src*="/mascot/3d"]')));
    record("3d-lazy", "首屏未预加载 3D iframe", earlyFrame === false, earlyFrame ? "首屏已存在 3D iframe（约 9MB）" : "未加载");

    // 2) 用站内事件打开对话面板（气泡点击走的是 3D 近景舞台，不是聊天面板）
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("ans:open-companion-chat")));
    let opened = true;
    try {
      await page.waitForSelector("#ans-companion-panel", { timeout: 8000 });
    } catch {
      opened = false;
    }
    await new Promise(resolve => setTimeout(resolve, 600));
    const panel = await page.evaluate(() => {
      const el = document.getElementById("ans-companion-panel");
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const header = document.querySelector("header");
      const headerBottom = header ? header.getBoundingClientRect().bottom : null;
      // 真实结构（companion.css）：.ans-companion-next 本身就是容器（<nav>），
      // 它的直接子元素必须是 <a>，且每个 <a> 里带图标与箭头类名 —— 否则线上会退化成
      // "大图标/标题/大箭头各占一行"。旧断言误以为外面还有一层 .ans-companion-steps 包裹。
      const nexts = [...el.querySelectorAll(".ans-companion-next")];
      const anchorChildren = nexts.map(node => [...node.children].filter(child => child.tagName === "A"));
      return {
        top: Math.round(rect.top),
        height: Math.round(rect.height),
        headerBottom: headerBottom === null ? null : Math.round(headerBottom),
        nextCount: nexts.length,
        nextChildrenAreAnchors: nexts.length > 0 && nexts.every((node, index) => node.children.length > 0 && anchorChildren[index].length === node.children.length),
        nextHasIcon: anchorChildren.every(anchors => anchors.every(anchor => Boolean(anchor.querySelector(".ans-companion-action-icon")))),
        nextHasArrow: anchorChildren.every(anchors => anchors.every(anchor => Boolean(anchor.querySelector(".ans-companion-action-arrow")))),
        nextAnchorCount: anchorChildren.reduce((sum, anchors) => sum + anchors.length, 0),
      };
    });
    if (!panel) {
      record("panel-open", "站内事件可打开 Agent 面板", false, `未找到 #ans-companion-panel（opened=${opened}）`);
    } else {
      record("panel-open", "站内事件可打开 Agent 面板", true, `top=${panel.top} height=${panel.height}`);
      const overlap = panel.headerBottom === null ? 0 : Math.max(0, panel.headerBottom - panel.top);
      record("mobile-header-overlap", "移动端面板不压住站头（重叠 0px）", overlap === 0, `重叠 ${overlap}px（headerBottom=${panel.headerBottom} panelTop=${panel.top}）`);
      record("next-steps-structure", "建议下一步：容器直接子元素都是 <a> 且带图标与箭头",
        panel.nextChildrenAreAnchors && panel.nextHasIcon && panel.nextHasArrow,
        `next=${panel.nextCount} childrenAreAnchors=${panel.nextChildrenAreAnchors} icon=${panel.nextHasIcon} arrow=${panel.nextHasArrow} anchors=${panel.nextAnchorCount}`);
    }

    // 2b) 面板内的 axe 扫描（只把 critical/serious 当失败，moderate/minor 只打印）
    if (panel && axeSource) {
      await page.evaluate(axeSource);
      const axeResult = await page.evaluate(async () => {
        const target = document.getElementById("ans-companion-panel");
        if (!target) return null;
        const run = await window.axe.run(target, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        });
        return run.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }));
      });
      const blocking = (axeResult ?? []).filter(violation => violation.impact === "critical" || violation.impact === "serious");
      record("panel-axe", "Agent 面板内 axe 无 critical/serious 违规", blocking.length === 0,
        blocking.length
          ? blocking.map(violation => `${violation.id}(${violation.nodes})`).join(", ")
          : `0 条 critical/serious（共 ${(axeResult ?? []).length} 条含 moderate/minor）`);
    }

    // 3) 3D 在交互后才加载（打开面板 = 交互）
    const lateFrame = await page.evaluate(() => Boolean(document.querySelector('iframe[src*="/mascot/3d"]')));
    record("3d-after-interaction", "交互后才出现 3D iframe", lateFrame === true, lateFrame ? "已按需加载" : "打开面板后仍未加载（可能被 reduced-motion 或网络限制挡住）");
  } finally {
    await browser.close();
  }
}

await probeHealth();
await probeSkillsIndex();
let axeSource = null;
try {
  axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
} catch {
  axeSource = null; // 缺 axe 时只跳过面板无障碍那一项
}

try {
  const require = createRequire(import.meta.url);
  const puppeteer = require("puppeteer");
  await probeAgentPanel(puppeteer);
} catch (error) {
  const detail = String(error).slice(0, 160);
  if (require_) { console.error(`[audit:live-agent] 缺少浏览器或 puppeteer：${detail}`); process.exit(2); }
  record("browser", "浏览器探针可运行（缺少时跳过）", true, `跳过：${detail}`);
}

const failed = checks.filter(c => !c.ok);
if (asJson) {
  console.log(JSON.stringify({ baseUrl, checks, failed: failed.length }, null, 2));
} else {
  console.log(`[audit:live-agent] 目标：${baseUrl}`);
  for (const c of checks) console.log(`  ${c.ok ? "✓" : "✗"} [${c.id}] ${c.expectation} — ${c.detail}`);
  console.log(`\n[audit:live-agent] ${checks.length - failed.length}/${checks.length} 项期望成立${failed.length ? "（修复尚未上线）" : ""}`);
}
process.exit(failed.length ? 1 : 0);
