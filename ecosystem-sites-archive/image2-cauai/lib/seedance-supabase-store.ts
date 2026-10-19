import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StoreState } from "./store";
import type {
  DailyUsage,
  Entitlement,
  Generation,
  Image2UserAssets,
  LicenseCode,
  MediaAsset,
  UserProfile,
  VideoDuration,
  VideoMode,
  VideoProviderMode,
  VideoRatio
} from "./types";
import { nowIso } from "./time";

const migrationFile = "supabase/migrations/202605250002_seedance_guest_store.sql";
const demoCodes = ["WEEK-SEED-2026", "VIP-720P-7D", "FREEWEEK"];
const migrationError =
  `Seedance Supabase store migration is not applied. Run ${migrationFile} in Supabase SQL Editor before setting SEEDANCE_STORE_BACKEND=supabase.`;

let cachedClient: SupabaseClient | undefined;

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  claimed_trial_at: string | null;
  created_at: string;
};

type LicenseCodeRow = {
  id: string;
  code_hash: string;
  plan: "weekly_free";
  max_redemptions: number;
  redeemed_by: string[] | null;
  expires_at: string | null;
  created_at: string;
};

type EntitlementRow = {
  id: string;
  user_id: string;
  plan: "weekly_free";
  starts_at: string;
  ends_at: string;
  daily_limit: number;
  resolution: "720p";
  max_duration_seconds: 15;
  created_at: string;
};

type DailyUsageRow = {
  id: string;
  user_id: string;
  usage_date: string;
  used_count: number;
  limit_count: number;
  updated_at: string;
};

type GenerationRow = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  mode: string;
  ratio: string;
  duration_seconds: number;
  resolution: "720p";
  style: string | null;
  seed: number | null;
  generate_audio: boolean;
  privacy: "private" | "link";
  assets: unknown;
  status: Generation["status"];
  progress: number;
  provider: string;
  provider_task_id: string | null;
  cover_url: string | null;
  video_url: string | null;
  last_frame_url: string | null;
  error_message: string | null;
  operator_name: string | null;
  external_account: string | null;
  source_task_url: string | null;
  operator_note: string | null;
  user_message: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type Image2AssetRow = {
  id: string;
  user_id: string;
  snapshot: unknown;
  created_at: string;
  updated_at: string;
};

export function isSeedanceSupabaseStoreEnabled() {
  return process.env.SEEDANCE_STORE_BACKEND?.trim().toLowerCase() === "supabase";
}

