#!/usr/bin/env node
/**
 * Pre-Cached Live Website Tour & 3D Dino Agent Capture Script
 * Captures 100% pre-cached, clean, high-resolution website states & 36-frame 3D Dino Agent sequence
 * from https://ans.cauai.fun into demos/ans-brand-film/assets/tour/
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, "assets", "tour");
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell"
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function preCacheAndCleanCards(page) {
  await page.evaluate(async () => {
    // Force all lazy images to eager
    document.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
      if (img.dataset && img.dataset.src) img.src = img.dataset.src;
    });
    // Scroll through page to trigger all IntersectionObservers
    const h = document.body.scrollHeight || 2400;
    for (let y = 0; y <= h; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
    // Wait for all images to finish loading
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
              setTimeout(res, 3500);
            })
      )
    );
    // Remove incomplete personal projects & any broken-image cards
    const badWords = [
      "念念",
      "简历",
      "VibePhoto",
      "知微影像",
      "无限画布",
      "Image2",
      "Image 2.0",
      "视频定制",
      "商业视频",
    ];
    document.querySelectorAll("article, a, div").forEach((el) => {
      const isCard =
        el.tagName === "ARTICLE" ||
        (el.className &&
          typeof el.className === "string" &&
          el.className.includes("rounded-") &&
          el.querySelector("img") &&
          el.querySelector("h2, h3"));
      if (!isCard) return;
      const txt = el.innerText || "";
      if (txt.length > 480) return;
      const img = el.querySelector("img");
      const brokenImg = img && (!img.complete || img.naturalWidth === 0);
      if (badWords.some((w) => txt.includes(w)) || brokenImg) {
        el.style.display = "none";
      }
    });
  });
  await sleep(500);
}

async function run() {
  console.log("Launching Chromium with Metal WebGL2...");
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--use-angle=metal", "--window-size=1920,2260"],
  });
  const page = await browser.newPage();

  // =========================================================================
  // 1. Chapter 1: /explore (项目广场 — 切换分类 & 下滑浏览)
  // =========================================================================
  console.log("1. Pre-caching /explore categories...");
  await page.setViewport({ width: 1920, height: 2160, deviceScaleFactor: 1 });
  await page.goto("https://ans.cauai.fun/explore", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(2500);
  await preCacheAndCleanCards(page);
  await page.screenshot({ path: path.join(OUT_DIR, "explore_all.webp"), type: "webp", quality: 92 });

  for (const [label, fname] of [
    ["学习成长", "explore_learn.webp"],
    ["GitHub 宝藏", "explore_github.webp"],
    ["效率与生活", "explore_prod.webp"],
    ["比赛与团队", "explore_comp.webp"],
  ]) {
    await page.evaluate((lbl) => {
      const btns = Array.from(document.querySelectorAll("button, a"));
      const b = btns.find((el) => (el.innerText || "").includes(lbl));
      if (b) b.click();
    }, label);
    await sleep(1000);
    await preCacheAndCleanCards(page);
    await page.screenshot({ path: path.join(OUT_DIR, fname), type: "webp", quality: 92 });
  }

  // =========================================================================
  // 2. Chapter 2: /vibe-hub (术语图鉴 · AI / 前端 / 设计风格 & 课程 & 练习)
  // =========================================================================
  console.log("2. Pre-caching /vibe-hub tabs & styles...");
  await page.setViewport({ width: 1920, height: 2260, deviceScaleFactor: 1 });
  await page.goto("https://ans.cauai.fun/vibe-hub", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(2200);
  await page.screenshot({ path: path.join(OUT_DIR, "vibehub_ai.webp"), type: "webp", quality: 92 });

  for (const [label, fname] of [
    ["前端", "vibehub_fe.webp"],
    ["设计风格", "vibehub_style.webp"],
  ]) {
    await page.evaluate((lbl) => {
      const btns = Array.from(document.querySelectorAll("button, a"));
      const b = btns.find((el) => (el.innerText || "").includes(lbl));
      if (b) b.click();
    }, label);
    await sleep(1000);
    await page.screenshot({ path: path.join(OUT_DIR, fname), type: "webp", quality: 92 });
  }

  await page.setViewport({ width: 1920, height: 1400, deviceScaleFactor: 1 });
  await page.goto("https://ans.cauai.fun/vibe-hub/courses", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(1800);
  await preCacheAndCleanCards(page);
  await page.screenshot({ path: path.join(OUT_DIR, "vibehub_courses.webp"), type: "webp", quality: 92 });

  await page.goto("https://ans.cauai.fun/vibe-hub/practice", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "vibehub_practice.webp"), type: "webp", quality: 92 });

  // =========================================================================
  // 3. Chapters 3 & 4: 3D Dino Agent Live Sequence (36 Pre-Cached 1080p Frames)
  //    点三下放大 -> 抽几下鞭子 -> 喂几次零食 -> 3D衣橱换衣服 (Tripo -> UR)
  // =========================================================================
  console.log("3. Pre-caching 3D Dino Agent & Wardrobe .glb models...");
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto("https://ans.cauai.fun/explore", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(3000);
  await preCacheAndCleanCards(page);

  // Click 学习成长 so the background cards behind the Dino are 100% clean open-source projects!
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button, a"));
    const b = btns.find((el) => (el.innerText || "").includes("学习成长"));
    if (b) b.click();
  });
  await sleep(1000);
  await preCacheAndCleanCards(page);

  // WARMUP PASS: Open Macro Stage + 3D Wardrobe + Equip Tripo + Equip UR so all 3D models compile & cache!
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) window.dispatchEvent(new CustomEvent("ans:dino-stage-click"));
  });
  await sleep(1500);
  await page.evaluate(() => {
    const wBtn = document.querySelector(".hud-act-btn.is-wardrobe");
    if (wBtn) wBtn.click();
  });
  await sleep(3200);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("#ans-sanctuary-wardrobe-modal button"));
    const tBtn = btns.find((b) => b.innerText.includes("Tripo"));
    if (tBtn) tBtn.click();
  });
  await sleep(1200);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("#ans-sanctuary-wardrobe-modal button"));
    const uBtn = btns.find((b) => b.innerText.includes("UR") || b.innerText.includes("神装"));
    if (uBtn) uBtn.click();
  });
  await sleep(1200);

  // Reset sanctuary state cleanly while keeping browser HTTP/WebGL cache warm!
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle2", timeout: 45000 });
  await sleep(2800);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button, a"));
    const b = btns.find((el) => (el.innerText || "").includes("学习成长"));
    if (b) b.click();
  });
  await sleep(900);
  await preCacheAndCleanCards(page);

  console.log("   Recording 36 pre-cached 3D Dino interactive frames...");
  let fIdx = 0;
  const snapDino = async (count = 1, delayMs = 140) => {
    for (let i = 0; i < count; i++) {
      const p = path.join(OUT_DIR, `dino_${String(fIdx).padStart(2, "0")}.webp`);
      await page.screenshot({ path: p, type: "webp", quality: 92 });
      fIdx++;
      if (delayMs > 0) await sleep(delayMs);
    }
  };

  // dino_00 .. dino_02 (3 frames): Idle in bottom-right corner
  await snapDino(3, 160);

  // dino_03 .. dino_04 (2 frames): Click #1 (再点 2 下进入近景镜头)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("ans:dino-stage-click")));
  await sleep(160);
  await snapDino(2, 160);

  // dino_05 .. dino_06 (2 frames): Click #2 (再点 1 下进入近景镜头)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("ans:dino-stage-click")));
  await sleep(160);
  await snapDino(2, 160);

  // dino_07 .. dino_10 (4 frames): Click #3 -> Zooms into Close-Up Macro Stage!
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("ans:dino-stage-click")));
  await sleep(320);
  await snapDino(4, 240);

  // dino_11 .. dino_17 (7 frames): Whip x3 (🪢 挥鞭催干活)
  await page.evaluate(() => {
    const b = document.querySelector(".hud-act-btn.is-whip");
    if (b) b.click();
  });
  await sleep(120);
  await snapDino(2, 160);

  await page.evaluate(() => {
    const b = document.querySelector(".hud-act-btn.is-whip");
    if (b) b.click();
  });
  await sleep(120);
  await snapDino(2, 160);

  await page.evaluate(() => {
    const b = document.querySelector(".hud-act-btn.is-whip");
    if (b) b.click();
  });
  await sleep(120);
  await snapDino(3, 180);

  // dino_18 .. dino_24 (7 frames): Feed x3 (🎲 盲盒投喂)
  await page.evaluate(() => {
    const b = document.querySelector(".hud-act-btn.is-feed");
    if (b) b.click();
  });
  await sleep(140);
  await snapDino(2, 170);

  await page.evaluate(() => {
    const b = document.querySelector(".hud-act-btn.is-feed");
    if (b) b.click();
  });
  await sleep(140);
  await snapDino(2, 170);

  await page.evaluate(() => {
    const b = document.querySelector(".hud-act-btn.is-feed");
    if (b) b.click();
  });
  await sleep(140);
  await snapDino(3, 180);

  // dino_25 .. dino_27 (3 frames): Open 3D Wardrobe (👗 3D 衣橱)
  await page.evaluate(() => {
    // Hide secret quest toast banner if present so wardrobe cards are 100% unobstructed
    document.querySelectorAll("[role='status']").forEach((el) => {
      if ((el.innerText || "").includes("隐藏彩蛋")) el.style.display = "none";
    });
    const b = document.querySelector(".hud-act-btn.is-wardrobe");
    if (b) b.click();
  });
  await sleep(600);
  await snapDino(3, 200);

  // dino_28 .. dino_31 (4 frames): Click 🧋 试穿 Tripo 喷射套装 + turntable spin
  await page.evaluate(() => {
    document.querySelectorAll("[role='status']").forEach((el) => {
      if ((el.innerText || "").includes("隐藏彩蛋")) el.style.display = "none";
    });
    const btns = Array.from(document.querySelectorAll("#ans-sanctuary-wardrobe-modal button"));
    const tBtn = btns.find((b) => b.innerText.includes("Tripo"));
    if (tBtn) tBtn.click();
  });
  await sleep(450);
  await snapDino(4, 220);

  // dino_32 .. dino_35 (4 frames): Click 👑 一键 UR 满配神装 + turntable spin
  await page.evaluate(() => {
    document.querySelectorAll("[role='status']").forEach((el) => {
      if ((el.innerText || "").includes("隐藏彩蛋")) el.style.display = "none";
    });
    const btns = Array.from(document.querySelectorAll("#ans-sanctuary-wardrobe-modal button"));
    const uBtn = btns.find((b) => b.innerText.includes("UR") || b.innerText.includes("神装"));
    if (uBtn) uBtn.click();
  });
  await sleep(450);
  await snapDino(4, 220);
  console.log(`   Captured ${fIdx} Dino frames!`);

  // =========================================================================
  // 4. Chapter 5: /market (ANS 市场 — 发布我的项目或服务 & 平台推流与交易环境)
  // =========================================================================
  console.log("4. Pre-caching /market...");
  await page.setViewport({ width: 1920, height: 2160, deviceScaleFactor: 1 });
  await page.goto("https://ans.cauai.fun/market", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(2200);
  await preCacheAndCleanCards(page);
  await page.screenshot({ path: path.join(OUT_DIR, "market_clean.webp"), type: "webp", quality: 92 });

  // =========================================================================
  // 5. Chapter 6: /teams (社群组队), /competitions (大赛专区), /competitions/agrihackathon (农客松), /hubs (CAUHub)
  // =========================================================================
  console.log("5. Pre-caching /teams, /competitions, /competitions/agrihackathon, and /hubs...");
  await page.setViewport({ width: 1920, height: 1800, deviceScaleFactor: 1 });
  await page.goto("https://ans.cauai.fun/teams", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(1800);
  await preCacheAndCleanCards(page);
  await page.screenshot({ path: path.join(OUT_DIR, "teams_clean.webp"), type: "webp", quality: 92 });

  await page.goto("https://ans.cauai.fun/competitions", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(1800);
  await preCacheAndCleanCards(page);
  await page.screenshot({ path: path.join(OUT_DIR, "competitions_main.webp"), type: "webp", quality: 92 });

  await page.setViewport({ width: 1920, height: 2160, deviceScaleFactor: 1 });
  await page.goto("https://ans.cauai.fun/competitions/agrihackathon", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(2000);
  await preCacheAndCleanCards(page);
  await page.screenshot({ path: path.join(OUT_DIR, "agrihackathon_main.webp"), type: "webp", quality: 92 });

  await page.setViewport({ width: 1920, height: 1300, deviceScaleFactor: 1 });
  await page.goto("https://ans.cauai.fun/hubs", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(1800);
  await page.screenshot({ path: path.join(OUT_DIR, "hubs_main.webp"), type: "webp", quality: 92 });

  await browser.close();
  console.log("All live tour assets pre-cached and captured to:", OUT_DIR);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
