/**
 * 浏览器端核心流程冒烟。
 *
 * 在真实构建产物（`next start`）上验证「打开 → 登录 → 收藏 → 运行记录」这条最短用户
 * 路径没有崩溃，补上单元测试和接口测试都覆盖不到的渲染层问题。
 *
 * 跑两轮：
 *   - 桌面视口（1280×900）：完整核心路径，含登录与登录后的页面。
 *   - 移动视口（390×844）：确认主导航按屏宽收敛后，核心入口仍然可达——
 *     底部 Tab 栏在位、抽屉菜单能打开并包含三类内容入口、页面没有横向溢出。
 *
 * 三种退出形态见 `scripts/lib/preview-server.mjs`。
 *
 * 环境变量：
 *   SMOKE_MODE=require         缺少前置条件时直接失败（CI 用），默认 auto 表示跳过。
 *   SMOKE_PORT                 临时服务端口，默认 3100。
 *   SMOKE_DATABASE_URL         本次冒烟使用的数据库，默认复用 DATABASE_URL。
 *   PUPPETEER_EXECUTABLE_PATH  指定浏览器可执行文件。
 */
import {
  NOISE,
  SEED_EMAIL,
  SEED_PASSWORD,
  createReporter,
  readMode,
  registrationConfigured,
  withPreview,
} from "./lib/preview-server.mjs";

const MODE = readMode("SMOKE_MODE");
const reporter = createReporter("smoke", MODE, "SMOKE_MODE");

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/** 允许 1px 的亚像素误差，超过才算真实横向溢出。 */
const OVERFLOW_TOLERANCE = 1;

/**
 * 把页面的异常采集挂到某个 page 上。桌面轮和移动轮各挂一次，
 * 问题列表分开统计，避免一处的噪声掩盖另一处。
 */
function attachProblemCollectors(page) {
  const problems = [];
  page.on("pageerror", error => problems.push(`未捕获异常：${error.message}`));
  page.on("console", message => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (NOISE.some(noise => text.includes(noise))) return;
    problems.push(`控制台报错：${text}`);
  });
  page.on("response", response => {
    if (response.status() < 500) return;
    const url = response.url();
    // 注册未配置时该端点按设计返回 503（fail-closed），页面应显示提示而不是崩溃。
    if (!registrationConfigured() && url.includes("/api/auth/register/config")) return;
    problems.push(`HTTP ${response.status()}：${url}`);
  });
  return problems;
}

/** 访问一个页面并断言状态码与可选文案，同时记录该页新产生的异常。 */
async function makeVisitor(page, baseUrl, problems, checks) {
  return async function visit(pathname, label, expect) {
    const before = problems.length;
    const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const status = response?.status() ?? 0;
    let matched = status >= 200 && status < 400;
    if (!matched) {
      problems.push(`${pathname} 返回 HTTP ${status}`);
    } else if (expect) {
      try {
        await page.waitForFunction(text => document.body.innerText.includes(text), { timeout: 15_000 }, expect);
      } catch {
        matched = false;
        problems.push(`${pathname} 未渲染预期文案「${expect}」`);
      }
    }
    // 等页面把水合后的请求发完，避免下一次整页跳转把它们掐断。
    await page.waitForNetworkIdle({ idleTime: 600, timeout: 10_000 }).catch(() => null);
    checks.push({ label, pathname, status, matched, newProblems: problems.length - before });
  };
}

/** 用邮箱密码登录，返回是否离开了登录页。 */
async function login(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForSelector("input[type=email]", { timeout: 15_000 });
  await page.type("input[type=email]", SEED_EMAIL, { delay: 10 });
  await page.type("input[type=password]", SEED_PASSWORD, { delay: 10 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => null),
    page.click("button[type=submit]"),
  ]);
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 20_000 }).catch(() => null);
  // 登录后页面会继续拉取会话与通知；等网络安静下来再跳转，
  // 否则下一步的整页导航会把未完成的请求掐断，制造假的失败。
  await page.waitForNetworkIdle({ idleTime: 800, timeout: 15_000 }).catch(() => null);
  return !new URL(page.url()).pathname.startsWith("/login");
}

