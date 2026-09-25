/**
 * 性能预算门禁。
 *
 * 在真实构建产物（`next start`）上量三件事，任一超预算即失败：
 *
 *   1. 关键读取 API 的 p95  ≤ 500ms
 *   2. 关键写入 API 的 p95  ≤ 800ms
 *   3. 核心页面 LCP         ≤ 2500ms
 *
 * 这三条对应计划里的默认性能目标，数字来自 `docs/product-spec.md`
 * 与验收标准，不是脚本自己拍的。
 *
 * 为什么要在脚本里造数据：空表的查询永远是快的，拿空库当基线等于没测。
 * 所以先写入一批固定规模的探针内容（60 条提示词 / 12 个模板 / 8 条工作流），
 * 让列表分页、模糊搜索、关联查询都走真实数据量。这份数据与可访问性门禁共用，
 * 定义与安全写入判断都在 `scripts/lib/probe-fixture.mjs`。
 *
 * 读数的解释方式：这是**单机单进程**的回归基线，用来发现「某次改动让接口
 * 慢了一个数量级」这类退化，不等于生产 SLA。生产还叠了容器配额、网络延迟、
 * 多副本竞争和真实数据量，绝对值必须另测。看趋势，不看小数点。
 *
 * 三种退出形态见 `scripts/lib/preview-server.mjs`。
 *
 * 环境变量：
 *   PERF_MODE=require          缺少前置条件时直接失败（CI 用），默认 auto 跳过。
 *   PERF_PORT                  临时服务端口，默认 3300（避开冒烟 3100、可访问性 3200）。
 *   PERF_SAMPLES               每个读取目标的采样次数，默认 15。
 *   SMOKE_DATABASE_URL         本次测量使用的数据库，默认复用 DATABASE_URL。
 *   PUPPETEER_EXECUTABLE_PATH  指定浏览器可执行文件。
 */
import {
  SEED_EMAIL,
  SEED_PASSWORD,
  createReporter,
  readMode,
  withPreview,
} from "./lib/preview-server.mjs";
import {
  FIXTURE_PROMPTS,
  FIXTURE_TEMPLATES,
  FIXTURE_WORKFLOWS,
  seedProbeFixture,
} from "./lib/probe-fixture.mjs";

const MODE = readMode("PERF_MODE");
const reporter = createReporter("perf", MODE, "PERF_MODE");

/** 计划里写死的三个预算，单位毫秒。 */
const BUDGET = {
  read: 500,
  write: 800,
  lcp: 2500,
};

const SAMPLES = Math.max(5, Number(process.env.PERF_SAMPLES) || 15);
const WARMUP = 3;
const LCP_ROUNDS = 3;

/**
 * 每个读取目标都带一个「返回体必须满足」的断言。
 *
 * 没有这层断言，探针数据一旦没种进去（例如权限不足被静默跳过），接口会以
 * 空结果飞快返回，门禁显示全绿却什么都没测到。`verify` 把「预期条数」写成
 * 硬条件，宁可失败也不要假绿。
 */
const READS = [
  ["健康检查", "/api/health", body => body?.database === "connected"],
  [
    "提示词列表",
    "/api/prompts?page=1&perPage=24&locale=zh",
    body => Array.isArray(body?.prompts) && body.prompts.length > 0 && body.total >= FIXTURE_PROMPTS,
  ],
  // 搜索词必须真的命中探针数据，否则量的是「空结果」这条捷径。
  [
    "提示词搜索",
    `/api/prompts?q=${encodeURIComponent("性能探针")}&page=1&perPage=24&locale=zh`,
    body => Array.isArray(body?.prompts) && body.prompts.length > 0,
  ],
  ["模板广场", "/api/templates", body => Array.isArray(body?.templates) && body.templates.length >= FIXTURE_TEMPLATES],
  ["工作流广场", "/api/workflows", body => Array.isArray(body?.data?.workflows) && body.data.workflows.length >= FIXTURE_WORKFLOWS],
];

const PAGES = [
  ["/", "首页"],
  ["/prompts", "提示词广场"],
  ["/templates", "模板广场"],
  ["/workflows", "工作流广场"],
];

/** 第 95 百分位：样本升序后取「至少 95% 的样本不超过」的那个值。 */
function percentile(samples, ratio) {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(ratio * sorted.length) - 1));
  return sorted[index];
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1],
  };
}

function format(value) {
  return `${Math.round(value)}ms`;
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
  await page
    .waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 20_000 })
    .catch(() => null);
  if (new URL(page.url()).pathname.startsWith("/login")) return null;
  const cookies = await page.cookies();
  return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
}

