import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type {
  SaveWorkbenchAssetInput,
  SaveWorkbenchFeedbackInput,
  WorkbenchAsset,
  WorkbenchAssetGroup,
  WorkbenchAssetKind,
  WorkbenchFeedback,
  WorkbenchFeedbackRating,
  WorkbenchFeedbackStage,
  WorkbenchPromptTemplateStage
} from "./image2-workbench-data";

const workbenchWorkspaceId = "image2-workbench-main";
const workbenchBucket = "image2-workbench-media";

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

type WorkbenchAssetRow = {
  id: string;
  workspace_id: string;
  kind: WorkbenchAssetKind;
  group_label: WorkbenchAssetGroup;
  title: string;
  subtitle: string;
  note: string;
  source_path: string;
  preview_path: string;
  tags: string[] | null;
  prompt_hint: string;
  ratio: string | null;
  origin: "master" | "upload" | "generated";
  stage: WorkbenchPromptTemplateStage | null;
  created_at: string;
  prompt: string | null;
  storage_bucket: string | null;
  storage_object_path: string | null;
  mime_type: string | null;
  updated_at: string;
};

type WorkbenchFeedbackRow = {
  id: string;
  workspace_id: string;
  asset_id: string;
  stage: WorkbenchFeedbackStage;
  rating: WorkbenchFeedbackRating;
  reasons: string[] | null;
  note: string | null;
  prompt: string | null;
  reference_ids: string[] | null;
  created_at: string;
};

const assetKindGroups: Record<WorkbenchAssetKind, WorkbenchAssetGroup> = {
  person: "人物",
  clothing: "服装",
  scene: "场景",
  motion: "动作",
  result: "结果"
};

function text(value: unknown, fallback = "", max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function stringList(value: unknown, maxItems = 12, itemMax = 80) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.map((item) => text(item, "", itemMax)).filter(Boolean))].slice(0, maxItems);
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function getSupabaseConfig(): SupabaseConfig {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, ""),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  };
}

function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) {
    throw new Error("Supabase 工作台存储未配置完整，请检查 URL 和 service role key。");
  }
  return config;
}

let cachedClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  const config = requireSupabaseConfig();
  cachedClient = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
  return cachedClient;
}

function shouldUseSupabaseWorkbench() {
  const mode = process.env.IMAGE2_WORKBENCH_STORAGE_BACKEND?.trim().toLowerCase();
  return mode === "supabase";
}

async function toSignedUrl(storagePath: string) {
  const client = getSupabaseClient();
  const expiresIn = Number(process.env.IMAGE2_WORKBENCH_SIGNED_URL_SECONDS || 6 * 60 * 60);
  const response = await client.storage.from(workbenchBucket).createSignedUrl(storagePath, Math.max(300, expiresIn));
  if (response.error || !response.data?.signedUrl) {
    throw new Error(response.error?.message || "素材签名链接创建失败。");
  }
  return response.data.signedUrl;
}

function toStoragePointer(storagePath: string) {
  return `supabase://${workbenchBucket}/${storagePath}`;
}

function storageObjectPathFor(id: string, mimeType: string, origin: "master" | "upload" | "generated", stage?: WorkbenchPromptTemplateStage) {
  const stageFolder = stage || "manual";
  return `workbench/${origin}/${stageFolder}/${id}.${extensionForMimeType(mimeType)}`;
}

async function toAsset(row: WorkbenchAssetRow): Promise<WorkbenchAsset> {
  const signedUrl = row.storage_object_path ? await toSignedUrl(row.storage_object_path) : undefined;
  return {
    id: row.id,
    kind: row.kind,
    group: row.group_label,
    title: row.title,
    subtitle: row.subtitle,
    note: row.note,
    sourcePath: signedUrl ?? row.source_path,
    previewPath: signedUrl ?? row.preview_path,
    tags: stringList(row.tags, 8, 40),
    promptHint: row.prompt_hint,
    ratio: row.ratio ?? undefined,
    origin: row.origin,
    stage: row.stage ?? undefined,
    createdAt: row.created_at,
    prompt: row.prompt ?? undefined
  };
}

function toFeedback(row: WorkbenchFeedbackRow): WorkbenchFeedback {
  return {
    id: row.id,
    assetId: row.asset_id,
    stage: row.stage,
    rating: row.rating,
    reasons: stringList(row.reasons, 12, 40),
    note: row.note ?? undefined,
    prompt: row.prompt ?? undefined,
    referenceIds: stringList(row.reference_ids, 12, 160),
    createdAt: row.created_at
  };
}

