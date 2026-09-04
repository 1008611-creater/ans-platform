#!/usr/bin/env node
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      args._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function usage() {
  console.log(`Usage:
  node goofish_publish_helper.js open --workspace <dir>
  node goofish_publish_helper.js fill --workspace <dir> --config <publish_config.json>
  node goofish_publish_helper.js inspect --workspace <dir>
  node goofish_publish_helper.js publish --workspace <dir> --confirm-publish

Options:
  --port <number>              CDP port, default 9223 or GOOFISH_CDP_PORT
  --config <file>              JSON publish config for fill
  --confirm-publish            Required for publish action
  --keep-open                  Do not close the CDP browser connection`);
}

function loadPlaywright() {
  const modulePath =
    process.env.PLAYWRIGHT_MODULE ||
    path.join(process.env.TEMP || process.env.TMP || ".", "xianyu-pw", "node_modules", "playwright");
  try {
    return require(modulePath);
  } catch (error) {
    console.error(`Cannot load Playwright from: ${modulePath}`);
    console.error("Install it or set PLAYWRIGHT_MODULE to a playwright package directory.");
    throw error;
  }
}

function edgePath() {
  const candidates = [
    process.env.EDGE_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Cannot find Microsoft Edge. Set EDGE_PATH.");
  return found;
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function waitForCdp(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return await getJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Timed out waiting for Edge CDP on port ${port}`);
}

async function ensureEdge(port, workspace) {
  if (await isPortOpen(port)) {
    console.log(`Connecting to existing Edge CDP on ${port}`);
    return;
  }

  const profileDir = path.join(workspace, ".edge-goofish-pw-profile");
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--new-window",
    "https://www.goofish.com/publish",
  ];
  console.log(`Opening Edge CDP on ${port}`);
  spawn(edgePath(), args, { detached: true, stdio: "ignore" }).unref();
  await waitForCdp(port);
}

async function connectPage(port, workspace, gotoPublish = true) {
  await ensureEdge(port, workspace);
  const { chromium } = loadPlaywright();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0] || (await browser.newContext());
  let page =
    context.pages().find((candidate) => candidate.url().includes("goofish.com/publish")) ||
    context.pages().find((candidate) => candidate.url().includes("goofish.com")) ||
    context.pages()[0];
  if (!page) page = await context.newPage();
  await page.bringToFront();
  if (gotoPublish && !page.url().includes("goofish.com/publish")) {
    await page.goto("https://www.goofish.com/publish", { waitUntil: "domcontentloaded" });
  }
  return { browser, page };
}

async function waitForPublishForm(page, outputDir) {
  console.log("Waiting for Goofish publish form. Log in in the Edge window if needed.");
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    const hasEditor = (await page.locator('div[contenteditable="true"]').count().catch(() => 0)) > 0;
    const hasFileInput = (await page.locator('input[type="file"]').count().catch(() => 0)) > 0;
    if (hasEditor || hasFileInput) return;
    await page.waitForTimeout(1000);
    if (!page.url().includes("/publish")) {
      await page.goto("https://www.goofish.com/publish", { waitUntil: "domcontentloaded" }).catch(() => {});
    }
  }
  const shot = path.join(outputDir, "goofish_waiting_for_login.png");
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  throw new Error(`Publish form did not appear. Screenshot: ${shot}`);
}

function loadConfig(configPath) {
  if (!configPath) throw new Error("--config is required for fill");
  const absolute = path.resolve(configPath);
  const config = JSON.parse(fs.readFileSync(absolute, "utf8"));
  if (!config.title) throw new Error("Config requires title");
  if (!Array.isArray(config.imagePaths) || config.imagePaths.length === 0) {
    throw new Error("Config requires imagePaths");
  }
  config.imagePaths = config.imagePaths.map((file) => path.resolve(file));
  for (const file of config.imagePaths) {
    if (!fs.existsSync(file)) throw new Error(`Missing image: ${file}`);
  }
  return config;
}

async function fillEditor(page, config) {
  const body = String(config.body || "").trim();
  const text = body.startsWith(config.title) ? body : `${config.title}\n\n${body}`.trim();
  const editor = page.locator('div[contenteditable="true"]').first();
  await editor.waitFor({ state: "visible", timeout: 30000 });
  await editor.fill(text);
}

async function fillPrices(page, config) {
  const priceInputs = page.locator('input[placeholder="0.00"], input[placeholder*="0.00"]');
  const count = await priceInputs.count().catch(() => 0);
  if (config.price && count >= 1) await priceInputs.nth(0).fill(String(config.price));
  if (config.originalPrice && count >= 2) await priceInputs.nth(1).fill(String(config.originalPrice));
  if (config.noShipping !== false) {
    const noShipping = page.getByText("无需邮寄", { exact: true });
    if ((await noShipping.count().catch(() => 0)) > 0) {
      await noShipping.first().click({ timeout: 5000 }).catch(() => {});
    }
  }
}

async function uploadImages(page, imagePaths) {
  console.log(`Uploading ${imagePaths.length} images`);
  const uploadSelect = page.locator(".ant-upload-select").first();
  let uploaded = false;
  if ((await uploadSelect.count().catch(() => 0)) > 0) {
    try {
      const [chooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 15000 }),
        uploadSelect.click({ timeout: 15000, force: true }),
      ]);
      await chooser.setFiles(imagePaths, { timeout: 120000 });
      uploaded = true;
    } catch (error) {
      console.log(`File chooser upload failed, trying direct input: ${error.message}`);
    }
  }
  if (!uploaded) {
    await page.locator('input[type="file"]').first().setInputFiles(imagePaths, { timeout: 120000 });
  }
}

async function collectState(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")].map((button, index) => {
      const rect = button.getBoundingClientRect();
      return {
        index,
        text: button.innerText.trim(),
        disabled: button.disabled,
        visible: rect.width > 0 && rect.height > 0,
      };
    });
    const imageLike = [...document.querySelectorAll("img")]
      .map((img) => {
        const rect = img.getBoundingClientRect();
        return {
          src: img.src,
          alt: img.alt,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        };
      })
      .filter((img) => img.w >= 50 && img.h >= 50 && img.y > 100)
      .slice(0, 30);
    return {
      url: location.href,
      title: document.title,
      bodyText: document.body.innerText.slice(0, 2000),
      buttons,
      imageLikeCount: imageLike.length,
      imageLike,
    };
  });
}

async function screenshot(page, outputDir, name) {
  fs.mkdirSync(outputDir, { recursive: true });
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  console.log(`screenshot ${file}`);
  return file;
}

async function actionOpen(options) {
  const { browser, page } = await connectPage(options.port, options.workspace, true);
  console.log(`opened ${page.url()}`);
  await screenshot(page, options.outputDir, "goofish_open.png");
  if (!options.keepOpen) await browser.close();
}

async function actionFill(options) {
  const config = loadConfig(options.config);
  const { browser, page } = await connectPage(options.port, options.workspace, true);
  await waitForPublishForm(page, options.outputDir);
  await fillEditor(page, config);
  await fillPrices(page, config);
  await uploadImages(page, config.imagePaths);
  await page.waitForTimeout(5000);
  await screenshot(page, options.outputDir, "goofish_publish_ready.png");
  const state = await collectState(page);
  console.log(JSON.stringify({ url: state.url, imageLikeCount: state.imageLikeCount }, null, 2));
  if (!options.keepOpen) await browser.close();
}

async function actionInspect(options) {
  const { browser, page } = await connectPage(options.port, options.workspace, false);
  await screenshot(page, options.outputDir, "goofish_inspect.png");
  console.log(JSON.stringify(await collectState(page), null, 2));
  if (!options.keepOpen) await browser.close();
}

async function actionPublish(options) {
  if (!options.confirmPublish) {
    throw new Error("Refusing to publish without --confirm-publish");
  }
  const { browser, page } = await connectPage(options.port, options.workspace, false);
  const publish = page.getByRole("button", { name: "发布", exact: true });
  const count = await publish.count();
  if (count !== 1) throw new Error(`Expected exactly one 发布 button, got ${count}`);
  await Promise.race([
    page.waitForURL((url) => !url.toString().includes("/publish"), { timeout: 30000 }).catch(() => null),
    publish.click({ timeout: 15000 }),
  ]);
  await page.waitForTimeout(2500);

  const buttons = await page.locator("button").evaluateAll((items) =>
    items.map((button, index) => {
      const rect = button.getBoundingClientRect();
      return {
        index,
        text: button.innerText.trim(),
        disabled: button.disabled,
        visible: rect.width > 0 && rect.height > 0,
      };
    })
  );
  const confirm = buttons.find((button) =>
    button.visible && !button.disabled && /确认|确 认|确定|继续发布|我知道了|同意/.test(button.text)
  );
  if (confirm) {
    console.log(`clicking confirmation button: ${confirm.text}`);
    await page.locator("button").nth(confirm.index).click({ timeout: 15000 });
    await page.waitForTimeout(3000);
  }
  await screenshot(page, options.outputDir, "goofish_after_publish.png");
  console.log(JSON.stringify({ finalUrl: page.url(), bodyText: (await page.locator("body").innerText()).slice(0, 2000) }, null, 2));
  if (!options.keepOpen) await browser.close();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const action = args._[0];
  if (!action || args.help) {
    usage();
    return;
  }
  const workspace = path.resolve(args.workspace || process.cwd());
  const options = {
    workspace,
    outputDir: path.join(workspace, "output", "playwright"),
    config: args.config,
    port: Number(args.port || process.env.GOOFISH_CDP_PORT || 9223),
    keepOpen: Boolean(args["keep-open"]),
    confirmPublish: Boolean(args["confirm-publish"]),
  };

  if (action === "open") return actionOpen(options);
  if (action === "fill") return actionFill(options);
  if (action === "inspect") return actionInspect(options);
  if (action === "publish") return actionPublish(options);
  throw new Error(`Unknown action: ${action}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
