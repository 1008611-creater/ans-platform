// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// 测试替身刻意使用宽松类型，模拟 Prisma 的任意返回值形状。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const mocks = vi.hoisted(() => ({ db: {} as Row }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import {
  allocateQuota,
  createTeam,
  deleteTeam,
  getTeamDetail,
  getTeamQuota,
  grantTeamQuota,
  inviteMember,
  leaveTeam,
  listMyTeams,
  listTeamLedger,
  removeMember,
  respondToInvite,
  teamPermissions,
  teamSlugify,
  updateMemberRole,
} from "@/server/teams/service";

let store: Row;
let seq = 0;

function nextId(prefix: string) {
  seq += 1;
  return prefix + "-" + seq;
}

function userOf(userId: string) {
  return store.users.find((u: Row) => u.id === userId) ?? null;
}

function memberCard(member: Row) {
  return { ...member, user: userOf(member.userId) };
}

function memberWhere(where: Row) {
  return (m: Row) => {
    if (where.id !== undefined && m.id !== where.id) return false;
    if (where.teamId !== undefined && m.teamId !== where.teamId) return false;
    if (where.userId !== undefined && m.userId !== where.userId) return false;
    if (where.role !== undefined && m.role !== where.role) return false;
    if (where.quotaAllowance !== undefined && m.quotaAllowance !== where.quotaAllowance) return false;
    if (where.status !== undefined) {
      if (typeof where.status === "string") {
        if (m.status !== where.status) return false;
      } else if (!where.status.in.includes(m.status)) return false;
    }
    return true;
  };
}

function seed() {
  seq = 0;
  store = {
    users: [
      { id: "owner", email: "owner@example.test", username: "owner", nickname: "队长", avatar: null, xp: 10, flagged: false, deletedAt: null },
      { id: "admin", email: "admin@example.test", username: "admin", nickname: null, avatar: null, xp: 5, flagged: false, deletedAt: null },
      { id: "admin2", email: "admin2@example.test", username: "admin2", nickname: null, avatar: null, xp: 5, flagged: false, deletedAt: null },
      { id: "member", email: "member@example.test", username: "member", nickname: null, avatar: null, xp: 1, flagged: false, deletedAt: null },
      { id: "outsider", email: "outsider@example.test", username: "outsider", nickname: null, avatar: null, xp: 0, flagged: false, deletedAt: null },
      { id: "flagged", email: "flagged@example.test", username: "flagged", nickname: null, avatar: null, xp: 0, flagged: true, deletedAt: null },
    ],
    teams: [{ id: "team1", name: "星火小队", slug: "spark", description: "测试团队", avatar: null, ownerId: "owner", createdAt: new Date("2026-09-01T00:00:00Z") }],
    members: [
      { id: "tm-owner", teamId: "team1", userId: "owner", role: "OWNER", status: "ACTIVE", quotaAllowance: 0, quotaUsed: 0, joinedAt: new Date("2026-09-01T00:00:00Z") },
      { id: "tm-admin", teamId: "team1", userId: "admin", role: "ADMIN", status: "ACTIVE", quotaAllowance: 0, quotaUsed: 0, joinedAt: new Date("2026-09-02T00:00:00Z") },
      { id: "tm-admin2", teamId: "team1", userId: "admin2", role: "ADMIN", status: "ACTIVE", quotaAllowance: 0, quotaUsed: 0, joinedAt: new Date("2026-09-02T00:00:00Z") },
      { id: "tm-member", teamId: "team1", userId: "member", role: "MEMBER", status: "ACTIVE", quotaAllowance: 0, quotaUsed: 0, joinedAt: new Date("2026-09-03T00:00:00Z") },
    ],
    ledger: [] as Row[],
    audits: [] as Row[],
    runs: [] as Row[],
    teamCompetitions: [] as Row[],
  };
}

