import { getSupabaseConfig, serviceHeaders } from "@/lib/image2-membership";

export type AdminResourceStatus = "not_configured" | "ready" | "unavailable";

export type Image2AdminProfileSummary = {
  createdAt: string;
  displayName: string;
  email?: string;
  id: string;
  role: "admin" | "user";
  updatedAt: string;
};

export type Image2AdminOverview = {
  generatedAt: string;
  storageMode: "not-configured" | "supabase-postgres";
  users: {
    admins: number;
    message: string;
    recent: Image2AdminProfileSummary[];
    status: AdminResourceStatus;
    total: number;
  };
  memberships: {
    active: number;
    byPlan: Array<{ count: number; plan: string }>;
    expired: number;
    message: string;
    status: AdminResourceStatus;
    total: number;
  };
  licenses: {
    active: number;
    disabled: number;
    expired: number;
    message: string;
    status: AdminResourceStatus;
    total: number;
    used: number;
  };
  redemptions: {
    failed: number;
    message: string;
    status: AdminResourceStatus;
    succeeded: number;
    total: number;
  };
};

type ProfileRow = {
  created_at: string;
  display_name: string;
  email: string | null;
  id: string;
  role: string;
  updated_at: string;
};

type EntitlementRow = {
  ends_at: string;
  plan: string;
  status: string;
};

type LicenseRow = {
  status: string;
};

type RedemptionRow = {
  result: string;
};

function unavailableMessage(resource: string) {
  return `${resource}当前不可读取；可能尚未迁移或暂时不可用。`;
}

function notConfiguredOverview(): Image2AdminOverview {
  return {
    generatedAt: new Date().toISOString(),
    storageMode: "not-configured",
    users: { admins: 0, message: "Supabase 服务端配置不完整。", recent: [], status: "not_configured", total: 0 },
    memberships: { active: 0, byPlan: [], expired: 0, message: "Supabase 服务端配置不完整。", status: "not_configured", total: 0 },
    licenses: { active: 0, disabled: 0, expired: 0, message: "Supabase 服务端配置不完整。", status: "not_configured", total: 0, used: 0 },
    redemptions: { failed: 0, message: "Supabase 服务端配置不完整。", status: "not_configured", succeeded: 0, total: 0 }
  };
}

async function selectRows<T>(table: string, query: string): Promise<{ rows: T[]; status: AdminResourceStatus }> {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || !config.serviceRoleKey) return { rows: [], status: "not_configured" };

  const response = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
    cache: "no-store",
    headers: serviceHeaders("count=exact")
  }).catch(() => null);

  if (!response?.ok) return { rows: [], status: "unavailable" };
  const rows = (await response.json().catch(() => [])) as T[];
  return { rows: Array.isArray(rows) ? rows : [], status: "ready" };
}

function countBy<T>(rows: T[], read: (row: T) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = read(row).trim() || "未标注";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([plan, count]) => ({ plan, count }))
    .sort((left, right) => right.count - left.count || left.plan.localeCompare(right.plan, "zh-CN"));
}

export async function readImage2AdminOverview(): Promise<Image2AdminOverview> {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || !config.serviceRoleKey) return notConfiguredOverview();

  const [profiles, entitlements, licenses, redemptions] = await Promise.all([
    selectRows<ProfileRow>(
      "profiles",
      "select=id,email,display_name,role,created_at,updated_at&order=created_at.desc&limit=200"
    ),
    selectRows<EntitlementRow>("entitlements", "select=plan,status,ends_at&order=ends_at.desc&limit=1000"),
    selectRows<LicenseRow>("license_codes", "select=status&limit=5000"),
    selectRows<RedemptionRow>("license_redemptions", "select=result&order=created_at.desc&limit=5000")
  ]);

  const now = Date.now();
  const activeEntitlements = entitlements.rows.filter(
    (row) => row.status === "active" && Number.isFinite(Date.parse(row.ends_at)) && Date.parse(row.ends_at) > now
  );
  const expiredEntitlements = entitlements.rows.filter(
    (row) => row.status === "expired" || (Number.isFinite(Date.parse(row.ends_at)) && Date.parse(row.ends_at) <= now)
  );

  return {
    generatedAt: new Date().toISOString(),
    storageMode: "supabase-postgres",
    users: {
      admins: profiles.rows.filter((row) => row.role === "admin").length,
      message: profiles.status === "ready" ? "读取 public.profiles，只返回运营必要字段。" : unavailableMessage("用户档案"),
      recent: profiles.rows.slice(0, 100).map((row) => ({
        createdAt: row.created_at,
        displayName: row.display_name || "Creator",
        email: row.email ?? undefined,
        id: row.id,
        role: row.role === "admin" ? "admin" : "user",
        updatedAt: row.updated_at
      })),
      status: profiles.status,
      total: profiles.rows.length
    },
    memberships: {
      active: activeEntitlements.length,
      byPlan: countBy(entitlements.rows, (row) => row.plan),
      expired: expiredEntitlements.length,
      message: entitlements.status === "ready" ? "读取 entitlements 状态和方案，不返回用户凭据。" : unavailableMessage("会员权益"),
      status: entitlements.status,
      total: entitlements.rows.length
    },
    licenses: {
      active: licenses.rows.filter((row) => row.status === "active").length,
      disabled: licenses.rows.filter((row) => row.status === "disabled").length,
      expired: licenses.rows.filter((row) => row.status === "expired").length,
      message: licenses.status === "ready" ? "仅聚合卡密状态，不读取或返回卡密哈希。" : unavailableMessage("卡密状态"),
      status: licenses.status,
      total: licenses.rows.length,
      used: licenses.rows.filter((row) => row.status === "used").length
    },
    redemptions: {
      failed: redemptions.rows.filter((row) => row.result !== "succeeded").length,
      message: redemptions.status === "ready" ? "仅聚合兑换结果，不返回请求哈希、IP 哈希或用户代理。" : unavailableMessage("兑换审计"),
      status: redemptions.status,
      succeeded: redemptions.rows.filter((row) => row.result === "succeeded").length,
      total: redemptions.rows.length
    }
  };
}
