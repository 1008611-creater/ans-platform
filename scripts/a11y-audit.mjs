/**
 * 可访问性门禁。
 *
 * 在真实构建产物（`next start`）上用 axe-core 扫描关键页面，把「自动化能发现」
 * 的那部分无障碍缺陷挡在发布前：缺可访问名的按钮、对比度不足、跳级标题、
 * 重复的主区域地标等。这些缺陷在单元测试和接口测试里都不可见。
 *
 * 判定口径：
 *   - `critical` / `serious` 违规数必须为 0，否则门禁失败。
 *   - `moderate` / `minor` 只打印出来供人工判断，不阻塞发布。axe 在这两档里有
 *     相当比例的规则带主观性（例如地标命名习惯），一刀切成失败会让门禁失去
 *     参考价值。
 *
 * 三种退出形态见 `scripts/lib/preview-server.mjs`。
 *
 * 环境变量：
 *   A11Y_MODE=require          缺少前置条件时直接失败（CI 用），默认 auto 表示跳过。
 *   A11Y_PORT                  临时服务端口，默认 3200（避开冒烟占用的 3100）。
 *   SMOKE_DATABASE_URL         本次扫描使用的数据库，默认复用 DATABASE_URL。
 *   PUPPETEER_EXECUTABLE_PATH  指定浏览器可执行文件。
 *
 * 扫描前会写入固定规模的探针内容（见 `scripts/lib/probe-fixture.mjs`），
 * 否则列表页没有卡片，卡片内部的缺陷扫不到。
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  SEED_EMAIL,
  SEED_PASSWORD,
  createReporter,
  readMode,
  registrationConfigured,
  withPreview,
} from "./lib/preview-server.mjs";
import { FIXTURE_PROMPTS, seedProbeFixture } from "./lib/probe-fixture.mjs";

const MODE = readMode("A11Y_MODE");
const reporter = createReporter("a11y", MODE, "A11Y_MODE");

const BLOCKING = new Set(["critical", "serious"]);

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/**
 * 未登录即可访问的页面：覆盖发现、三类内容、身份入口。
 *
 * `expectText` 是「这个页面真的渲染出内容了」的断言。列表页尤其需要它：
 * 卡片为空时页面上没有卡片，卡片内部的缺陷一个都扫不到，门禁会「全绿但
 * 什么都没测到」。扫描前会写入固定规模的探针数据，这里再确认它确实上了屏。
 */
const PUBLIC_PAGES = [
  ["/", "首页", "学会一个 AI 方法，做出一份自己的成果"],
  ["/prompts", "提示词广场", "提示词"],
  ["/templates", "模板广场", "模板"],
  ["/workflows", "工作流广场", "工作流"],
  ["/login", "登录页", null],
];

/** 需要登录的页面：只有拿到冒烟账号时才会被扫描。 */
const PRIVATE_PAGES = [
  ["/collection", "我的收藏", null],
  ["/workflows/runs", "运行记录", null],
  ["/settings", "账户设置", null],
];

/** 移动视口只扫最容易暴露问题的三个入口，避免门禁时间翻倍。 */
const MOBILE_PAGES = [
  ["/", "移动端 首页", "学会一个 AI 方法，做出一份自己的成果"],
  ["/prompts", "移动端 提示词广场", "提示词"],
  ["/workflows", "移动端 工作流广场", "工作流"],
];

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

/** 等页面把水合后的请求发完，避免扫描到骨架屏。 */
async function settle(page) {
  await page.waitForNetworkIdle({ idleTime: 600, timeout: 10_000 }).catch(() => null);
}

async function audit(page, axeSource, pathname) {
  await page.evaluate(axeSource);
  return page.evaluate(async (tags) => {
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: tags },
    });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      count: violation.nodes.length,
      samples: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
    }));
  }, AXE_TAGS);
}

/**
 * 同一份 axe 规则会把「同一类问题」按页面聚合上报，这里按规则 id 汇总，
 * 输出「哪个规则在哪些页面出现了多少次」，比逐页流水账更容易定位。
 */
function accumulate(store, pathname, violations) {
  for (const violation of violations) {
    const key = `${violation.impact}|${violation.id}`;
    const entry = store.get(key) ?? { impact: violation.impact, id: violation.id, help: violation.help, count: 0, pages: [] };
    entry.count += violation.count;
    entry.pages.push(`${pathname}×${violation.count}`);
    store.set(key, entry);
  }
}