function buildDb() {
  const db: Row = {};

  db.$transaction = vi.fn(async (work: (tx: Row) => Promise<unknown>) => {
    const snapshot = JSON.parse(JSON.stringify({ teams: store.teams, members: store.members, ledger: store.ledger, audits: store.audits }));
    try {
      return await work(db);
    } catch (error) {
      store.teams = snapshot.teams;
      store.members = snapshot.members;
      store.ledger = snapshot.ledger;
      store.audits = snapshot.audits;
      throw error;
    }
  });

  db.team = {
    findUnique: vi.fn(async ({ where }: Row) => {
      const team = where.slug ? store.teams.find((t: Row) => t.slug === where.slug) : store.teams.find((t: Row) => t.id === where.id);
      if (!team) return null;
      const owner = userOf(team.ownerId);
      return { ...team, owner: owner ? { id: owner.id, username: owner.username, nickname: owner.nickname } : null };
    }),
    create: vi.fn(async ({ data }: Row) => {
      const team = { id: nextId("team"), avatar: null, createdAt: new Date(), ...data };
      store.teams.push(team);
      const owner = userOf(team.ownerId);
      return { ...team, owner: owner ? { id: owner.id, username: owner.username, nickname: owner.nickname } : null };
    }),
    update: vi.fn(async ({ where, data }: Row) => {
      const team = store.teams.find((t: Row) => t.id === where.id);
      Object.assign(team, data);
      return team;
    }),
    delete: vi.fn(async ({ where }: Row) => {
      store.teams = store.teams.filter((t: Row) => t.id !== where.id);
      store.members = store.members.filter((m: Row) => m.teamId !== where.id);
      return { id: where.id };
    }),
  };

  db.teamMember = {
    findFirst: vi.fn(async ({ where, select }: Row) => {
      const found = store.members.find(memberWhere(where));
      if (!found) return null;
      return select?.user ? memberCard(found) : { ...found };
    }),
    findMany: vi.fn(async ({ where, select }: Row) => {
      const rows = store.members.filter(memberWhere(where));
      if (select?.user) return rows.map(memberCard);
      if (select?.team) {
        return rows.map((m: Row) => ({
          ...m,
          team: {
            ...store.teams.find((t: Row) => t.id === m.teamId),
            _count: { members: store.members.filter((x: Row) => x.teamId === m.teamId && x.status === "ACTIVE").length },
          },
        }));
      }
      return rows.map((m: Row) => ({ ...m }));
    }),
    findUnique: vi.fn(async ({ where }: Row) => {
      const key = where.teamId_userId;
      return store.members.find((m: Row) => m.teamId === key.teamId && m.userId === key.userId) ?? null;
    }),
    create: vi.fn(async ({ data }: Row) => {
      const member = { id: nextId("tm"), quotaAllowance: 0, quotaUsed: 0, joinedAt: new Date(), ...data };
      store.members.push(member);
      return { ...member };
    }),
    update: vi.fn(async ({ where, data }: Row) => {
      const member = store.members.find((m: Row) => m.id === where.id);
      Object.assign(member, data);
      return { ...member };
    }),
    updateMany: vi.fn(async ({ where, data }: Row) => {
      const rows = store.members.filter(memberWhere(where));
      rows.forEach((m: Row) => Object.assign(m, data));
      return { count: rows.length };
    }),
    count: vi.fn(async ({ where }: Row) => store.members.filter(memberWhere(where)).length),
    aggregate: vi.fn(async ({ where }: Row) => {
      const rows = store.members.filter(memberWhere(where));
      return {
        _sum: {
          quotaAllowance: rows.reduce((a: number, m: Row) => a + m.quotaAllowance, 0),
          quotaUsed: rows.reduce((a: number, m: Row) => a + m.quotaUsed, 0),
        },
      };
    }),
  };

  db.user = {
    findFirst: vi.fn(async ({ where }: Row) => {
      return (
        store.users.find((u: Row) => {
          if (where.deletedAt === null && u.deletedAt !== null) return false;
          if (where.email !== undefined) return u.email === where.email;
          if (where.username !== undefined) return u.username === where.username;
          return true;
        }) ?? null
      );
    }),
  };

  db.quotaLedger = {
    create: vi.fn(async ({ data }: Row) => {
      const row = { id: nextId("ql"), createdAt: new Date(), balanceAfter: null, note: null, ...data };
      store.ledger.push(row);
      return { ...row };
    }),
    aggregate: vi.fn(async ({ where }: Row) => {
      const rows = store.ledger.filter(
        (l: Row) =>
          (!where.refType || l.refType === where.refType) &&
          (!where.refId || l.refId === where.refId) &&
          (!where.reason || where.reason.in.includes(l.reason))
      );
      return { _sum: { amount: rows.reduce((a: number, l: Row) => a + l.amount, 0) } };
    }),
    findMany: vi.fn(async ({ where, take }: Row) => {
      let rows = store.ledger.filter((l: Row) => {
        if (where.refType && l.refType !== where.refType) return false;
        if (where.refId && l.refId !== where.refId) return false;
        if (where.userId?.in && !where.userId.in.includes(l.userId)) return false;
        return true;
      });
      if (take) rows = rows.slice(0, take);
      return rows.map((l: Row) => ({ ...l, user: l.userId ? userOf(l.userId) : null }));
    }),
  };

  db.auditLog = {
    create: vi.fn(async ({ data }: Row) => {
      const row = { id: nextId("audit"), createdAt: new Date(), ...data };
      store.audits.push(row);
      return { ...row };
    }),
  };

  db.teamCompetition = { findMany: vi.fn(async () => store.teamCompetitions) };
  db.run = { findMany: vi.fn(async () => store.runs) };

  return db;
}

