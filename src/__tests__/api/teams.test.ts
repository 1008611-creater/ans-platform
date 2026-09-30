// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  admin: vi.fn(),
  createTeam: vi.fn(),
  listMyTeams: vi.fn(),
  getTeamDetail: vi.fn(),
  deleteTeam: vi.fn(),
  inviteMember: vi.fn(),
  respondToInvite: vi.fn(),
  leaveTeam: vi.fn(),
  listTeamLedger: vi.fn(),
  updateMemberRole: vi.fn(),
  allocateQuota: vi.fn(),
  removeMember: vi.fn(),
  grantTeamQuota: vi.fn(),
  listTeamsForAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/admin-permissions", () => ({ requireAdminPermission: mocks.admin }));
vi.mock("@/server/teams/service", async (original) => ({
  ...(await original<typeof import("@/server/teams/service")>()),
  createTeam: mocks.createTeam,
  listMyTeams: mocks.listMyTeams,
  getTeamDetail: mocks.getTeamDetail,
  deleteTeam: mocks.deleteTeam,
  inviteMember: mocks.inviteMember,
  respondToInvite: mocks.respondToInvite,
  leaveTeam: mocks.leaveTeam,
  listTeamLedger: mocks.listTeamLedger,
  updateMemberRole: mocks.updateMemberRole,
  allocateQuota: mocks.allocateQuota,
  removeMember: mocks.removeMember,
  grantTeamQuota: mocks.grantTeamQuota,
}));
vi.mock("@/server/teams/admin", () => ({
  listTeamsForAdmin: mocks.listTeamsForAdmin,
}));

import { GET as listTeams, POST as createTeamRoute } from "@/app/api/teams/route";
import { DELETE as deleteTeamRoute, GET as teamDetail } from "@/app/api/teams/[slug]/route";
import { POST as inviteRoute } from "@/app/api/teams/[slug]/members/route";
import { DELETE as removeRoute, PATCH as roleRoute, PUT as quotaRoute } from "@/app/api/teams/[slug]/members/[memberId]/route";
import { POST as respondRoute } from "@/app/api/teams/[slug]/invite/route";
import { POST as leaveRoute } from "@/app/api/teams/[slug]/leave/route";
import { GET as ledgerRoute } from "@/app/api/teams/[slug]/ledger/route";
import { GET as adminTeamsRoute } from "@/app/api/admin/teams/route";
import { POST as adminQuotaRoute } from "@/app/api/admin/teams/[id]/quota/route";
import { TeamError } from "@/server/teams/service";

const slugContext = { params: Promise.resolve({ slug: "spark" }) };
const memberContext = { params: Promise.resolve({ slug: "spark", memberId: "tm-1" }) };
const adminContext = { params: Promise.resolve({ id: "team1" }) };

function post(body?: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/teams/spark/members", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user1", role: "USER" } });
  mocks.admin.mockResolvedValue({ userId: "admin1", permissions: null });
  mocks.createTeam.mockResolvedValue({ id: "team1", slug: "spark", name: "星火小队" });
  mocks.listMyTeams.mockResolvedValue({ teams: [], invites: [] });
  mocks.getTeamDetail.mockResolvedValue({ team: { id: "team1" }, viewer: { isMember: false } });
  mocks.deleteTeam.mockResolvedValue({ deleted: true });
  mocks.inviteMember.mockResolvedValue({ member: { id: "tm-1", status: "PENDING" } });
  mocks.respondToInvite.mockResolvedValue({ status: "ACTIVE" });
  mocks.leaveTeam.mockResolvedValue({ status: "LEFT" });
  mocks.listTeamLedger.mockResolvedValue({ grants: [], ledger: [] });
  mocks.updateMemberRole.mockResolvedValue({ role: "ADMIN" });
  mocks.allocateQuota.mockResolvedValue({ quotaAllowance: 100 });
  mocks.removeMember.mockResolvedValue({ status: "LEFT" });
  mocks.grantTeamQuota.mockResolvedValue({ ledger: { amount: 100 }, team: { id: "team1" } });
  mocks.listTeamsForAdmin.mockResolvedValue({ teams: [], pagination: { page: 1, limit: 30, total: 0, totalPages: 0 } });
});

