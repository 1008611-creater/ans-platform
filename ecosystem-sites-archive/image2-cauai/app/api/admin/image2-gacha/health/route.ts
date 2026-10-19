import { NextRequest, NextResponse } from "next/server";
import { adminAuthStatus, requireAdmin } from "@/lib/admin-auth";
import { getImage2GachaModeConfig } from "@/lib/image2-gacha-config";
import { getSupabaseConfig, parseSupabaseError, serviceHeaders } from "@/lib/image2-membership";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

type HealthLevel = "critical" | "warning";

type HealthCheck = {
  action?: string;
  id: string;
  label: string;
  level: HealthLevel;
  message: string;
  ok: boolean;
};

const migrations = {
  asset: "supabase/migrations/202605230002_image2_asset_sync_minimal.sql",
  gacha: "supabase/migrations/202606030001_image2_gacha_runs.sql",
  wallet: "supabase/migrations/202605260001_image2_wallet_balance.sql"
};

function envFlag(name: string) {
  return process.env[name]?.trim() || "";
}

function checkEnv(name: string, label: string, expected?: string): HealthCheck {
  const value = envFlag(name);
  const ok = expected ? value.toLowerCase() === expected : Boolean(value);
  return {
    action: ok ? undefined : expected ? `在 Vercel Production 设置 ${name}=${expected}。` : `在 Vercel Production 设置 ${name}。`,
    id: `env:${name}`,
    label,
    level: "critical",
    message: ok ? "已配置" : expected ? `当前值不是 ${expected || ""}` : "未配置",
    ok
  };
}

function restUrl(table: string, select: string) {
  const config = getSupabaseConfig();
  const params = new URLSearchParams({
    limit: "1",
    select
  });
  return `${config.url}/rest/v1/${table}?${params.toString()}`;
}

