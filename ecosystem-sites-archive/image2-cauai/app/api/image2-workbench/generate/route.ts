import { image2GenerationAccessPayload, image2UsagePayload, refundImage2GenerationUsage, reserveImage2GenerationUsage, type Image2GenerationUsageReservation } from "@/lib/image2-wallet";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { generateImage2, type ReferenceImage } from "@/lib/image2-generation";
import { image2WorkbenchAccessResponse, requireImage2WorkbenchTeamMember } from "@/lib/image2-workbench-access";
import { loadImage2WorkbenchData, saveImage2WorkbenchAsset, type WorkbenchPromptTemplateStage } from "@/lib/image2-workbench-data";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";
export const maxDuration = 180;

function mimeFor(filePath: string) {
  const targetPath = /^https?:\/\//i.test(filePath) ? new URL(filePath).pathname : filePath;
  const ext = path.extname(targetPath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function resolveReferencePath(filePath: string) {
  if (filePath.startsWith("/")) {
    return path.join(/* turbopackIgnore: true */ process.cwd(), "public", filePath.replace(/^\/+/, ""));
  }
  return filePath;
}

async function fileToReference(name: string, filePath: string): Promise<ReferenceImage> {
  if (isHttpUrl(filePath)) {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`参考图读取失败：${response.status}`);
    }
    const contentType = response.headers.get("content-type")?.split(";", 1)[0] || mimeFor(filePath);
    if (!contentType.startsWith("image/")) {
      throw new Error("参考图链接不是有效图片。");
    }
    const file = Buffer.from(await response.arrayBuffer());
    return {
      name,
      dataUrl: `data:${contentType};base64,${file.toString("base64")}`
    };
  }

  const resolvedPath = resolveReferencePath(filePath);
  const file = await readFile(/* turbopackIgnore: true */ resolvedPath);
  return {
    name,
    dataUrl: `data:${mimeFor(resolvedPath)};base64,${file.toString("base64")}`
  };
}

function normalizeDataUrlReferences(value: unknown): ReferenceImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 4)
    .filter((item): item is { name?: unknown; dataUrl?: unknown } => Boolean(item && typeof item === "object"))
    .map((item, index) => ({
      name: typeof item.name === "string" ? item.name : `generated-reference-${index + 1}.png`,
      dataUrl: typeof item.dataUrl === "string" && item.dataUrl.startsWith("data:image/") ? item.dataUrl : undefined
    }))
    .filter((item): item is { name: string; dataUrl: string } => Boolean(item.dataUrl));
}

function decodeGeneratedImage(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) throw new Error("生成图片格式无法写入结果库。");
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

export async function POST(request: NextRequest) {
  const reservations: Image2GenerationUsageReservation[] = [];
  try {
    const access = await requireImage2WorkbenchTeamMember(request);
    const body = (await request.json()) as Record<string, unknown>;
    const prompt = String(body.prompt ?? "").trim();
    if (prompt.length < 12) {
      return NextResponse.json({ error: "提示词太短，请至少写清主体、参考图关系和画面目标。" }, { status: 400 });
    }

    const size = typeof body.size === "string" ? body.size : "1024x1536";
    const count = Math.min(Math.max(Number(body.n) || 1, 1), 2);
    const stage: WorkbenchPromptTemplateStage = body.stage === "first-frame" ? "first-frame" : "outfit";
    const referenceIds = Array.isArray(body.referenceIds)
      ? body.referenceIds.filter((item): item is string => typeof item === "string").slice(0, 4)
      : [];

    const workbench = await loadImage2WorkbenchData(access);
    const assetsById = new Map(workbench.assets.map((asset) => [asset.id, asset]));
    const idReferences = await Promise.all(
      referenceIds
        .map((id) => assetsById.get(id))
        .filter((asset): asset is NonNullable<ReturnType<typeof assetsById.get>> => Boolean(asset))
        .map((asset) => fileToReference(`${asset.id}.png`, asset.kind === "motion" ? asset.previewPath : asset.sourcePath || asset.previewPath))
    );
    const inlineReferences = normalizeDataUrlReferences(body.references);
    const references = [...idReferences, ...inlineReferences].slice(0, 4);

    for (let i = 0; i < count; i++) {
      reservations.push(await reserveImage2GenerationUsage(request));
    }
    const result = await generateImage2({
      prompt,
      size,
      n: count,
      images: references
    });
    const sharedAssets = await Promise.all(
      result.images.map(async (image, index) => {
        const decoded = decodeGeneratedImage(image.dataUrl);
        return saveImage2WorkbenchAsset({
          buffer: decoded.buffer,
          mimeType: decoded.mimeType,
          kind: "result",
          title: `${stage === "outfit" ? "人物穿搭图" : "视频首帧图"} ${new Date().toLocaleString("zh-CN", { hour12: false })}${result.images.length > 1 ? ` ${index + 1}` : ""}`,
          note: `由工作台生成，使用 ${references.length} 张参考图。`,
          tags: [stage === "outfit" ? "穿搭图" : "首帧图", "Ikun Image2"],
          origin: "generated",
          stage,
          prompt
        });
      })
    );

    return NextResponse.json({
      ...result,
      stage,
      referenceCount: references.length,
      sharedAssets
    });
  } catch (error) {
    for (const r of reservations) { await refundImage2GenerationUsage(r); }
    const quotaErr = image2GenerationAccessPayload(error);
    if (quotaErr) return NextResponse.json(quotaErr, { status: 402 });
    const accessResponse = await image2WorkbenchAccessResponse(error);
    if (accessResponse) return accessResponse;
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "作图失败。") },
      { status: 500 }
    );
  }
}