function codeHash(code: string) {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error("SEEDANCE_STORE_BACKEND=supabase requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  cachedClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });

  return cachedClient;
}

function isMissingTableError(error: SupabaseErrorLike) {
  const text = [error.code, error.message, error.details, error.hint].filter(Boolean).join(" ");
  return /PGRST205|schema cache|Could not find the table|relation .* does not exist/i.test(text);
}

function failSupabase(error: SupabaseErrorLike | null, action: string): never {
  if (error && isMissingTableError(error)) throw new Error(migrationError);
  throw new Error(`${action} failed: ${error?.message ?? "Unknown Supabase error."}`);
}

async function selectAll<T>(table: string) {
  const { data, error } = await getSupabaseClient().from(table).select("*");
  if (error) failSupabase(error, `Seedance Supabase select ${table}`);
  return (data ?? []) as T[];
}

async function upsertRows(table: string, rows: object[]) {
  if (rows.length === 0) return;
  const { error } = await (getSupabaseClient().from(table) as any).upsert(rows, { onConflict: "id" });
  if (error) failSupabase(error, `Seedance Supabase upsert ${table}`);
}

function seededLicenseCodes() {
  const now = nowIso();
  return demoCodes.map((code, index): LicenseCode => {
    const hash = codeHash(code);
    return {
      id: `seed_code_${hash.slice(0, 16)}`,
      codeHash: hash,
      plan: "weekly_free",
      maxRedemptions: index === 0 ? 500 : 50,
      redeemedBy: [],
      createdAt: now
    };
  });
}

function toIso(value: string | null | undefined, fallback = nowIso()) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function optionalIso(value: string | null | undefined) {
  if (!value) return undefined;
  return toIso(value);
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asVideoMode(value: string): VideoMode {
  return value === "first-frame" || value === "first-last" || value === "references" ? value : "text";
}

function asRatio(value: string): VideoRatio {
  if (value === "16:9" || value === "9:16" || value === "1:1" || value === "4:3" || value === "3:4" || value === "21:9") {
    return value;
  }
  return "adaptive";
}

function asDuration(value: number): VideoDuration {
  return value === -1 || value === 4 || value === 5 || value === 8 || value === 10 || value === 15 ? value : 15;
}

function asProvider(value: string): VideoProviderMode {
  return value === "seedance" || value === "doubao2api" ? value : "manual";
}

function asAssets(value: unknown): MediaAsset[] {
  return Array.isArray(value) ? (value as MediaAsset[]) : [];
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email ?? undefined,
    displayName: row.display_name || `创作者_${row.id.slice(-4).toUpperCase()}`,
    claimedTrialAt: optionalIso(row.claimed_trial_at),
    createdAt: toIso(row.created_at)
  };
}

function rowToLicenseCode(row: LicenseCodeRow): LicenseCode {
  return {
    id: row.id,
    codeHash: row.code_hash,
    plan: "weekly_free",
    maxRedemptions: row.max_redemptions,
    redeemedBy: row.redeemed_by ?? [],
    expiresAt: optionalIso(row.expires_at),
    createdAt: toIso(row.created_at)
  };
}

function rowToEntitlement(row: EntitlementRow): Entitlement {
  return {
    id: row.id,
    userId: row.user_id,
    plan: "weekly_free",
    startsAt: toIso(row.starts_at),
    endsAt: toIso(row.ends_at),
    dailyLimit: row.daily_limit,
    resolution: "720p",
    maxDurationSeconds: 15,
    createdAt: toIso(row.created_at)
  };
}

function rowToDailyUsage(row: DailyUsageRow): DailyUsage {
  return {
    id: row.id,
    userId: row.user_id,
    usageDate: row.usage_date,
    usedCount: row.used_count,
    limitCount: row.limit_count,
    updatedAt: toIso(row.updated_at)
  };
}

function rowToGeneration(row: GenerationRow): Generation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    prompt: row.prompt,
    mode: asVideoMode(row.mode),
    ratio: asRatio(row.ratio),
    durationSeconds: asDuration(row.duration_seconds),
    resolution: "720p",
    style: row.style ?? undefined,
    seed: row.seed ?? undefined,
    generateAudio: row.generate_audio,
    privacy: row.privacy === "link" ? "link" : "private",
    assets: asAssets(row.assets),
    status: row.status,
    progress: row.progress,
    provider: asProvider(row.provider),
    providerTaskId: row.provider_task_id ?? undefined,
    coverUrl: row.cover_url ?? "",
    videoUrl: row.video_url ?? undefined,
    lastFrameUrl: row.last_frame_url ?? undefined,
    errorMessage: row.error_message ?? undefined,
    operatorName: row.operator_name ?? undefined,
    externalAccount: row.external_account ?? undefined,
    sourceTaskUrl: row.source_task_url ?? undefined,
    operatorNote: row.operator_note ?? undefined,
    userMessage: row.user_message ?? undefined,
    refundedAt: optionalIso(row.refunded_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    completedAt: optionalIso(row.completed_at)
  };
}

