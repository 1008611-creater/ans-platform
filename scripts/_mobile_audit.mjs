/**
 * 移动端验收脚本
 *
 * 用 puppeteer + Edge 模拟 iPhone 14 Pro Max 视口访问线上站点，
 * 检测横向溢出、点击目标过小、Tab 栏缺失等问题。
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUTDIR = path.join(process.cwd(), 'scripts', '.mobile-audit');
const BASE_URL = 'https://prompts.cauai.fun';
const VIEWPORT = { width: 430, height: 932, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const PATHS = [
  '/',
  '/skills',
  '/prompts',
  '/discover',
  '/skills/map',
  '/prompts/cmtaqlxgd003zpf533gn72qjt',
];

function ensureDir() {
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });
}

async function auditPage(page, urlPath) {
  const url = `${BASE_URL}${urlPath}`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const winWidth = window.innerWidth;
    const docWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;

    const tabBar = !!document.querySelector('nav.fixed.bottom-0');
    const tooSmall = [];
    const interactive = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"]'
    );
    for (const el of interactive) {
      if (!el.offsetParent) continue; // 不可见
      const rect = el.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width > 0 && height > 0 && (width < 32 || height < 32)) {
        tooSmall.push({
          tag: el.tagName,
          class: el.className?.slice(0, 80),
          text: (el.textContent || '').trim().slice(0, 40),
          width: Math.round(width),
          height: Math.round(height),
        });
      }
    }

    return {
      winWidth,
      docWidth,
      bodyWidth,
      overflow: Math.max(docWidth, bodyWidth) > winWidth,
      overflowPx: Math.max(0, Math.max(docWidth, bodyWidth) - winWidth),
      tabBar,
      tooSmall: tooSmall.slice(0, 20),
      tooSmallCount: tooSmall.length,
      title: document.title,
    };
  });

  const screenshotPath = path.join(OUTDIR, `${urlPath.replace(/\//g, '_').replace(/^_/, '') || 'home'}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  return { urlPath, screenshotPath, ...info };
}

async function main() {
  ensureDir();
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const results = [];
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  for (const p of PATHS) {
    try {
      const r = await auditPage(page, p);
      results.push(r);
    } catch (e) {
      results.push({ urlPath: p, error: e.message });
    }
  }

  await browser.close();

  const report = {
    viewport: VIEWPORT,
    baseUrl: BASE_URL,
    checkedAt: new Date().toISOString(),
    summary: results.map(r => ({
      path: r.urlPath,
      overflow: r.overflow ? `${r.overflowPx}px` : 'none',
      tabBar: r.tabBar,
      tooSmall: r.tooSmallCount,
      title: r.title,
    })),
    details: results,
  };

  fs.writeFileSync(path.join(OUTDIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