/** 一个读取目标：先热身几发，再逐次计时，同时记录非 2xx 与不满足断言时的响应。 */
async function measureRead(baseUrl, path, expect) {
  const samples = [];
  const errors = [];
  for (let index = 0; index < SAMPLES + WARMUP; index += 1) {
    const started = performance.now();
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
    } catch (error) {
      errors.push(`${path} 请求异常：${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const body = await response.json().catch(() => null);
    const elapsed = performance.now() - started;
    if (!response.ok) {
      errors.push(`${path} 返回 HTTP ${response.status}`);
      continue;
    }
    if (!expect(body)) {
      errors.push(`${path} 返回体不符合预期，探针数据可能未生效`);
      continue;
    }
    if (index >= WARMUP) samples.push(elapsed);
  }
  return { samples, errors };
}

async function callFavorite(baseUrl, cookie, targetId, method) {
  const url = method === "POST"
    ? `${baseUrl}/api/favorites`
    : `${baseUrl}/api/favorites?targetType=PROMPT&targetId=${encodeURIComponent(targetId)}`;
  const started = performance.now();
  const response = await fetch(url, {
    method,
    headers: method === "POST" ? { cookie, "content-type": "application/json" } : { cookie },
    body: method === "POST" ? JSON.stringify({ targetType: "PROMPT", targetId }) : undefined,
  });
  await response.arrayBuffer();
  const elapsed = performance.now() - started;
  if (!response.ok) throw new Error(`${method} /api/favorites 返回 HTTP ${response.status}`);
  return { elapsed, status: response.status };
}

/**
 * 写入目标用「收藏 → 取消收藏」这一对：两者都是带事务和审计日志的真实写路径，
 * 成对执行后状态回到原样，反复跑不累积数据。
 *
 * 关键是一发写、一发删交替进行，而不是连着发 15 次收藏——后者除了第一发以外
 * 全落在「已收藏就直接返回」的幂等捷径上，量出来的数字没有意义。
 */
async function measureWrites(baseUrl, cookie, targetId) {
  const add = [];
  const remove = [];
  const errors = [];
  let createdOnce = false;
  for (let index = 0; index < SAMPLES + WARMUP; index += 1) {
    try {
      const create = await callFavorite(baseUrl, cookie, targetId, "POST");
      const drop = await callFavorite(baseUrl, cookie, targetId, "DELETE");
      // 201 说明这一发真的新建了收藏；若全是 200，量到的是幂等捷径而不是写路径。
      if (create.status === 201) createdOnce = true;
      if (index >= WARMUP) {
        add.push(create.elapsed);
        remove.push(drop.elapsed);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (!createdOnce) errors.push("收藏写入从未返回 201，未走到真实新建路径");
  return { add, remove, errors };
}

/**
 * 页面 LCP：观察者必须在文档开始执行前装好，否则会漏掉首屏那次绘制。
 *
 * 等的是「LCP 已经出现」这件事本身，而不是网络静默——站点有通知轮询之类的
 * 长连接，等网络静默会让每页白等十几秒，门禁时间全耗在空转上。
 *
 * 出现之后还要再静置一小段：观察者每次回调给的都是「当前最大候选」，读到
 * 第一帧就等于把 LCP 量成了首屏第一笔绘制，必然虚低。静置后再读，拿到的
 * 才是首屏渲染稳定下来的那个值。
 */
async function measureLcp(page, baseUrl, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const arrived = await page
    .waitForFunction(() => (window.__ansLcp ?? 0) > 0, { timeout: 10_000, polling: 50 })
    .then(() => true)
    .catch(() => false);
  if (!arrived) return null;
  await new Promise(resolve => setTimeout(resolve, 800));
  const value = await page.evaluate(() => window.__ansLcp ?? 0);
  return typeof value === "number" && value > 0 ? value : null;
}

async function main() {
  const failures = [];
  const readRows = [];
  const writeRows = [];
  const lcpRows = [];
  let measured = false;

  await withPreview(
    { mode: MODE, requireMode: "PERF_MODE", reporter, port: Number(process.env.PERF_PORT || 3300) },
    async ({ browser, baseUrl, databaseUrl, seed }) => {
      const fixture = await seedProbeFixture(databaseUrl);
      if (!fixture.seeded) {
        reporter.skipped(`未建立探针数据：${fixture.reason}`);
        return;
      }
      if (!seed.created) {
        reporter.skipped(`未获得可登录账号，无法测量写入路径（${seed.reason}）`);
        return;
      }
      measured = true;
      reporter.info(
        `探针数据：${FIXTURE_PROMPTS} 条提示词 / ${FIXTURE_TEMPLATES} 个模板 / ${FIXTURE_WORKFLOWS} 条工作流；每个目标采样 ${SAMPLES} 次`,
      );

      for (const [label, path, expect] of READS) {
        const { samples, errors } = await measureRead(baseUrl, path, expect);
        for (const error of errors.slice(0, 3)) failures.push(error);
        if (samples.length === 0) {
          failures.push(`${label} ${path} 没有采集到有效样本`);
          continue;
        }
        const row = { label, path, ...stats(samples) };
        readRows.push(row);
        if (row.p95 > BUDGET.read) {
          failures.push(`${label} 读取 p95 ${format(row.p95)} 超出预算 ${format(BUDGET.read)}`);
        }
      }

      const page = await browser.newPage();
      const cookie = await login(page, baseUrl);
      if (!cookie) {
        failures.push("登录失败，无法测量写入路径");
      } else if (!fixture.favoriteTargetId) {
        failures.push("探针数据缺少可收藏对象，无法测量写入路径");
      } else {
        const { add, remove, errors } = await measureWrites(baseUrl, cookie, fixture.favoriteTargetId);
        for (const error of errors.slice(0, 3)) failures.push(error);
        for (const [label, path, samples] of [
          ["收藏写入", "/api/favorites (POST)", add],
          ["取消收藏写入", "/api/favorites (DELETE)", remove],
        ]) {
          if (samples.length === 0) {
            failures.push(`${label} 没有采集到有效样本`);
            continue;
          }
          const row = { label, path, ...stats(samples) };
          writeRows.push(row);
          if (row.p95 > BUDGET.write) {
            failures.push(`${label} p95 ${format(row.p95)} 超出预算 ${format(BUDGET.write)}`);
          }
        }
      }

      await page.evaluateOnNewDocument(() => {
        window.__ansLcp = 0;
        try {
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) window.__ansLcp = entry.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch {
          // 浏览器不支持时保持 0，下面按「未采集到」处理，不静默当成达标。
        }
      });
      await page.setViewport({ width: 1280, height: 900 });
      for (const [path, label] of PAGES) {
        const rounds = [];
        for (let index = 0; index < LCP_ROUNDS + 1; index += 1) {
          const value = await measureLcp(page, baseUrl, path);
          // 第一轮是热身（首次加载脚本、字体），只保留后面的稳定值。
          if (index >= 1 && value !== null) rounds.push(value);
        }
        if (rounds.length === 0) {
          failures.push(`${label} ${path} 未采集到 LCP`);
          continue;
        }
        const sorted = [...rounds].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        lcpRows.push({ label, path, median, rounds: sorted });
        if (median > BUDGET.lcp) {
          failures.push(`${label} LCP 中位数 ${format(median)} 超出预算 ${format(BUDGET.lcp)}`);
        }
      }
      await page.close();
    },
  );

  if (!measured) return;

  const print = (title, rows, budget, pick) => {
    console.log(`\n[perf] ${title}（预算 ${format(budget)}）`);
    for (const row of rows) {
      const value = pick(row);
      const mark = value > budget ? "超预算" : "达标";
      console.log(
        `  [${mark}] ${row.label}  p50 ${format(pick(row, "p50"))}  p95 ${format(value)}  max ${format(pick(row, "max"))}  ${row.path}`,
      );
    }
  };

  print("关键读取 API", readRows, BUDGET.read, (row, key = "p95") => row[key]);
  print("关键写入 API", writeRows, BUDGET.write, (row, key = "p95") => row[key]);

  console.log(`\n[perf] 核心页面 LCP（预算 ${format(BUDGET.lcp)}）`);
  for (const row of lcpRows) {
    const mark = row.median > BUDGET.lcp ? "超预算" : "达标";
    console.log(`  [${mark}] ${row.label}  中位数 ${format(row.median)}  ${row.path}`);
  }

  if (failures.length) {
    for (const failure of failures) reporter.error(failure);
    reporter.fail(`${failures.length} 项性能预算未达标`);
    return;
  }
  reporter.info(
    `读取 ${readRows.length} 项、写入 ${writeRows.length} 项、页面 ${lcpRows.length} 项全部在预算内`,
  );
}

await main().catch(error => {
  console.error(`[perf] 执行失败：${error?.stack || error}`);
  process.exitCode = 1;
});
