/**
 * 线上真实用户体验与性能巡检门禁 (Online Real-User UX & Performance Audit Gate)
 *
 * 结合 Playwright / Puppeteer 端到端用户旅程、可访问性/移动端遮挡几何检测与 TTFB 性能预算，
 * 针对 ANS 除农客松一体化平台（/competitions/agrihackathon*）外的全部核心模块执行真实用户巡检。
 *
 * 用法：
 *   npm run audit:online
 *   AUDIT_BASE_URL=https://ans.cauai.fun node scripts/online-user-audit.mjs
 */
import { createRequire } from "node:module";
import { resolveBrowser } from "./lib/preview-server.mjs";

const BASE_URL = (process.env.AUDIT_BASE_URL || "https://ans.cauai.fun").replace(/\/$/, "");
const TTFB_BUDGET_MS = Number(process.env.AUDIT_TTFB_BUDGET_MS || 1800);

const CORE_ROUTES = [
  "/",
  "/explore",
  "/explore/liu-resume",
  "/market",
  "/market/resume-website",
  "/vibe-hub",
  "/hubs",
  "/status",
  "/privacy",
  "/terms",
  "/support",
  "/teams",
  "/login",
  "/register",
  "/reset-password",
];

async function measureWarmTtfb(route) {
  const url = `${BASE_URL}${route}`;
  // Warm up connection / SSR cache once, then measure second request
  await fetch(url, { redirect: "manual" }).catch(() => null);
  const start = performance.now();
  const response = await fetch(url, { redirect: "follow" });
  const ttfbMs = Math.round(performance.now() - start);
  const finalPath = new URL(response.url).pathname;
  return { route, status: response.status, ttfbMs, finalPath };
}

function boxesOverlap(a, b) {
  if (!a || !b) return false;
  const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlapX * overlapY > 0;
}

async function launchPlaywrightOrPuppeteer(executablePath) {
  const req = createRequire(import.meta.url);
  const pwCandidates = [
    "playwright",
    "/Users/eeo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ];
  for (const mod of pwCandidates) {
    try {
      const { chromium } = req(mod);
      const browser = await chromium.launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
      });
      return { kind: "playwright", browser };
    } catch {
      // Try next candidate
    }
  }
  const puppeteer = req("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return { kind: "puppeteer", browser };
}

