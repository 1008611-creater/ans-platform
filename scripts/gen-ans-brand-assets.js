/**
 * ANS 品牌素材生成脚本
 * 来源：E:/WORKBUDDY/2026-09-03-03-31-00/outputs/ans-logo（v11 定稿）
 * 产出（public/）：
 *   ans-logo-light.svg   透明底黑三角（浅色主题顶栏）
 *   ans-logo-dark.svg    透明底白三角（深色主题顶栏，v11 light 派生只改填充色）
 *   favicon/favicon.svg  v11-dark 圆角方块（现代浏览器标签图标）
 *   favicon/favicon-{96,apple180,manifest-192,manifest-512}.png + favicon.ico 源 PNG
 *   og.png               1200x630 分享预览图（深蓝渐变 + 白三角 + ANS monoline）
 * 运行：NODE_PATH=C:/Users/lsb/node_modules node scripts/gen-ans-brand-assets.js
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SRC = "E:/WORKBUDDY/2026-09-03-03-31-00/outputs/ans-logo";
const PUB = path.join(__dirname, "..", "public");
const FAV = path.join(PUB, "favicon");

async function main() {
  const lightSvg = fs.readFileSync(
    path.join(SRC, "merged/ans-triangle-monogram-v11-light.svg"), "utf8");
  const darkIconSvg = fs.readFileSync(
    path.join(SRC, "merged/ans-triangle-monogram-v11-dark.svg"), "utf8");

  // 1. 顶栏 light：v11 原样
  fs.writeFileSync(path.join(PUB, "ans-logo-light.svg"), lightSvg);

  // 2. 顶栏 dark：同几何，三角填充改近白（mask 负空间透出深色背景 = 白字效果）
  const darkSvg = lightSvg
    .replace('aria-label="ANS negative-space monogram"',
             'aria-label="ANS negative-space monogram (dark)"')
    .replace('<polygon points="240,28 466,392 14,392" fill="#0D1117" mask="url(#carve)"/>',
             '<polygon points="240,28 466,392 14,392" fill="#EDEFF3" mask="url(#carve)"/>');
  if (!darkSvg.includes('#EDEFF3')) throw new Error("dark 派生失败：未找到填充替换目标");
  fs.writeFileSync(path.join(PUB, "ans-logo-dark.svg"), darkSvg);

  // 3. favicon：v11-dark 本身就是圆角方块 app icon
  fs.writeFileSync(path.join(FAV, "favicon.svg"), darkIconSvg);
  const iconSizes = [
    [512, "web-app-manifest-512x512.png"],
    [192, "web-app-manifest-192x192.png"],
    [180, "apple-touch-icon.png"],
    [96, "favicon-96x96.png"],
    [48, "ico-48.png"],
    [32, "ico-32.png"],
    [16, "ico-16.png"],
  ];
  for (const [size, name] of iconSizes) {
    await sharp(Buffer.from(darkIconSvg), { density: 512 })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(FAV, name));
    console.log("favicon:", name, size);
  }

  // 4. og.png 1200x630：深蓝渐变底 + 白色 v11 三角 + ANS monoline 字标
  //    三角几何直接内联 v11-light 的 mask（fill 改白），整体缩放居中偏上
  const triGeom = lightSvg
    .replace(/^[\s\S]*?<mask id="carve">/, "")
    .replace(/<\/mask>[\s\S]*$/, "");
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0A1633"/><stop offset="1" stop-color="#071026"/>
    </linearGradient>
    <mask id="carveOg">${triGeom}</mask>
  </defs>
  <rect width="1200" height="630" fill="url(#ogbg)"/>
  <g transform="translate(600,235) scale(0.72) translate(-240,-210)">
    <polygon points="240,28 466,392 14,392" fill="#EDEFF3" mask="url(#carveOg)"/>
  </g>
  <g stroke="#EDEFF3" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M455 512 L477 452 L499 512"/><path d="M464 490 H490"/>
    <path d="M513 512 V452 M513 452 L547 512 M547 512 V452"/>
    <path d="M593 464 C593 454 587 448 577 448 C567 448 560 454 560 463 C560 473 567 477 576 480 C585 483 592 487 592 497 C592 507 585 512 575 512 C565 512 559 506 559 498"/>
  </g>
  <text x="745" y="492" fill="#8A93A6" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="8">AI NEVER STOPS</text>
</svg>`;
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(PUB, "og.png"));
  console.log("og.png done");

  // 5. 吉祥物（a2r3 薄荷龙 主选，透明 cutout）
  fs.mkdirSync(path.join(PUB, "mascot"), { recursive: true });
  fs.copyFileSync(
    "E:/WORKBUDDY/2026-09-03-03-31-00/outputs/ans-mascot/final/ans-ip-a2r3-cutout.png",
    path.join(PUB, "mascot", "ans-mascot.png"));
  console.log("mascot copied");
}

main().catch(e => { console.error(e); process.exit(1); });