async function scanPage(page, axeSource, store, failures, baseUrl, pathname, label, expectText) {
  const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const status = response?.status() ?? 0;
  if (status < 200 || status >= 400) {
    failures.push(`${label} ${pathname} 返回 HTTP ${status}`);
    return;
  }
  await settle(page);
  if (expectText) {
    // 页面没渲染出预期内容时，扫描结果没有意义（可能扫的是错误页）。
    const rendered = await page
      .waitForFunction((text) => document.body.innerText.includes(text), { timeout: 15_000 }, expectText)
      .then(() => true)
      .catch(() => false);
    if (!rendered) failures.push(`${label} ${pathname} 未渲染预期文案「${expectText}」`);
  }
  const violations = await audit(page, axeSource, pathname);
  accumulate(store, pathname, violations);
  const blocking = violations.filter((violation) => BLOCKING.has(violation.impact));
  for (const violation of blocking) {
    failures.push(`${label} ${pathname}：${violation.impact} ${violation.id} ×${violation.count}（${violation.help}）`);
    for (const sample of violation.samples) reporter.error(`      ${sample}`);
  }
  const detail = violations.length
    ? violations.map((violation) => `${violation.impact}:${violation.id}×${violation.count}`).join(", ")
    : "无违规";
  reporter.info(`${label} ${pathname} — ${detail}`);
}

async function login(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForSelector("input[type=email]", { timeout: 15_000 });
  await page.type("input[type=email]", SEED_EMAIL, { delay: 10 });
  await page.type("input[type=password]", SEED_PASSWORD, { delay: 10 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => null),
    page.keyboard.press("Enter"),
  ]);
  await settle(page);
  return !page.url().includes("/login");
}

async function main() {
  const store = new Map();
  const failures = [];
  let scanned = 0;

  await withPreview(
    { mode: MODE, requireMode: "A11Y_MODE", reporter, port: Number(process.env.A11Y_PORT || 3200) },
    async ({ browser, baseUrl, databaseUrl, seed }) => {
      // 扫描前先种固定规模的探针内容：列表为空时卡片上的缺陷扫不到，
      // 「全绿」会变成假绿。
      const fixture = await seedProbeFixture(databaseUrl);
      // 种不进去（例如日常开发库，脚本按约定不往里写数据）时仍然继续扫描，
      // 但关掉「列表已渲染内容」这层断言并明确说明——否则页面是空的也照样
      // 报「无违规」，读数会偏乐观。CI 用 require 时不允许这种降级。
      const assertContent = fixture.seeded;
      if (assertContent) {
        reporter.info(`探针数据：${FIXTURE_PROMPTS} 条提示词（含模板与工作流），保证列表页真的渲染出卡片`);
      } else if (MODE === "require") {
        reporter.fail(`未建立探针数据：${fixture.reason}`);
        return;
      } else {
        reporter.info(
          `未建立探针数据（${fixture.reason}）；本次不校验「列表已渲染内容」，扫描结果可能偏乐观`,
        );
      }

      const page = await browser.newPage();

      await page.setViewport(DESKTOP);
      for (const [pathname, label, expectText] of PUBLIC_PAGES) {
        await scanPage(page, axeSource, store, failures, baseUrl, pathname, label, assertContent ? expectText : null);
        scanned += 1;
      }

      if (seed.created) {
        const loggedIn = await login(page, baseUrl);
        if (!loggedIn) {
          failures.push("登录失败，登录后页面未纳入扫描");
        } else {
          for (const [pathname, label, expectText] of PRIVATE_PAGES) {
            await scanPage(page, axeSource, store, failures, baseUrl, pathname, label, assertContent ? expectText : null);
            scanned += 1;
          }
        }
      } else {
        reporter.info("未获得冒烟账号，跳过登录后页面（收藏 / 运行记录 / 账户设置）");
      }

      await page.setViewport(MOBILE);
      for (const [pathname, label, expectText] of MOBILE_PAGES) {
        await scanPage(page, axeSource, store, failures, baseUrl, pathname, label, assertContent ? expectText : null);
        scanned += 1;
      }

      await page.close();
    },
  );

  if (!scanned) return;

  console.log("\n[a11y] 规则汇总（按影响程度排序）");
  const ordered = [...store.values()].sort((a, b) => {
    const rank = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    return (rank[a.impact] ?? 9) - (rank[b.impact] ?? 9) || b.count - a.count;
  });
  for (const entry of ordered) {
    const blocking = BLOCKING.has(entry.impact) ? "阻断" : "提示";
    console.log(`  [${blocking}] ${entry.impact} ${entry.id} ×${entry.count} — ${entry.help}`);
    console.log(`          ${entry.pages.join(", ")}`);
  }
  if (!ordered.length) console.log("  （无违规）");

  const blockingTotal = ordered.filter((entry) => BLOCKING.has(entry.impact)).reduce((sum, entry) => sum + entry.count, 0);
  if (failures.length) {
    for (const failure of failures) reporter.error(failure);
    reporter.fail(`${failures.length} 处阻断级问题（critical/serious）需要修复`);
    return;
  }
  if (blockingTotal > 0) {
    reporter.fail(`阻断级违规 ${blockingTotal} 处未记录在失败明细中`);
    return;
  }
  reporter.info(`${scanned} 个页面扫描完成，critical/serious 违规为 0`);
}

await main().catch((error) => {
  console.error(`[a11y] 执行失败：${error?.stack || error}`);
  process.exitCode = 1;
});