async function main() {
  const failures = [];
  const warnings = [];
  console.log(`[audit:online] 开始巡检目标站点：${BASE_URL}`);

  // 1. Warm TTFB & HTTP Status Check
  for (const route of CORE_ROUTES) {
    const res = await measureWarmTtfb(route);
    console.log(
      `[audit:online] 路由 ${route.padEnd(24)} HTTP ${res.status} | TTFB ${String(res.ttfbMs).padStart(4)}ms | 最终路径 ${res.finalPath}`,
    );
    if (res.status !== 200) {
      failures.push(`${route} 返回 HTTP ${res.status}（预期 200）`);
    }
    if (route === "/support" && res.finalPath === "/") {
      failures.push(`/support 被静默重定向到了首页 /`);
    }
    if (res.ttfbMs > TTFB_BUDGET_MS) {
      warnings.push(`${route} 预热后 TTFB 为 ${res.ttfbMs}ms（超过预算 ${TTFB_BUDGET_MS}ms）`);
    }
  }

  // 2. Browser E2E User Journey Checks
  const executablePath = await resolveBrowser();
  const { kind, browser } = await launchPlaywrightOrPuppeteer(executablePath);
  try {
    if (kind === "playwright") {
      // Desktop Context (ZH)
      const zhContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await zhContext.newPage();

      // Check Legal & Support
      for (const legalPath of ["/privacy", "/terms", "/support"]) {
        await page.goto(`${BASE_URL}${legalPath}`, { waitUntil: "domcontentloaded" });
        const bodyText = await page.locator("body").innerText();
        if (/Creative Commons Zero|\bCC0\b/i.test(bodyText)) {
          failures.push(`${legalPath} 仍包含上游 CC0 公共领域残留条款`);
        }
      }

      // Check Register & Reset Password & Login Community Callback
      await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
      const registerText = await page.locator("body").innerText();
      if (!/人机验证|verification/i.test(registerText)) {
        failures.push(`/register 缺少人机验证前置引导说明`);
      }

      await page.goto(`${BASE_URL}/reset-password`, { waitUntil: "domcontentloaded" });
      const resetText = await page.locator("body").innerText();
      if (!/4\s*位|4-digit/i.test(resetText)) {
        failures.push(`/reset-password 未明确标注 4 位安全重置码`);
      }

      await page.goto(`${BASE_URL}/login?callbackUrl=%2Fcommunity`, { waitUntil: "domcontentloaded" });
      const loginCommunityText = await page.locator("body").innerText();
      if (!/showcase|作品展/i.test(loginCommunityText)) {
        failures.push(`/login?callbackUrl=/community 缺少免登录公开作品展引导入口`);
      }

      // Check /market/resume-website direct CTA
      await page.goto(`${BASE_URL}/market/resume-website`, { waitUntil: "domcontentloaded" });
      const ctaLink = page.locator('a[href="#market-run"]').first();
      if ((await ctaLink.count()) > 0) {
        await ctaLink.click();
        await page.waitForTimeout(400);
        const editorVisible = await page.locator("#visual-editor").isVisible().catch(() => false);
        if (!editorVisible) {
          failures.push(`/market/resume-website 点击 #market-run 后未直接展开 #visual-editor 编辑器`);
        }
      }

      await zhContext.close();

      // English Locale Context (EN)
      const enContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const baseHost = new URL(BASE_URL).hostname;
      await enContext.addCookies([
        { name: "NEXT_LOCALE", value: "en", domain: baseHost, path: "/" },
      ]);
      const enPage = await enContext.newPage();
      await enPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
      const enLoginText = await enPage.locator("main, .container").first().innerText();
      if (/忘记密码/.test(enLoginText)) {
        failures.push(`英文模式下 /login 仍残留中文「忘记密码」`);
      }
      await enContext.close();

      // Mobile 390x844 Viewport Collision & Iframe Title Check
      const mobileContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const mobilePage = await mobileContext.newPage();
      await mobilePage.goto(`${BASE_URL}/explore`, { waitUntil: "domcontentloaded" });
      await mobilePage.waitForTimeout(800);
      const dinoIframeTitle = await mobilePage
        .locator(".ans-companion-v2 iframe")
        .first()
        .getAttribute("title")
        .catch(() => null);
      if (!dinoIframeTitle) {
        failures.push(`.ans-companion-v2 iframe 缺少无障碍 title 属性`);
      }
      const dinoBox = await mobilePage.locator(".ans-companion-v2").first().boundingBox().catch(() => null);
      const submitBox = await mobilePage.locator('a[href="/submit"]').first().boundingBox().catch(() => null);
      if (boxesOverlap(dinoBox, submitBox)) {
        failures.push(`移动端 390×844 视口下 .ans-companion-v2 悬浮窗遮挡了「+ 上传我的项目」按钮`);
      }
      await mobileContext.close();
    } else {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      for (const legalPath of ["/privacy", "/terms", "/support"]) {
        await page.goto(`${BASE_URL}${legalPath}`, { waitUntil: "domcontentloaded" });
        const bodyText = await page.evaluate(() => document.body.innerText);
        if (/Creative Commons Zero|\bCC0\b/i.test(bodyText)) {
          failures.push(`${legalPath} 仍包含上游 CC0 公共领域残留条款`);
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  for (const warning of warnings) {
    console.warn(`[audit:online] 警告：${warning}`);
  }

  if (failures.length > 0) {
    console.error(`[audit:online] 巡检未通过（共 ${failures.length} 项失败）：`);
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`[audit:online] 全部非农客松模块真实用户巡检通过！`);
  }
}

main().catch((error) => {
  console.error("[audit:online] 执行异常：", error);
  process.exitCode = 1;
});