function buildAssetRecord(input: SaveWorkbenchAssetInput, id: string, createdAt: string, sourcePath: string, previewPath: string): WorkbenchAsset {
  const group = assetKindGroups[input.kind];
  const stageLabel = input.stage === "outfit" ? "人物穿搭图" : input.stage === "first-frame" ? "视频首帧图" : undefined;
  return {
    id,
    kind: input.kind,
    group,
    title: text(input.title, input.originalName || stageLabel || "新增素材", 80),
    subtitle:
      input.origin === "generated"
        ? `生成沉淀 · ${stageLabel || "结果图"}`
        : input.origin === "master"
          ? `素材母版 · ${group}`
          : `团队上传 · ${group}`,
    note: text(
      input.note,
      input.origin === "generated"
        ? "由作图工作台自动沉淀，可继续投入下一步流程。"
        : input.origin === "master"
          ? "从动作迁移素材母版迁入，可作为团队公共参考素材。"
          : "团队新增参考素材。",
      260
    ),
    sourcePath,
    previewPath,
    tags: [
      ...new Set([
        ...(input.tags ?? []),
        input.origin === "generated" ? "生成沉淀" : input.origin === "master" ? "素材母版" : "团队上传",
        stageLabel
      ].filter(Boolean) as string[])
    ].slice(0, 5),
    promptHint:
      input.origin === "generated"
        ? `可复用的${stageLabel || "结果图"}；选择后继续进入动作迁移首帧流程。`
        : input.origin === "master"
          ? "素材母版公共资产，适合团队批量选择和复盘。"
          : "团队上传素材，已可加入当前作图流程。",
    origin: input.origin,
    stage: input.stage,
    createdAt,
    prompt: input.prompt?.trim() || undefined
  };
}

async function uploadAssetBuffer(input: SaveWorkbenchAssetInput, id: string) {
  const client = getSupabaseClient();
  const objectPath = storageObjectPathFor(id, input.mimeType, input.origin, input.stage);
  const upload = await client.storage.from(workbenchBucket).upload(objectPath, input.buffer, {
    cacheControl: "31536000",
    contentType: input.mimeType,
    upsert: true
  });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  return objectPath;
}

export async function readCloudWorkbenchAssets(): Promise<WorkbenchAsset[]> {
  const client = getSupabaseClient();
  const response = await client
    .from("image2_workbench_assets")
    .select(
      "id,workspace_id,kind,group_label,title,subtitle,note,source_path,preview_path,tags,prompt_hint,ratio,origin,stage,created_at,prompt,storage_bucket,storage_object_path,mime_type,updated_at"
    )
    .eq("workspace_id", workbenchWorkspaceId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return Promise.all((response.data ?? []).map((row) => toAsset(row as WorkbenchAssetRow)));
}

export async function readCloudWorkbenchFeedback(): Promise<WorkbenchFeedback[]> {
  const client = getSupabaseClient();
  const response = await client
    .from("image2_workbench_feedback")
    .select("id,workspace_id,asset_id,stage,rating,reasons,note,prompt,reference_ids,created_at")
    .eq("workspace_id", workbenchWorkspaceId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return (response.data ?? []).map((row) => toFeedback(row as WorkbenchFeedbackRow));
}

export async function saveCloudWorkbenchAsset(input: SaveWorkbenchAssetInput) {
  const prefix = input.origin === "generated" ? "G" : input.origin === "master" ? "M" : "U";
  const id = input.id || `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
  const createdAt = input.createdAt || new Date().toISOString();
  const storageObjectPath = await uploadAssetBuffer(input, id);
  const previewPath = await toSignedUrl(storageObjectPath);
  const storagePointer = toStoragePointer(storageObjectPath);
  const asset = buildAssetRecord(input, id, createdAt, previewPath, previewPath);
  const client = getSupabaseClient();
  const response = await (client.from("image2_workbench_assets") as any).upsert(
    {
      id: asset.id,
      workspace_id: workbenchWorkspaceId,
      kind: asset.kind,
      group_label: asset.group,
      title: asset.title,
      subtitle: asset.subtitle,
      note: asset.note,
      source_path: storagePointer,
      preview_path: storagePointer,
      tags: asset.tags,
      prompt_hint: asset.promptHint,
      ratio: asset.ratio ?? null,
      origin: asset.origin,
      stage: asset.stage ?? null,
      created_at: asset.createdAt ?? createdAt,
      prompt: asset.prompt ?? null,
      storage_bucket: workbenchBucket,
      storage_object_path: storageObjectPath,
      mime_type: input.mimeType,
      updated_at: createdAt
    },
    { onConflict: "id" }
  );

  if (response.error) {
    throw new Error(response.error.message);
  }

  return asset;
}

export async function saveCloudWorkbenchFeedback(input: SaveWorkbenchFeedbackInput & { id?: string; createdAt?: string }) {
  const client = getSupabaseClient();
  const createdAt = input.createdAt || new Date().toISOString();
  const feedback: WorkbenchFeedback = {
    id: input.id || `F-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
    assetId: text(input.assetId, "", 160),
    stage: input.stage,
    rating: input.rating,
    reasons: stringList(input.reasons, 8, 40),
    note: input.note?.trim() ? text(input.note, "", 500) : undefined,
    prompt: input.prompt?.trim() ? text(input.prompt, "", 4000) : undefined,
    referenceIds: stringList(input.referenceIds, 10, 160),
    createdAt
  };

  const response = await (client.from("image2_workbench_feedback") as any).insert({
    id: feedback.id,
    workspace_id: workbenchWorkspaceId,
    asset_id: feedback.assetId,
    stage: feedback.stage,
    rating: feedback.rating,
    reasons: feedback.reasons,
    note: feedback.note ?? null,
    prompt: feedback.prompt ?? null,
    reference_ids: feedback.referenceIds,
    created_at: feedback.createdAt
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return feedback;
}

export function isSupabaseWorkbenchEnabled() {
  return shouldUseSupabaseWorkbench();
}