function rowToImage2Asset(row: Image2AssetRow): Image2UserAssets {
  return {
    id: row.id,
    userId: row.user_id,
    snapshot: row.snapshot as Image2UserAssets["snapshot"],
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export async function readSeedanceSupabaseStore(): Promise<StoreState> {
  const [users, licenseCodes, entitlements, dailyUsage, generations, image2Assets] = await Promise.all([
    selectAll<ProfileRow>("seedance_profiles"),
    selectAll<LicenseCodeRow>("seedance_license_codes"),
    selectAll<EntitlementRow>("seedance_entitlements"),
    selectAll<DailyUsageRow>("seedance_daily_usage"),
    selectAll<GenerationRow>("seedance_generations"),
    selectAll<Image2AssetRow>("seedance_image2_assets")
  ]);

  return {
    users: users.map(rowToProfile),
    licenseCodes:
      licenseCodes.length > 0 || process.env.SEEDANCE_SEED_DEMO_CODES?.trim().toLowerCase() === "false"
        ? licenseCodes.map(rowToLicenseCode)
        : seededLicenseCodes(),
    entitlements: entitlements.map(rowToEntitlement),
    dailyUsage: dailyUsage.map(rowToDailyUsage),
    generations: generations.map(rowToGeneration),
    image2Assets: image2Assets.map(rowToImage2Asset),
    image2AssetChanges: []
  };
}

export async function writeSeedanceSupabaseStore(state: StoreState) {
  await upsertRows(
    "seedance_profiles",
    state.users.map((user) => ({
      id: user.id,
      email: user.email ?? null,
      display_name: user.displayName,
      claimed_trial_at: user.claimedTrialAt ?? null,
      created_at: user.createdAt
    }))
  );

  await Promise.all([
    upsertRows(
      "seedance_license_codes",
      state.licenseCodes.map((code) => ({
        id: code.id,
        code_hash: code.codeHash,
        plan: code.plan,
        max_redemptions: code.maxRedemptions,
        redeemed_by: code.redeemedBy,
        expires_at: code.expiresAt ?? null,
        created_at: code.createdAt
      }))
    ),
    upsertRows(
      "seedance_entitlements",
      state.entitlements.map((entitlement) => ({
        id: entitlement.id,
        user_id: entitlement.userId,
        plan: entitlement.plan,
        starts_at: entitlement.startsAt,
        ends_at: entitlement.endsAt,
        daily_limit: entitlement.dailyLimit,
        resolution: entitlement.resolution,
        max_duration_seconds: entitlement.maxDurationSeconds,
        created_at: entitlement.createdAt
      }))
    ),
    upsertRows(
      "seedance_daily_usage",
      state.dailyUsage.map((usage) => ({
        id: usage.id,
        user_id: usage.userId,
        usage_date: usage.usageDate,
        used_count: usage.usedCount,
        limit_count: usage.limitCount,
        updated_at: usage.updatedAt
      }))
    ),
    upsertRows(
      "seedance_generations",
      state.generations.map((generation) => ({
        id: generation.id,
        user_id: generation.userId,
        title: generation.title,
        prompt: generation.prompt,
        mode: generation.mode,
        ratio: generation.ratio,
        duration_seconds: generation.durationSeconds,
        resolution: generation.resolution,
        style: generation.style ?? null,
        seed: generation.seed ?? null,
        generate_audio: generation.generateAudio,
        privacy: generation.privacy,
        assets: generation.assets,
        status: generation.status,
        progress: generation.progress,
        provider: generation.provider,
        provider_task_id: generation.providerTaskId ?? null,
        cover_url: generation.coverUrl,
        video_url: generation.videoUrl ?? null,
        last_frame_url: generation.lastFrameUrl ?? null,
        error_message: generation.errorMessage ?? null,
        operator_name: generation.operatorName ?? null,
        external_account: generation.externalAccount ?? null,
        source_task_url: generation.sourceTaskUrl ?? null,
        operator_note: generation.operatorNote ?? null,
        user_message: generation.userMessage ?? null,
        refunded_at: generation.refundedAt ?? null,
        created_at: generation.createdAt,
        updated_at: generation.updatedAt,
        completed_at: generation.completedAt ?? null
      }))
    ),
    upsertRows(
      "seedance_image2_assets",
      state.image2Assets.map((assets) => ({
        id: assets.id,
        user_id: assets.userId,
        snapshot: assets.snapshot,
        created_at: assets.createdAt,
        updated_at: assets.updatedAt
      }))
    )
  ]);
}