/** 横向溢出：文档宽度超过视口宽度即为缺陷（移动端最常见的渲染问题）。 */
async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const widest = Math.max(doc.scrollWidth, document.body.scrollWidth);
    return { viewport: window.innerWidth, widest, overflow: widest - window.innerWidth };
  });
}

async function runDesktop(page, { baseUrl, seed }, checks, problems) {
  await page.setViewport(DESKTOP);
  const pageProblems = [];
  const visit = await makeVisitor(page, baseUrl, pageProblems, checks);

  await visit("/", "首页");
  await visit("/prompts", "提示词广场");
  await visit("/templates", "模板广场");
  await visit("/workflows", "工作流广场", "工作流");
  await visit("/login", "登录页");
  await visit("/register", "注册页");
  if (!registrationConfigured()) {
    // 注册依赖 Turnstile 与邮件服务；未配置时必须明确告知用户，而不是静默失败。
    const alert = await page.$eval("p[role=alert]", node => node.textContent?.trim() ?? "").catch(() => "");
    const explained = alert.includes("注册服务");
    checks.push({ label: "注册未配置提示", pathname: "/register", status: 200, matched: explained, newProblems: 0 });
    if (!explained) pageProblems.push(`注册页未提示服务未配置（实际提示：${alert || "无"}）`);
  }

  if (seed.created) {
    const loggedIn = await login(page, baseUrl);
    checks.push({ label: "登录", pathname: "/login", status: 200, matched: loggedIn, newProblems: 0 });
    if (!loggedIn) pageProblems.push("登录失败：提交后仍停留在 /login");
    if (loggedIn) {
      await visit("/collection", "我的收藏", "我的收藏");
      await visit("/workflows/runs", "运行记录", "运行记录");
      await visit("/settings", "账户设置");
    }
  } else {
    await visit("/collection", "我的收藏（未登录）");
  }

  problems.push(...pageProblems);
}