const protectedHandlers = [
  { label: "GET /api/teams", handle: () => listTeams(), method: "GET" },
  { label: "POST /api/teams", handle: () => createTeamRoute(post({ name: "星火小队" })), method: "POST" },
  { label: "DELETE /api/teams/[slug]", handle: () => deleteTeamRoute(post({ confirmName: "星火小队" }, { Origin: "http://localhost" }), slugContext), method: "DELETE" },
  { label: "POST /api/teams/[slug]/members", handle: () => inviteRoute(post({ identifier: "someone" }), slugContext), method: "POST" },
  { label: "PATCH /api/teams/[slug]/members/[memberId]", handle: () => roleRoute(post({ role: "ADMIN" }), memberContext), method: "PATCH" },
  { label: "PUT /api/teams/[slug]/members/[memberId]", handle: () => quotaRoute(post({ quotaAllowance: 10 }), memberContext), method: "PUT" },
  { label: "DELETE /api/teams/[slug]/members/[memberId]", handle: () => removeRoute(post(undefined, { Origin: "http://localhost" }), memberContext), method: "DELETE" },
  { label: "POST /api/teams/[slug]/invite", handle: () => respondRoute(post({ action: "accept" }), slugContext), method: "POST" },
  { label: "POST /api/teams/[slug]/leave", handle: () => leaveRoute(post(undefined, { Origin: "http://localhost" }), slugContext), method: "POST" },
  { label: "GET /api/teams/[slug]/ledger", handle: () => ledgerRoute(new Request("http://localhost/api/teams/spark/ledger"), slugContext), method: "GET" },
];

