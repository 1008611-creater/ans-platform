import { createRequire } from "module";
import fs from "fs";
import path from "path";
import os from "os";

const require = createRequire("/Users/eeo/Downloads/eeo/xiaoke-experiments/diagnostics/company-review-git/package.json");
const { chromium } = require("playwright");

const STATE_PATH = path.join(os.homedir(), ".gemini", "feishu-storage-state.json");
const PROFILE_DIR = path.join(os.homedir(), ".gemini", "feishu-browser-profile");
const QR_IMG_PATH = "/Users/eeo/.gemini/antigravity/brain/a7da3def-44c3-4d60-8925-740b8344acc6/feishu-login-qr.png";
const IMPORT_SCREENSHOT_PATH = "/Users/eeo/.gemini/antigravity/brain/a7da3def-44c3-4d60-8925-740b8344acc6/feishu-imported-doc.png";
const DEFAULT_DOCX = "/Users/eeo/Downloads/eeo/NB实验室_科学实验统一封面Skill矩阵与21张物化生实测汇报.docx";
const DEFAULT_DRIVE_URL = "https://narcb9vct6.feishu.cn/drive/home/";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function importDocxOnDrivePage(page, filePath) {
  const docBaseName = path.basename(filePath, path.extname(filePath));
  const shortKey = docBaseName.slice(0, 12);
  console.error(`[FeishuWorker] Importing file as Online Doc: ${filePath} (key=${shortKey})`);
  await page.waitForTimeout(3500);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(500);

  try {
    // 1. Click "上传本地文件" on Feishu Drive Home
    const uploadCard = page.locator("text=上传本地文件").first();
    await uploadCard.click();
    await page.waitForTimeout(1000);

    // 2. Click "导入为在线文档" menu item
    const menuItem = page
      .locator('[data-selector="create-by-type-OPEN_IMPORT_CENTER"], li[role="menuitem"]:has-text("导入为在线文档")')
      .first();
    await menuItem.click({ force: true });
    await page.waitForTimeout(1500);

    // 3. In the "导入到" modal ("我的文档库" is selected by default), click "确定"
    const confirmTargetBtn = page.locator('button:has-text("确定")').first();
    if (await confirmTargetBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await confirmTargetBtn.click();
      await page.waitForTimeout(1500);
    }

    // 4. In the "导入" format selection modal, click "Microsoft Word" (for .docx) or "Markdown" (for .md)
    const isMarkdown = filePath.toLowerCase().endsWith(".md") || filePath.toLowerCase().endsWith(".markdown");
    const formatSelector = isMarkdown ? "text=Markdown" : "text=Microsoft Word";
    const formatCard = page.locator(formatSelector).first();

    let fileUploaded = false;
    if (await formatCard.isVisible({ timeout: 4000 }).catch(() => false)) {
      const [fc] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 6000 }).catch(() => null),
        formatCard.click(),
      ]);
      if (fc) {
        await fc.setFiles(filePath);
        fileUploaded = true;
        console.error(`[FeishuWorker] Selected file via filechooser on ${formatSelector}!`);
      } else {
        await page.waitForTimeout(1200);
        const fileInputs = page.locator('input[type="file"]');
        if ((await fileInputs.count()) > 0) {
          await fileInputs.last().setInputFiles(filePath);
          fileUploaded = true;
          console.error("[FeishuWorker] Set file on input[type=file] after clicking format card!");
        }
      }
    }

    // 5. Check if any additional confirmation button appears
    await page.waitForTimeout(2000);
    const startImportBtn = page
      .locator('button:has-text("导入"), button:has-text("开始导入"), button:has-text("确定")')
      .first();
    if (await startImportBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await startImportBtn.click().catch(() => {});
      console.error("[FeishuWorker] Clicked final confirm import button!");
    }

    // 6. Wait up to 120 seconds for Feishu to finish uploading & converting the file into an Online Doc
    const context = page.context();
    for (let i = 0; i < 120; i++) {
      await sleep(1000);

      // Check if a new tab opened with the converted docx/wiki URL
      for (const p of context.pages()) {
        const u = p.url();
        if (
          (u.includes("/docx/") || u.includes("/docs/") || u.includes("/wiki/")) &&
          !u.includes("/drive/home")
        ) {
          await p.waitForTimeout(4500);
          await p.screenshot({ path: IMPORT_SCREENSHOT_PATH, fullPage: false }).catch(() => {});
          return {
            ok: true,
            doc_url: u.split("?")[0],
            raw_url: u,
            title: docBaseName,
            screenshot: IMPORT_SCREENSHOT_PATH,
          };
        }
      }

      // Check if any link matching the uploaded file name or "打开" appeared in DOM
      const docxLinks = await page
        .locator('a[href*="/docx/"], a[href*="/docs/"], a[href*="/wiki/"]')
        .evaluateAll((els) => els.map((e) => ({ text: (e.textContent || "").trim(), href: e.href })))
        .catch(() => []);
      const matched = docxLinks.find(
        (l) => (shortKey && l.text.includes(shortKey)) || l.text.includes("打开")
      );
      if (matched && matched.href) {
        await page.goto(matched.href, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(4500);
        await page.screenshot({ path: IMPORT_SCREENSHOT_PATH, fullPage: false }).catch(() => {});
        return {
          ok: true,
          doc_url: matched.href.split("?")[0],
          title: matched.text || docBaseName,
          screenshot: IMPORT_SCREENSHOT_PATH,
        };
      }

      if (i >= 6 && i % 4 === 0) {
        const openBtn = page.locator('text=/^打开$|立即打开|查看文档/').first();
        if (await openBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          const [newPage] = await Promise.all([
            context.waitForEvent("page", { timeout: 5000 }).catch(() => null),
            openBtn.click().catch(() => {}),
          ]);
          if (newPage) {
            await newPage.waitForTimeout(4500);
            await newPage.screenshot({ path: IMPORT_SCREENSHOT_PATH, fullPage: false }).catch(() => {});
            return {
              ok: true,
              doc_url: newPage.url().split("?")[0],
              title: docBaseName,
              screenshot: IMPORT_SCREENSHOT_PATH,
            };
          }
        }

        if (shortKey) {
          const docRow = page.locator(`text=${shortKey}`).first();
          if (await docRow.isVisible({ timeout: 500 }).catch(() => false)) {
            const [newPage] = await Promise.all([
              context.waitForEvent("page", { timeout: 5000 }).catch(() => null),
              docRow.click().catch(() => {}),
            ]);
            if (newPage) {
              await newPage.waitForTimeout(4500);
              await newPage.screenshot({ path: IMPORT_SCREENSHOT_PATH, fullPage: false }).catch(() => {});
              return {
                ok: true,
                doc_url: newPage.url().split("?")[0],
                title: docBaseName,
                screenshot: IMPORT_SCREENSHOT_PATH,
              };
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[FeishuWorker] Auto-import UI step note:", err.message);
  }
  await page.screenshot({ path: IMPORT_SCREENSHOT_PATH, fullPage: false }).catch(() => {});
  const tailText = await page.evaluate(() => document.body.innerText.slice(-1000)).catch(() => "");
  return { ok: true, drive_url: page.url(), screenshot: IMPORT_SCREENSHOT_PATH, tail_text: tailText };
}

async function runInteractiveLoginAndImport(filePath, driveUrl) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const hasState = fs.existsSync(STATE_PATH);
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: hasState,
    viewport: { width: 1440, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  await context.addInitScript(() => {
    delete window.showOpenFilePicker;
    delete window.showDirectoryPicker;
  });

  const page = context.pages()[0] || (await context.newPage());
  console.error(`[FeishuWorker] Navigating to ${driveUrl} (headless=${hasState}) ...`);
  await page.goto(driveUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await sleep(3500);
  if (page.url().includes("accounts.feishu.cn")) {
    const acctCard = page.locator("text=飞书个人用户").first();
    if (await acctCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.error("[FeishuWorker] Clicking account card on switcher page...");
      await acctCard.click().catch(() => {});
      await page.waitForURL((u) => u.toString().includes("feishu.cn/drive/"), { timeout: 20000 }).catch(() => {});
      await sleep(4000);
    }
  }

  const importRes = await importDocxOnDrivePage(page, filePath);
  await context.storageState({ path: STATE_PATH });
  console.log(
    JSON.stringify(
      {
        ok: true,
        session_saved: STATE_PATH,
        current_url: page.url(),
        import_result: importRes,
      },
      null,
      2
    )
  );
  await context.close();
}

async function main() {
  const action = process.argv[2] || "interactive_login_and_import";
  const rawArgs = process.argv[3] ? JSON.parse(process.argv[3]) : {};

  if (action === "interactive_login_and_import" || action === "feishu_import_file_as_doc") {
    const filePath = rawArgs.file_path || DEFAULT_DOCX;
    const driveUrl = rawArgs.drive_url || DEFAULT_DRIVE_URL;
    await runInteractiveLoginAndImport(filePath, driveUrl);
  } else if (action === "feishu_read_doc_content") {
    const context = await chromium.launchPersistentContext(PROFILE_DIR, { headless: true });
    const page = context.pages()[0] || (await context.newPage());
    await page.goto(rawArgs.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await sleep(4000);
    const title = await page.title();
    const text = await page.evaluate(() => document.body.innerText);
    console.log(JSON.stringify({ ok: true, url: page.url(), title, content: text.slice(0, 15000) }, null, 2));
    await context.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