async function runMobile(page, { baseUrl, seed }, checks, problems) {
  // 复用同一个 page 只切换视口：登录 Cookie 天然延续，且问题采集器不必重挂。
  await page.setViewport(MOBILE);
  const pageProblems = [];
  const visit = await makeVisitor(page, baseUrl, pageProblems, checks);

  const MOBILE_PAGES = [
    ["/", "移动端 首页"],
    ["/prompts", "移动端 提示词广场"],
    ["/templates", "移动端 模板广场"],
    ["/workflows", "移动端 工作流广场"],
    ["/login", "移动端 登录页"],
  ];
  if (seed.created) MOBILE_PAGES.push(["/collection", "移动端 我的收藏"]);

  for (const [pathname, label] of MOBILE_PAGES) {
    await visit(pathname, label);
    const overflow = await measureOverflow(page);
    const ok = overflow.overflow <= OVERFLOW_TOLERANCE;
    checks.push({
      label: `${label} 无横向溢出`,
      pathname,
      status: 200,
      matched: ok,
      newProblems: 0,
    });
    if (!ok) pageProblems.push(`${pathname} 横向溢出 ${overflow.overflow}px（文档 ${overflow.widest}px / 视口 ${overflow.viewport}px）`);
  }

  // 底部 Tab 栏是移动端（含 WebView 封装的 APK）唯一常驻导航，缺失等于主流程断掉。
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 10_000 }).catch(() => null);
  const tabs = await page.evaluate(() => {
    const bar = document.querySelector("nav.fixed.bottom-0");
    if (!bar) return { found: false, hrefs: [] };
    const style = getComputedStyle(bar);
    const visible = style.display !== "none" && style.visibility !== "hidden" && bar.getBoundingClientRect().height > 0;
    return {
      found: visible,
      hrefs: [...bar.querySelectorAll("a")].map(a => new URL(a.href).pathname),
    };
  });
  // 权威架构（docs/ANS平台方向与落地路线图.md）：移动端底部常驻三项主入口
  // 「开始学习 / 动手实践 / 我的成果」+ 账户入口，共 4 个链接。
  const tabOk = tabs.found && tabs.hrefs.length === 4;
  checks.push({ label: "移动端底部 Tab 栏", pathname: "/", status: 200, matched: tabOk, newProblems: 0 });
  if (!tabOk) pageProblems.push(`移动端底部 Tab 栏异常（可见=${tabs.found}，链接=${tabs.hrefs.join(",") || "无"}）`);

  // 窄屏下 /templates 与 /workflows 被收进抽屉菜单，必须能在两步内到达。
  const collapsed = await page.evaluate(() =>
    [...document.querySelectorAll("header a")].filter(a => ["/templates", "/workflows"].includes(new URL(a.href).pathname) && a.offsetParent).length);
  checks.push({ label: "移动端 主导航按屏宽收敛", pathname: "/", status: 200, matched: collapsed === 0, newProblems: 0 });
  if (collapsed !== 0) pageProblems.push(`移动端顶栏仍直接展示 ${collapsed} 个宽屏入口，未收敛`);

  const opened = await page.evaluate(() => {
    const trigger = [...document.querySelectorAll("header button")]
      .find(button => button.textContent?.includes("Toggle menu") || button.getAttribute("aria-label")?.includes("menu"));
    if (!trigger) return false;
    trigger.click();
    return true;
  });
  let drawerHrefs = [];
  if (opened) {
    await page.waitForSelector("[role=dialog]", { timeout: 10_000 }).catch(() => null);
    drawerHrefs = await page.evaluate(() =>
      [...document.querySelectorAll("[role=dialog] a")].map(a => new URL(a.href).pathname));
  }
  const reachable = ["/templates", "/workflows", "/prompts"].every(href => drawerHrefs.includes(href));
  checks.push({ label: "移动端 抽屉菜单可达核心入口", pathname: "/", status: 200, matched: opened && reachable, newProblems: 0 });
  if (!opened) pageProblems.push("移动端未找到抽屉菜单触发按钮");
  else if (!reachable) pageProblems.push(`移动端抽屉菜单缺少核心入口（实际：${drawerHrefs.join(",") || "无"}）`);

  problems.push(...pageProblems);
}

async function main() {
  const checks = [];
  const problems = [];
  await withPreview(
    { mode: MODE, requireMode: "SMOKE_MODE", reporter },
    async context => {
      const page = await context.browser.newPage();
      // 采集器挂在整轮生命周期的 page 上；两轮共用，退出前统一关闭。
      const pageProblems = attachProblemCollectors(page);
      await runDesktop(page, context, checks, pageProblems);
      await runMobile(page, context, checks, pageProblems);
      problems.push(...pageProblems);
      await page.close();
    },
  );

  if (!checks.length) return;
  for (const check of checks) {
    console.log(`[smoke] ${check.matched ? "PASS" : "FAIL"}  ${check.label}  ${check.pathname}  HTTP ${check.status}`);
  }

  const failures = checks.filter(check => !check.matched).length + problems.length;
  if (problems.length) {
    const grouped = new Map();
    for (const problem of problems) grouped.set(problem, (grouped.get(problem) ?? 0) + 1);
    for (const [problem, count] of grouped) console.error(`[smoke] ${problem}${count > 1 ? `（${count} 次）` : ""}`);
  }
  if (failures) reporter.fail(`${failures} 项检查未通过`);
  else console.log(`[smoke] ${checks.length} 项检查通过（桌面 + 移动视口）`);
}

await main().catch(error => {
  reporter.fail(error instanceof Error ? error.stack ?? error.message : String(error));
});