describe.each(protectedHandlers)("团队接口 $label", ({ handle }) => {
  it("未登录返回 401 且不执行业务逻辑", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await handle();
    expect(response.status).toBe(401);
    expect(mocks.createTeam).not.toHaveBeenCalled();
    expect(mocks.inviteMember).not.toHaveBeenCalled();
    expect(mocks.allocateQuota).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("业务异常按错误码映射状态，且不泄露内部信息", async () => {
    mocks.inviteMember.mockRejectedValue(new TeamError(409, "already_member", "该用户已在团队中"));
    mocks.allocateQuota.mockRejectedValue(new TeamError(409, "insufficient_team_quota", "额度不足"));
    mocks.updateMemberRole.mockRejectedValue(new TeamError(403, "forbidden", "没有权限"));
    mocks.respondToInvite.mockRejectedValue(new TeamError(404, "invite_not_found", "没有待处理的邀请"));
    mocks.leaveTeam.mockRejectedValue(new TeamError(409, "owner_must_transfer", "队长需先转让"));
    mocks.deleteTeam.mockRejectedValue(new TeamError(400, "confirm_mismatch", "请确认团队名"));
    mocks.listTeamLedger.mockRejectedValue(new TeamError(403, "forbidden", "没有权限"));
    mocks.listMyTeams.mockRejectedValue(new TeamError(403, "forbidden", "没有权限"));
    mocks.removeMember.mockRejectedValue(new TeamError(403, "forbidden", "没有权限"));
    mocks.createTeam.mockRejectedValue(new TeamError(400, "validation_error", "团队名称需为 2-40 个字符"));
    const response = await handle();
    expect(response.status).toBeGreaterThanOrEqual(400);
    const text = await response.text();
    expect(text).not.toMatch(/SQL|prisma|secret|password/i);
  });
});

describe("团队接口跨站防护", () => {
  it("跨站邀请被拒绝且不执行业务逻辑", async () => {
    const response = await inviteRoute(
      post({ identifier: "someone" }, { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" }),
      slugContext
    );
    expect(response.status).toBe(403);
    expect(mocks.inviteMember).not.toHaveBeenCalled();
  });

  it("跨站创建团队被拒绝", async () => {
    const response = await createTeamRoute(
      post({ name: "星火小队" }, { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" })
    );
    expect(response.status).toBe(403);
    expect(mocks.createTeam).not.toHaveBeenCalled();
  });

  it("same-origin Origin through reverse proxy is allowed", async () => {
    const response = await createTeamRoute(
      post(
        { name: "spark-team" },
        {
          Origin: "https://ans.cauai.fun",
          "Sec-Fetch-Site": "cross-site",
          "X-Forwarded-Proto": "https",
          "X-Forwarded-Host": "ans.cauai.fun",
        },
      ),
    );
    expect(response.status).toBe(201);
    expect(mocks.createTeam).toHaveBeenCalledWith("user1", { name: "spark-team" });
  });

  it("跨站解散团队被拒绝", async () => {
    const response = await deleteTeamRoute(
      post({ confirmName: "星火小队" }, { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" }),
      slugContext
    );
    expect(response.status).toBe(403);
    expect(mocks.deleteTeam).not.toHaveBeenCalled();
  });
});

describe("团队接口正常路径", () => {
  it("创建团队返回 201 并只用会话用户", async () => {
    const response = await createTeamRoute(post({ name: "星火小队", ownerId: "victim" }));
    expect(response.status).toBe(201);
    expect(mocks.createTeam).toHaveBeenCalledWith("user1", { name: "星火小队", ownerId: "victim" });
  });

  it("邀请成员返回 201", async () => {
    const response = await inviteRoute(post({ identifier: "someone" }), slugContext);
    expect(response.status).toBe(201);
    expect(mocks.inviteMember).toHaveBeenCalledWith("user1", "spark", { identifier: "someone" });
  });

  it("接受邀请返回 200 且只认白名单动作", async () => {
    const response = await respondRoute(post({ action: "accept" }), slugContext);
    expect(response.status).toBe(200);
    expect(mocks.respondToInvite).toHaveBeenCalledWith("user1", "spark", "accept");
  });

  it("非法邀请动作返回 400 且不落业务", async () => {
    const response = await respondRoute(post({ action: "hack" }), slugContext);
    expect(response.status).toBe(400);
    expect(mocks.respondToInvite).not.toHaveBeenCalled();
  });

  it("团队详情对访客可读", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await teamDetail(new Request("http://localhost/api/teams/spark"), slugContext);
    expect(response.status).toBe(200);
    expect(mocks.getTeamDetail).toHaveBeenCalledWith("spark", null);
  });

  it("额度流水读取只认会话用户", async () => {
    const response = await ledgerRoute(new Request("http://localhost/api/teams/spark/ledger?userId=victim"), slugContext);
    expect(response.status).toBe(200);
    expect(mocks.listTeamLedger).toHaveBeenCalledWith("spark", "user1", 50);
  });
});

describe("管理端团队接口", () => {
  it("无权限返回 403", async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await adminTeamsRoute(new Request("http://localhost/api/admin/teams"))).status).toBe(403);
    expect(mocks.listTeamsForAdmin).not.toHaveBeenCalled();
    expect((await adminQuotaRoute(post({ amount: 100 }), adminContext)).status).toBe(403);
  });

  it("管理员可以读取团队总览", async () => {
    const response = await adminTeamsRoute(new Request("http://localhost/api/admin/teams?q=spark&page=2&limit=10"));
    expect(response.status).toBe(200);
    expect(mocks.listTeamsForAdmin).toHaveBeenCalledWith("spark", 2, 10);
  });

  it("发放额度使用管理员身份并返回金额", async () => {
    const response = await adminQuotaRoute(post({ amount: 100 }), adminContext);
    expect(response.status).toBe(200);
    expect(mocks.grantTeamQuota).toHaveBeenCalledWith("admin1", "team1", 100, undefined);
  });

  it("管理端异常不泄露内部信息", async () => {
    mocks.grantTeamQuota.mockRejectedValue(new Error("postgres connection refused secret"));
    const response = await adminQuotaRoute(post({ amount: 100 }), adminContext);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/postgres|secret/i);
  });
});