function actions() {
  return store.audits.map((a: Row) => a.action);
}

beforeEach(() => {
  seed();
  const fresh = buildDb();
  for (const key of Object.keys(mocks.db)) delete mocks.db[key];
  Object.assign(mocks.db, fresh);
});

describe("teamPermissions 权限矩阵", () => {
  it("队长拥有全部能力", () => {
    expect(teamPermissions("OWNER")).toEqual({
      canInvite: true,
      canRemoveMember: true,
      canManageRoles: true,
      canAllocateQuota: true,
      canDeleteTeam: true,
      canViewQuota: true,
    });
  });

  it("管理员能邀请与分配额度，但不能改角色或解散", () => {
    const p = teamPermissions("ADMIN");
    expect(p.canInvite).toBe(true);
    expect(p.canAllocateQuota).toBe(true);
    expect(p.canManageRoles).toBe(false);
    expect(p.canDeleteTeam).toBe(false);
  });

  it("普通成员只能查看额度", () => {
    const p = teamPermissions("MEMBER");
    expect(p.canViewQuota).toBe(true);
    expect(p.canInvite).toBe(false);
    expect(p.canRemoveMember).toBe(false);
  });

  it("非成员没有任何能力", () => {
    expect(teamPermissions(null)).toEqual({
      canInvite: false,
      canRemoveMember: false,
      canManageRoles: false,
      canAllocateQuota: false,
      canDeleteTeam: false,
      canViewQuota: false,
    });
  });
});

describe("teamSlugify", () => {
  it("英文名生成可读 slug", () => {
    expect(teamSlugify("Spark Team")).toBe("spark-team");
  });

  it("中文名回退到随机短标识，避免 slug 为空", () => {
    const slug = teamSlugify("星火小队");
    expect(slug.startsWith("team-")).toBe(true);
    expect(slug.length).toBeGreaterThan(5);
  });
});

describe("创建团队", () => {
  it("创建者自动成为队长，并写审计", async () => {
    const team = await createTeam("outsider", { name: "新团队", description: "一起参赛" });
    expect(team.memberCount).toBe(1);
    const membership = store.members.find((m: Row) => m.teamId === team.id && m.userId === "outsider");
    expect(membership.role).toBe("OWNER");
    expect(membership.status).toBe("ACTIVE");
    expect(actions()).toContain("TEAM_CREATED");
  });

  it("名称过短或过长直接拒绝", async () => {
    await expect(createTeam("outsider", { name: "短" })).rejects.toMatchObject({ code: "validation_error" });
    await expect(createTeam("outsider", { name: "长".repeat(41) })).rejects.toMatchObject({ code: "validation_error" });
  });

  it("简介超长直接拒绝", async () => {
    await expect(createTeam("outsider", { name: "正常团队", description: "x".repeat(501) })).rejects.toMatchObject({ code: "validation_error" });
  });
});