async function checkTable(input: {
  action: string;
  id: string;
  label: string;
  level?: HealthLevel;
  select: string;
  table: string;
}): Promise<HealthCheck> {
  const level = input.level ?? "critical";
  try {
    const response = await fetch(restUrl(input.table, input.select), {
      cache: "no-store",
      headers: serviceHeaders()
    });

    if (!response.ok) {
      return {
        action: input.action,
        id: input.id,
        label: input.label,
        level,
        message: await parseSupabaseError(response, `${input.table} 读取失败。`),
        ok: false
      };
    }

    return {
      id: input.id,
      label: input.label,
      level,
      message: "可读取",
      ok: true
    };
  } catch (error) {
    return {
      action: input.action,
      id: input.id,
      label: input.label,
      level,
      message: toUserFacingError(error instanceof Error ? error.message : error, `${input.table} 检查失败。`),
      ok: false
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const config = getSupabaseConfig();
    const packModeConfig = getImage2GachaModeConfig("pack");
    const rawPackDrawCount = envFlag("IMAGE2_GACHA_PACK_DRAW_COUNT");
    const packDrawCountConfigured = !rawPackDrawCount || Number.isFinite(Number(rawPackDrawCount));
    const checks: HealthCheck[] = [
      checkEnv("NEXT_PUBLIC_SUPABASE_URL", "Supabase URL"),
      checkEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase publishable/anon key"),
      checkEnv("SUPABASE_SERVICE_ROLE_KEY", "Supabase secret/service role key"),
      checkEnv("IMAGE2_ASSET_SYNC_BACKEND", "收藏夹云端同步", "supabase"),
      checkEnv("IMAGE2_GACHA_BACKEND", "抽卡云端记录", "supabase"),
      {
        action: packDrawCountConfigured ? undefined : "设置 IMAGE2_GACHA_PACK_DRAW_COUNT 为 1 到 9；测试阶段推荐 2。",
        id: "env:IMAGE2_GACHA_PACK_DRAW_COUNT",
        label: "九抽真实生成张数",
        level: "warning",
        message: packDrawCountConfigured ? `当前 ${packModeConfig.drawCount} 张` : "未配置为数字",
        ok: packDrawCountConfigured
      }
    ];

    if (config.url && config.anonKey && config.serviceRoleKey) {
      checks.push(
        ...(await Promise.all([
          checkTable({
            action: `执行 ${migrations.asset}，确保收藏夹快照可同步。`,
            id: "table:image2_asset_snapshots",
            label: "收藏夹来源表",
            select: "user_id",
            table: "image2_asset_snapshots"
          }),
          checkTable({
            action: `正式上线大量抽卡前执行 ${migrations.gacha}；当前可临时写入收藏夹快照。`,
            id: "table:image2_gacha_runs",
            label: "抽卡记录表",
            level: "warning",
            select: "run_id",
            table: "image2_gacha_runs"
          }),
          checkTable({
            action: `正式上线大量抽卡前执行 ${migrations.gacha}；当前可临时写入收藏夹快照。`,
            id: "table:image2_gacha_recipes",
            label: "抽卡配方表",
            level: "warning",
            select: "recipe_id",
            table: "image2_gacha_recipes"
          }),
          checkTable({
            action: `执行 ${migrations.wallet}，确保付费余额可扣减。`,
            id: "table:image2_wallets",
            label: "付费余额表",
            select: "user_id",
            table: "image2_wallets"
          }),
          checkTable({
            action: `执行 ${migrations.wallet}，确保付费余额流水可记录。`,
            id: "table:image2_wallet_transactions",
            label: "付费余额流水表",
            select: "user_id",
            table: "image2_wallet_transactions"
          })
        ]))
      );
    }

    const blocking = checks.filter((check) => !check.ok && check.level === "critical");
    const dedicatedGachaTablesReady = checks
      .filter((check) => check.id === "table:image2_gacha_runs" || check.id === "table:image2_gacha_recipes")
      .every((check) => check.ok);
    const assetSnapshotFallbackReady = Boolean(
      checks.find((check) => check.id === "table:image2_asset_snapshots")?.ok &&
        checks.find((check) => check.id === "env:IMAGE2_ASSET_SYNC_BACKEND")?.ok &&
        checks.find((check) => check.id === "env:IMAGE2_GACHA_BACKEND")?.ok
    );
    const storageMode = dedicatedGachaTablesReady
      ? "dedicated-gacha-tables"
      : assetSnapshotFallbackReady
        ? "asset-snapshot-fallback"
        : "unavailable";
    const nextRequiredAction =
      storageMode === "dedicated-gacha-tables"
        ? null
        : storageMode === "asset-snapshot-fallback"
          ? `执行 ${migrations.gacha}，让抽卡记录和配方从收藏夹快照迁移到正式专表。`
          : "先处理 critical 项，再执行抽卡专表迁移。";
    const ready = blocking.length === 0;

    return NextResponse.json(
      {
        checks,
        config: {
          assetSyncBackend: envFlag("IMAGE2_ASSET_SYNC_BACKEND") || "local",
          gachaBackend: envFlag("IMAGE2_GACHA_BACKEND") || "local",
          assetSnapshotFallbackReady,
          dedicatedGachaTablesReady,
          packDrawCount: packDrawCountConfigured ? packModeConfig.drawCount : null,
          packQuotaCost: packModeConfig.quotaCost,
          packTargetSlots: packModeConfig.targetSlots,
          storageMode,
          supabaseAnonKeyPresent: Boolean(config.anonKey),
          supabaseServiceKeyPresent: Boolean(config.serviceRoleKey),
          supabaseUrlPresent: Boolean(config.url)
        },
        generatedAt: new Date().toISOString(),
        nextRequiredAction,
        ready,
        service: "image2-gacha",
        summary: ready
          ? dedicatedGachaTablesReady
            ? "Image2 抽卡后端预检通过，正式抽卡专表可用。"
            : assetSnapshotFallbackReady
              ? "Image2 抽卡可用：当前先写入账号收藏夹快照，正式抽卡专表待迁移。"
              : "Image2 抽卡后端预检通过。"
          : "Image2 抽卡后端还不能写入生产库，请先处理 critical 项。"
      },
      { status: ready ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: toUserFacingError(error instanceof Error ? error.message : error, "抽卡后端预检失败。")
      },
      { status: adminAuthStatus(error, 400) }
    );
  }
}
