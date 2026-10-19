import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createImage2GachaRun,
  getLatestImage2GachaRun,
  isImage2GachaSupabaseEnabled,
  listImage2GachaRuns,
  type Image2GachaCard,
  type Image2GachaMode,
  type Image2GachaParams,
  type Image2GachaSourceCase
} from "@/lib/image2-gacha-store";
import { image2GachaErrorStatus, resolveImage2GachaContext } from "@/lib/image2-gacha-auth";
import { image2AssetSnapshotHasCaseKey, readImage2AssetSnapshotForUser } from "@/lib/image2-assets";
import { getImage2GachaModeConfig } from "@/lib/image2-gacha-config";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

const allowedSizes = new Set(["1024x1024", "1024x1536", "1536x1024"]);
const compositions = ["半身近景", "三分法主体", "低角度英雄构图", "俯视陈列", "居中海报构图", "电影横移视角"];
const lighting = ["柔和棚拍光", "窗边自然光", "逆光轮廓光", "暖金主光", "冷暖对比光", "高亮商业光"];
const palettes = ["奶油白 + 玫瑰红 + 墨黑", "薄荷绿 + 珍珠白 + 金色", "午夜蓝 + 珊瑚粉 + 银灰", "象牙白 + 胭脂红 + 青绿", "黑曜石 + 香槟金 + 云白"];
const textures = ["细腻皮肤与织物纹理", "高级胶片颗粒", "干净商业质感", "手办级可爱抛光", "真实材质微反光", "轻奢包装质感"];
const subjectTypes = ["保留原案例的主体机制", "替换为用户指定主体", "强化人物/产品的第一眼吸引力", "突出造型和材质", "突出场景叙事"];

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMode(value: unknown): Image2GachaMode {
  return value === "single" ? "single" : "pack";
}

function normalizeParams(value: unknown): Image2GachaParams {
  const input = asRecord(value);
  const size = allowedSizes.has(asText(input.size)) ? asText(input.size) : "1024x1536";
  return {
    composition: asText(input.composition, "随机"),
    contentDirection: asText(input.contentDirection, "延续收藏图风格"),
    lighting: asText(input.lighting, "随机"),
    negative: asText(input.negative, "低清晰度、脸部崩坏、手部畸形、文字乱码、过度磨皮、廉价塑料感、直接复制原图"),
    palette: asText(input.palette, "随机"),
    randomStrength: clamp(asNumber(input.randomStrength, 55), 0, 100),
    realismStrength: clamp(asNumber(input.realismStrength, 78), 0, 100),
    referenceFit: clamp(asNumber(input.referenceFit, 72), 0, 100),
    seed: asText(input.seed),
    size,
    styleStrength: clamp(asNumber(input.styleStrength, 74), 0, 100),
    texture: asText(input.texture, "随机")
  };
}

function normalizeSourceCase(value: unknown): Image2GachaSourceCase {
  const input = asRecord(value);
  const key = asText(input.key);
  const title = asText(input.title);
  if (!key || !title) throw new Error("缺少收藏案例来源，请先从案例库收藏一张图。");
  const promptStructure = asRecord(input.promptStructure);
  const reuseProfile = asRecord(input.reuseProfile);

  return {
    caseCode: asText(input.caseCode),
    categoryLabel: asText(input.categoryLabel),
    id: Number.isFinite(Number(input.id)) ? Number(input.id) : undefined,
    imageUrl: asText(input.imageUrl),
    key,
    prompt: asText(input.prompt),
    promptPreview: asText(input.promptPreview),
    promptStructure: {
      composition: asText(promptStructure.composition),
      lighting: asText(promptStructure.lighting),
      materials: asText(promptStructure.materials),
      style: asText(promptStructure.style),
      subject: asText(promptStructure.subject),
      text: asText(promptStructure.text)
    },
    reuseProfile: {
      difficulty: asText(reuseProfile.difficulty),
      label: asText(reuseProfile.label),
      note: asText(reuseProfile.note),
      stability: asText(reuseProfile.stability),
      verdict: asText(reuseProfile.verdict)
    },
    title,
    valueScore: Number.isFinite(Number(input.valueScore)) ? Number(input.valueScore) : undefined
  };
}

function seedToNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: T[], random: () => number) {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function buildCardPrompt(input: {
  mode: Image2GachaMode;
  params: Image2GachaParams;
  randomParams: Record<string, string | number>;
  slot: number;
  sourceCase: Image2GachaSourceCase;
  userGoal: string;
}) {
  const { mode, params, randomParams, slot, sourceCase, userGoal } = input;
  const structure = sourceCase.promptStructure ?? {};
  const promptPreview = sourceCase.promptPreview || sourceCase.prompt || "";
  const goal = userGoal || "基于收藏图的风格 DNA，生成一张可进入案例库复用的新图。";
  const sourceLabel = [sourceCase.caseCode, sourceCase.categoryLabel, sourceCase.title].filter(Boolean).join(" · ");

  return [
    "[Image2 案例库同款抽卡]",
    `源收藏图：${sourceLabel}`,
    `抽卡模式：${mode === "single" ? "单抽试手" : "九抽开包"} · 第 ${slot} 张`,
    "",
    "目标：",
    goal,
    "",
    "复用这张收藏图的视觉 DNA，但生成全新的图片，不复制原图构图和具体资产：",
    `- 主体机制：${structure.subject || "保留源案例的主体关系，并按用户目标替换具体内容"}`,
    `- 风格机制：${structure.style || promptPreview || "高级 Image2 案例库风格，精致、清晰、有商业完成度"}`,
    `- 构图机制：${params.composition === "随机" ? randomParams.composition : params.composition}`,
    `- 镜头/光线：${params.lighting === "随机" ? randomParams.lighting : params.lighting}`,
    `- 色彩：${params.palette === "随机" ? randomParams.palette : params.palette}`,
    `- 材质质感：${params.texture === "随机" ? randomParams.texture : params.texture}`,
    `- 可复用点：${sourceCase.reuseProfile?.note || "提取视觉机制、画面层级、材质和光线，不搬运第三方素材"}`,
    "",
    "本张随机变量：",
    `- 内容方向：${params.contentDirection || randomParams.subjectType}`,
    `- 主体策略：${randomParams.subjectType}`,
    `- 风格强度：${params.styleStrength}/100`,
    `- 真实感强度：${params.realismStrength}/100`,
    `- 参考图贴合度：${params.referenceFit}/100`,
    `- 随机性：${params.randomStrength}/100`,
    "",
    "质量要求：画面第一眼抓人，主体清楚，边缘干净，材质真实，光影有层次，适合被保存为案例库新配方。",
    `负面约束：${params.negative}`
  ].join("\n");
}

function buildCards(input: {
  drawCount: number;
  mode: Image2GachaMode;
  params: Image2GachaParams;
  sourceCase: Image2GachaSourceCase;
  targetSlots: number;
  userGoal: string;
}) {
  const seedSource = input.params.seed?.trim()
    ? `${input.params.seed}:${input.sourceCase.key}:${input.userGoal}`
    : `image2-gacha:${input.sourceCase.key}:${input.userGoal}:${Date.now()}`;
  const seed = seedToNumber(seedSource);
  const random = seededRandom(seed);

  return Array.from({ length: input.targetSlots }, (_, index): Image2GachaCard => {
    const randomParams = {
      composition: pick(compositions, random),
      lighting: pick(lighting, random),
      palette: pick(palettes, random),
      subjectType: pick(subjectTypes, random),
      texture: pick(textures, random),
      variantSeed: Math.floor(random() * 100000)
    };
    const slot = index + 1;
    return {
      cardId: `card-${randomUUID().slice(0, 12)}`,
      prompt: buildCardPrompt({
        mode: input.mode,
        params: input.params,
        randomParams,
        slot,
        sourceCase: input.sourceCase,
        userGoal: input.userGoal
      }),
      randomParams,
      rarity: "待开",
      slot,
      status: index < input.drawCount ? "draft" : "locked"
    };
  });
}

async function assertSourceCaseIsFavorited(sourceCase: Image2GachaSourceCase, userId?: string) {
  if (!isImage2GachaSupabaseEnabled()) return;
  if (!userId) throw new Error("请先登录账号后再使用云端抽卡。");

  const snapshot = await readImage2AssetSnapshotForUser(userId);
  if (!image2AssetSnapshotHasCaseKey(snapshot, sourceCase.key)) {
    throw new Error("这张图还不在你的收藏夹中，请先回案例库收藏后再抽卡。");
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveImage2GachaContext(request, "请先登录账号后再读取抽卡记录。");
    const sourceCaseKey = request.nextUrl.searchParams.get("sourceCaseKey")?.trim() || undefined;

    if (request.nextUrl.searchParams.get("latest") === "1") {
      return NextResponse.json({
        run: await getLatestImage2GachaRun({ sourceCaseKey }, context)
      });
    }

    return NextResponse.json({
      runs: await listImage2GachaRuns(
        {
          limit: Number(request.nextUrl.searchParams.get("limit") || 12),
          sourceCaseKey
        },
        context
      )
    });
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "抽卡记录读取失败。");
    return NextResponse.json({ error: message }, { status: image2GachaErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveImage2GachaContext(request);
    if (!context.userId) {
      return NextResponse.json({ error: "请先登录 ANS 账号后再使用同款抽卡（2 积分/张）。" }, { status: 401 });
    }
    const body = await request.json();
    const mode = normalizeMode(body?.mode);
    const params = normalizeParams(body?.params);
    const sourceCase = normalizeSourceCase(body?.sourceCase);
    const userGoal = asText(body?.userGoal, "基于这张收藏图抽同款风格。");
    await assertSourceCaseIsFavorited(sourceCase, context.userId);
    const modeConfig = getImage2GachaModeConfig(mode);
    const targetSlots = modeConfig.targetSlots;
    const drawCount = modeConfig.drawCount;
    const cards = buildCards({
      drawCount,
      mode,
      params,
      sourceCase,
      targetSlots,
      userGoal
    });

    const run = await createImage2GachaRun({
      cards,
      drawCount,
      mode,
      params,
      sourceCase,
      targetSlots,
      userGoal
    }, context);

    return NextResponse.json({ run });
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "创建抽卡任务失败。");
    return NextResponse.json({ error: message }, { status: image2GachaErrorStatus(message) });
  }
}