describe("邀请成员", () => {
  it("管理员可以邀请普通成员，写审计且状态为待接受", async () => {
    const result = await inviteMember("admin", "spark", { identifier: "outsider", role: "MEMBER" });
    expect(result.member.status).toBe("PENDING");
    expect(actions()).toContain("TEAM_MEMBER_INVITED");
  });

  it("管理员不能邀请管理员", async () => {
    await expect(inviteMember("admin", "spark", { identifier: "outsider", role: "ADMIN" })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("队长可以邀请管理员", async () => {
    const result = await inviteMember("owner", "spark", { identifier: "outsider", role: "ADMIN" });
    expect(result.member.role).toBe("ADMIN");
  });

  it("不能邀请自己", async () => {
    await expect(inviteMember("owner", "spark", { identifier: "owner" })).rejects.toMatchObject({ code: "self_invite" });
  });

  it("已在团队中的成员不能重复邀请", async () => {
    await expect(inviteMember("owner", "spark", { identifier: "member" })).rejects.toMatchObject({ code: "already_member" });
  });

  it("被封禁账号不可邀请", async () => {
    await expect(inviteMember("owner", "spark", { identifier: "flagged" })).rejects.toMatchObject({ code: "user_unavailable" });
  });

  it("找不到用户时给出明确错误", async () => {
    await expect(inviteMember("owner", "spark", { identifier: "nobody" })).rejects.toMatchObject({ code: "user_not_found" });
  });

  it("普通成员没有邀请权限", async () => {
    await expect(inviteMember("member", "spark", { identifier: "outsider" })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("非成员无法邀请", async () => {
    await expect(inviteMember("outsider", "spark", { identifier: "member" })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("接受与拒绝邀请", () => {
  it("接受后成为正式成员并写审计", async () => {
    store.members.push({ id: "tm-pending", teamId: "team1", userId: "outsider", role: "MEMBER", status: "PENDING", quotaAllowance: 0, quotaUsed: 0, joinedAt: new Date() });
    const result = await respondToInvite("outsider", "spark", "accept");
    expect(result.status).toBe("ACTIVE");
    expect(actions()).toContain("TEAM_MEMBER_JOINED");
  });

  it("拒绝后状态变为 LEFT", async () => {
    store.members.push({ id: "tm-pending", teamId: "team1", userId: "outsider", role: "MEMBER", status: "PENDING", quotaAllowance: 0, quotaUsed: 0, joinedAt: new Date() });
    const result = await respondToInvite("outsider", "spark", "decline");
    expect(result.status).toBe("LEFT");
    expect(actions()).toContain("TEAM_MEMBER_DECLINED");
  });

  it("没有待处理邀请时报 404", async () => {
    await expect(respondToInvite("outsider", "spark", "accept")).rejects.toMatchObject({ code: "invite_not_found" });
  });

  it("并发下重复接受只生效一次", async () => {
    store.members.push({ id: "tm-pending", teamId: "team1", userId: "outsider", role: "MEMBER", status: "PENDING", quotaAllowance: 0, quotaUsed: 0, joinedAt: new Date() });
    const first = await respondToInvite("outsider", "spark", "accept");
    expect(first.status).toBe("ACTIVE");
    await expect(respondToInvite("outsider", "spark", "accept")).rejects.toMatchObject({ code: "invite_not_found" });
  });
});

describe("角色调整", () => {
  it("队长可以提升成员为管理员", async () => {
    await updateMemberRole("owner", "spark", "tm-member", "ADMIN");
    expect(store.members.find((m: Row) => m.id === "tm-member").role).toBe("ADMIN");
    expect(actions()).toContain("TEAM_ROLE_CHANGED");
  });

  it("管理员不能调整角色", async () => {
    await expect(updateMemberRole("admin", "spark", "tm-member", "ADMIN")).rejects.toMatchObject({ code: "forbidden" });
  });

  it("不能降级队长", async () => {
    await expect(updateMemberRole("owner", "spark", "tm-owner", "MEMBER")).rejects.toMatchObject({ code: "last_owner" });
  });

  it("转让队长后原队长降为管理员，团队 ownerId 同步", async () => {
    await updateMemberRole("owner", "spark", "tm-member", "OWNER");
    expect(store.members.find((m: Row) => m.id === "tm-member").role).toBe("OWNER");
    expect(store.members.find((m: Row) => m.id === "tm-owner").role).toBe("ADMIN");
    expect(store.teams[0].ownerId).toBe("member");
    expect(actions()).toContain("TEAM_OWNERSHIP_TRANSFERRED");
  });

  it("角色值非法直接拒绝", async () => {
    await expect(updateMemberRole("owner", "spark", "tm-member", "SUPER" as never)).rejects.toMatchObject({ code: "validation_error" });
  });
});

describe("移除成员与退出", () => {
  it("队长可以移除普通成员", async () => {
    await removeMember("owner", "spark", "tm-member");
    expect(store.members.find((m: Row) => m.id === "tm-member").status).toBe("LEFT");
    expect(actions()).toContain("TEAM_MEMBER_REMOVED");
  });

  it("管理员不能移除管理员", async () => {
    await expect(removeMember("admin", "spark", "tm-admin2")).rejects.toMatchObject({ code: "forbidden" });
  });

  it("任何人都不能移除队长", async () => {
    await expect(removeMember("owner", "spark", "tm-owner")).rejects.toMatchObject({ code: "last_owner" });
  });

  it("普通成员不能移除他人", async () => {
    await expect(removeMember("member", "spark", "tm-admin")).rejects.toMatchObject({ code: "forbidden" });
  });

  it("普通成员可以主动退出", async () => {
    const result = await leaveTeam("member", "spark");
    expect(result.status).toBe("LEFT");
    expect(actions()).toContain("TEAM_MEMBER_LEFT");
  });

  it("队长必须先转让才能退出", async () => {
    await expect(leaveTeam("owner", "spark")).rejects.toMatchObject({ code: "owner_must_transfer" });
  });

  it("不在团队中的人退出报 404", async () => {
    await expect(leaveTeam("outsider", "spark")).rejects.toMatchObject({ code: "member_not_found" });
  });
});

describe("团队额度", () => {
  it("管理员发放的额度计入团队总额", async () => {
    await grantTeamQuota("admin", "team1", 500, "比赛额度");
    const quota = await getTeamQuota("team1");
    expect(quota.granted).toBe(500);
    expect(quota.available).toBe(500);
    expect(actions()).toContain("TEAM_QUOTA_GRANTED");
  });

  it("发放额度不能为 0 或非整数", async () => {
    await expect(grantTeamQuota("admin", "team1", 0)).rejects.toMatchObject({ code: "validation_error" });
    await expect(grantTeamQuota("admin", "team1", 1.5)).rejects.toMatchObject({ code: "validation_error" });
  });

  it("团队不存在时发放报 404", async () => {
    await expect(grantTeamQuota("admin", "nope", 10)).rejects.toMatchObject({ code: "team_not_found" });
  });

  it("队长可以给成员分配额度并写流水", async () => {
    await grantTeamQuota("admin", "team1", 300);
    const result = await allocateQuota("owner", "spark", "tm-member", 100);
    expect(result.quotaAllowance).toBe(100);
    const quota = await getTeamQuota("team1");
    expect(quota.allocated).toBe(100);
    expect(quota.available).toBe(200);
    expect(store.ledger.some((l: Row) => l.refType === "team_member" && l.amount === 100)).toBe(true);
  });

  it("不能给自己分配额度", async () => {
    await grantTeamQuota("admin", "team1", 300);
    await expect(allocateQuota("owner", "spark", "tm-owner", 50)).rejects.toMatchObject({ code: "self_allocation" });
  });

  it("管理员不能给其他管理员分配额度", async () => {
    await grantTeamQuota("admin", "team1", 300);
    await expect(allocateQuota("admin", "spark", "tm-admin2", 50)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("分配额度不能超过团队可用余额", async () => {
    await grantTeamQuota("admin", "team1", 100);
    await expect(allocateQuota("owner", "spark", "tm-member", 101)).rejects.toMatchObject({ code: "insufficient_team_quota" });
  });

  it("额度不能低于成员已消耗量", async () => {
    await grantTeamQuota("admin", "team1", 300);
    await allocateQuota("owner", "spark", "tm-member", 100);
    store.members.find((m: Row) => m.id === "tm-member").quotaUsed = 80;
    await expect(allocateQuota("owner", "spark", "tm-member", 50)).rejects.toMatchObject({ code: "below_used" });
  });

  it("并发下额度被改动会返回冲突而不是覆盖", async () => {
    await grantTeamQuota("admin", "team1", 300);
    const original = mocks.db.teamMember.updateMany;
    mocks.db.teamMember.updateMany = vi.fn(async () => ({ count: 0 }));
    await expect(allocateQuota("owner", "spark", "tm-member", 100)).rejects.toMatchObject({ code: "member_stale" });
    mocks.db.teamMember.updateMany = original;
  });

  it("普通成员不能分配额度", async () => {
    await grantTeamQuota("admin", "team1", 300);
    await expect(allocateQuota("member", "spark", "tm-member", 10)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("额度流水区分团队发放与成员分配", async () => {
    await grantTeamQuota("admin", "team1", 300);
    await allocateQuota("owner", "spark", "tm-member", 60);
    const result = await listTeamLedger("spark", "owner");
    expect(result.grants.length).toBe(1);
    expect(result.ledger.length).toBe(1);
  });
});

describe("团队详情可见性", () => {
  it("访客看不到成员名单与额度", async () => {
    const detail = await getTeamDetail("spark", null);
    expect(detail.members).toBeNull();
    expect(detail.quota).toBeNull();
    expect(detail.runs).toBeNull();
    expect(detail.team.memberCount).toBe(4);
  });

  it("登录但不是成员同样看不到内部信息", async () => {
    const detail = await getTeamDetail("spark", "outsider");
    expect(detail.viewer.isMember).toBe(false);
    expect(detail.members).toBeNull();
  });

  it("成员可以看到名单与额度，权限随角色变化", async () => {
    const detail = await getTeamDetail("spark", "member");
    expect(detail.viewer.isMember).toBe(true);
    expect(detail.viewer.permissions.canInvite).toBe(false);
    expect(detail.members).not.toBeNull();
    expect(detail.quota).not.toBeNull();
    expect(detail.members!.length).toBe(4);
    expect(detail.quota!.granted).toBe(0);
  });

  it("团队不存在报 404", async () => {
    await expect(getTeamDetail("nope", null)).rejects.toMatchObject({ status: 404 });
  });
});

describe("解散团队", () => {
  it("队长输入完整团队名才能解散", async () => {
    await expect(deleteTeam("owner", "spark", "写错了")).rejects.toMatchObject({ code: "confirm_mismatch" });
    const result = await deleteTeam("owner", "spark", "星火小队");
    expect(result.deleted).toBe(true);
    expect(store.teams.length).toBe(0);
    expect(actions()).toContain("TEAM_DELETED");
  });

  it("管理员不能解散团队", async () => {
    await expect(deleteTeam("admin", "spark", "星火小队")).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("我的团队列表", () => {
  it("分别返回已加入团队与待处理邀请", async () => {
    store.members.push({ id: "tm-pending", teamId: "team1", userId: "outsider", role: "MEMBER", status: "PENDING", quotaAllowance: 0, quotaUsed: 0, joinedAt: new Date() });
    const mine = await listMyTeams("outsider");
    expect(mine.teams.length).toBe(0);
    expect(mine.invites.length).toBe(1);
  });

  it("已加入团队带出成员数与我的额度", async () => {
    const mine = await listMyTeams("member");
    expect(mine.teams.length).toBe(1);
    expect(mine.teams[0].team._count.members).toBe(4);
  });
});
