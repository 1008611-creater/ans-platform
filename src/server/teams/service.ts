// P3 团队与配额核心服务
//
// 设计要点：
// - 团队生命周期：创建 → 邀请 → 加入/拒绝 → 角色调整 → 移除/退出 → 解散
// - 权限模型：OWNER > ADMIN > MEMBER，所有动作在服务端强制校验，绝不信任客户端角色
// - 配额链路：管理员发放团队额度 → 队长/管理员分配给成员 → 成员运行时消耗 → 失败退费
// - 审计：每个状态变更与额度变动都写 AuditLog / QuotaLedger，便于对账与追责
// - 并发：额度分配与角色变更走条件更新（updateMany），避免并发下超额发放
import { randomUUID } from "node:crypto";
import { Prisma, type MemberStatus, type TeamRole } from "@prisma/client";
import { db } from "@/lib/db";

export class TeamError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export const TEAM_NAME_MIN = 2;
export const TEAM_NAME_MAX = 40;
export const TEAM_DESCRIPTION_MAX = 500;
export const TEAM_MEMBER_CAP = 50;
export const TEAM_MAX_PENDING_INVITES = 20;
export const TEAM_QUOTA_MAX_ALLOCATION = 1000000;

const ACTIVE: MemberStatus = "ACTIVE";
const PENDING: MemberStatus = "PENDING";
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const memberUserSelect = {
  id: true,
  username: true,
  nickname: true,
  avatar: true,
  xp: true,
} as const;

const teamCardSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  avatar: true,
  ownerId: true,
  createdAt: true,
  owner: { select: { id: true, username: true, nickname: true } },
} as const;

const teamListSelect = {
  ...teamCardSelect,
  _count: { select: { members: true } },
} as const;

export type { TeamPermissions } from "@/contracts/teams";
import type { TeamPermissions } from "@/contracts/teams";

/**
 * 单一授权真相来源：角色 → 能力。页面与接口都从这里取，
 * 避免 UI 放行、服务端漏校验造成越权。
 */
export function teamPermissions(role: TeamRole | null | undefined): TeamPermissions {
  const isOwner = role === "OWNER";
  const isAdmin = isOwner || role === "ADMIN";
  return {
    canInvite: isAdmin,
    canRemoveMember: isAdmin,
    canManageRoles: isOwner,
    canAllocateQuota: isAdmin,
    canDeleteTeam: isOwner,
    canViewQuota: isAdmin || role === "MEMBER",
  };
}

/** 中文团队名会被 slugify 清空，此时回退到随机短标识，保证 slug 唯一且可读。 */
export function teamSlugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base.length >= 2 ? base : "team-" + randomUUID().slice(0, 8);
}

function parseCreateInput(input: unknown) {
  const raw = (input ?? {}) as Record<string, unknown>;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new TeamError(400, "validation_error", "请求内容无效");
  }
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length < TEAM_NAME_MIN || name.length > TEAM_NAME_MAX) {
    throw new TeamError(400, "validation_error", "团队名称需为 " + TEAM_NAME_MIN + "-" + TEAM_NAME_MAX + " 个字符");
  }
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (description.length > TEAM_DESCRIPTION_MAX) {
    throw new TeamError(400, "validation_error", "团队简介不能超过 " + TEAM_DESCRIPTION_MAX + " 个字符");
  }
  return { name, description: description || null };
}

function parseInviteInput(input: unknown) {
  const raw = (input ?? {}) as Record<string, unknown>;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new TeamError(400, "validation_error", "请求内容无效");
  }
  const identifier = typeof raw.identifier === "string" ? raw.identifier.trim() : "";
  if (!identifier) throw new TeamError(400, "validation_error", "请填写要邀请的用户名或邮箱");
  const role: TeamRole = raw.role === "ADMIN" ? "ADMIN" : "MEMBER";
  return { identifier, role };
}

function parseQuota(value: unknown): number {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 0 || amount > TEAM_QUOTA_MAX_ALLOCATION) {
    throw new TeamError(400, "validation_error", "额度需为 0-" + TEAM_QUOTA_MAX_ALLOCATION + " 的整数");
  }
  return amount;
}

/** 读取团队成员身份；不存在或非 ACTIVE 返回 null。 */
export async function findActiveMembership(teamId: string, userId: string) {
  return db.teamMember.findFirst({
    where: { teamId, userId, status: ACTIVE },
    select: { id: true, role: true, quotaAllowance: true, quotaUsed: true },
  });
}

async function loadTeam(slug: string) {
  const team = await db.team.findUnique({ where: { slug }, select: teamCardSelect });
  if (!team) throw new TeamError(404, "team_not_found", "团队不存在");
  return team;
}

/** 读取团队并校验调用者具备指定能力，返回团队与调用者成员记录。 */
async function requireTeamActor(
  slug: string,
  userId: string,
  capability: keyof TeamPermissions
) {
  const team = await loadTeam(slug);
  const membership = await findActiveMembership(team.id, userId);
  const permissions = teamPermissions(membership?.role ?? null);
  if (!membership || !permissions[capability]) {
    throw new TeamError(403, "forbidden", "没有权限执行该操作");
  }
  return { team, membership, permissions };
}

/** 团队额度：管理员发放记 refType=team，成员分配记 refType=team_member，两者不混算。 */
export async function getTeamQuota(teamId: string) {
  const [granted, memberTotals] = await Promise.all([
    db.quotaLedger.aggregate({
      where: { refType: "team", refId: teamId, reason: { in: ["TEAM_GRANT", "ADMIN_ADJUST"] } },
      _sum: { amount: true },
    }),
    db.teamMember.aggregate({
      where: { teamId, status: ACTIVE },
      _sum: { quotaAllowance: true, quotaUsed: true },
    }),
  ]);
  const total = granted._sum.amount ?? 0;
  const allocated = memberTotals._sum.quotaAllowance ?? 0;
  return {
    granted: total,
    allocated,
    available: Math.max(0, total - allocated),
    used: memberTotals._sum.quotaUsed ?? 0,
  };
}

export async function createTeam(userId: string, input: unknown) {
  const { name, description } = parseCreateInput(input);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = teamSlugify(name);
    try {
      return await db.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: { name, description, slug, ownerId: userId },
          select: teamCardSelect,
        });
        // 新团队只有创建者一人，成员数直接给出，避免额外查询。
        await tx.teamMember.create({
          data: { teamId: team.id, userId, role: "OWNER", status: ACTIVE },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "TEAM_CREATED",
            resourceType: "team",
            resourceId: team.id,
            after: { name: team.name, slug: team.slug },
          },
        });
        return { ...team, memberCount: 1 };
      });
    } catch (error) {
      const isUnique =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!isUnique || attempt === 4) throw error;
    }
  }
  throw new TeamError(503, "server_error", "团队创建失败，请重试");
}

export async function listMyTeams(userId: string) {
  const [teams, invites] = await Promise.all([
    db.teamMember.findMany({
      where: { userId, status: ACTIVE },
      orderBy: { joinedAt: "asc" },
      select: { role: true, quotaAllowance: true, quotaUsed: true, team: { select: teamListSelect } },
    }),
    db.teamMember.findMany({
      where: { userId, status: PENDING },
      orderBy: { joinedAt: "desc" },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        team: { select: { id: true, name: true, slug: true, description: true } },
      },
    }),
  ]);
  return { teams, invites };
}

export async function getTeamDetail(slug: string, viewerId: string | null) {
  const team = await loadTeam(slug);
  const membership = viewerId ? await findActiveMembership(team.id, viewerId) : null;
  const permissions = teamPermissions(membership?.role ?? null);
  const isMember = Boolean(membership);

  const [memberCount, competitions] = await Promise.all([
    db.teamMember.count({ where: { teamId: team.id, status: ACTIVE } }),
    db.teamCompetition.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quotaGranted: true,
        quotaUsed: true,
        frozen: true,
        competition: {
          select: { id: true, title: true, organizer: true, status: true, startsAt: true, endsAt: true, url: true },
        },
      },
    }),
  ]);

  // 成员名单、额度与运行记录只对成员开放；外部访客只能看到公开信息。
  const [members, quota, runs] = isMember
    ? await Promise.all([
        db.teamMember.findMany({
          where: { teamId: team.id, status: { in: [ACTIVE, PENDING] } },
          orderBy: [{ status: "asc" }, { joinedAt: "asc" }],
          select: {
            id: true,
            role: true,
            status: true,
            quotaAllowance: true,
            quotaUsed: true,
            joinedAt: true,
            user: { select: memberUserSelect },
          },
        }),
        getTeamQuota(team.id),
        db.run.findMany({
          where: { teamId: team.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
          select: {
            id: true,
            status: true,
            costPoints: true,
            createdAt: true,
            finishedAt: true,
            error: true,
            user: { select: { id: true, username: true, nickname: true } },
            template: { select: { slug: true, title: true } },
          },
        }),
      ])
    : [null, null, null];

  return {
    team: { ...team, memberCount },
    viewer: {
      isMember,
      role: membership?.role ?? null,
      permissions,
    },
    members,
    quota,
    runs,
    competitions,
  };
}

async function resolveInviteTarget(identifier: string) {
  const byEmail = EMAIL_PATTERN.test(identifier);
  const byUsername = USERNAME_PATTERN.test(identifier);
  if (!byEmail && !byUsername) {
    throw new TeamError(400, "validation_error", "请填写有效的用户名或邮箱");
  }
  const user = await db.user.findFirst({
    where: {
      deletedAt: null,
      ...(byEmail ? { email: identifier.toLowerCase() } : { username: identifier }),
    },
    select: { id: true, username: true, nickname: true, flagged: true },
  });
  if (!user) throw new TeamError(404, "user_not_found", "没有找到该用户，请确认用户名或邮箱");
  if (user.flagged) throw new TeamError(403, "user_unavailable", "该账号当前不可加入团队");
  return user;
}

export async function inviteMember(actorId: string, slug: string, input: unknown) {
  const { identifier, role } = parseInviteInput(input);
  const { team, membership, permissions } = await requireTeamActor(slug, actorId, "canInvite");
  if (role === "ADMIN" && !permissions.canManageRoles) {
    throw new TeamError(403, "forbidden", "只有队长可以邀请管理员");
  }

  const target = await resolveInviteTarget(identifier);
  if (target.id === actorId) throw new TeamError(400, "self_invite", "不能邀请自己");

  const existing = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: target.id } },
    select: { id: true, status: true },
  });
  if (existing?.status === ACTIVE) throw new TeamError(409, "already_member", "该用户已在团队中");
  if (existing?.status === PENDING) throw new TeamError(409, "already_invited", "该用户已在待接受列表中");

  const [activeCount, pendingCount] = await Promise.all([
    db.teamMember.count({ where: { teamId: team.id, status: ACTIVE } }),
    db.teamMember.count({ where: { teamId: team.id, status: PENDING } }),
  ]);
  if (activeCount >= TEAM_MEMBER_CAP) {
    throw new TeamError(409, "team_full", "团队人数已达上限（" + TEAM_MEMBER_CAP + " 人）");
  }
  if (pendingCount >= TEAM_MAX_PENDING_INVITES) {
    throw new TeamError(409, "too_many_pending", "待接受的邀请过多，请先清理");
  }

  const member = await db.$transaction(async (tx) => {
    const record = existing
      ? await tx.teamMember.update({
          where: { id: existing.id },
          data: { status: PENDING, role, joinedAt: new Date() },
          select: { id: true, role: true, status: true, joinedAt: true },
        })
      : await tx.teamMember.create({
          data: { teamId: team.id, userId: target.id, role, status: PENDING },
          select: { id: true, role: true, status: true, joinedAt: true },
        });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "TEAM_MEMBER_INVITED",
        resourceType: "team_member",
        resourceId: record.id,
        after: { teamId: team.id, teamSlug: team.slug, inviteeId: target.id, role },
      },
    });
    return record;
  });

  return {
    member,
    invitee: { id: target.id, username: target.username, nickname: target.nickname },
    actorRole: membership.role,
  };
}

export async function respondToInvite(
  userId: string,
  slug: string,
  action: "accept" | "decline"
) {
  const team = await loadTeam(slug);
  const pending = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId: team.id, userId } },
    select: { id: true, status: true, role: true },
  });
  if (!pending || pending.status !== PENDING) {
    throw new TeamError(404, "invite_not_found", "没有待处理的邀请");
  }

  if (action === "decline") {
    return db.$transaction(async (tx) => {
      const updated = await tx.teamMember.updateMany({
        where: { id: pending.id, status: PENDING },
        data: { status: "LEFT" },
      });
      if (updated.count !== 1) throw new TeamError(409, "invite_stale", "邀请状态已变化，请刷新");
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "TEAM_MEMBER_DECLINED",
          resourceType: "team_member",
          resourceId: pending.id,
          after: { status: "LEFT" },
          metadata: { teamId: team.id, teamSlug: team.slug },
        },
      });
      return { status: "LEFT" as MemberStatus };
    });
  }

  const activeCount = await db.teamMember.count({ where: { teamId: team.id, status: ACTIVE } });
  if (activeCount >= TEAM_MEMBER_CAP) {
    throw new TeamError(409, "team_full", "团队人数已达上限");
  }

  return db.$transaction(async (tx) => {
    // 条件更新：只有仍处于 PENDING 的那一次才真正加入，避免并发重复加入。
    const updated = await tx.teamMember.updateMany({
      where: { id: pending.id, status: PENDING },
      data: { status: ACTIVE, joinedAt: new Date() },
    });
    if (updated.count !== 1) throw new TeamError(409, "invite_stale", "邀请状态已变化，请刷新");
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "TEAM_MEMBER_JOINED",
        resourceType: "team_member",
        resourceId: pending.id,
        after: { status: "ACTIVE", role: pending.role },
        metadata: { teamId: team.id, teamSlug: team.slug },
      },
    });
    return { status: "ACTIVE" as MemberStatus, role: pending.role };
  });
}

export async function updateMemberRole(
  actorId: string,
  slug: string,
  memberId: string,
  role: TeamRole
) {
  if (role !== "OWNER" && role !== "ADMIN" && role !== "MEMBER") {
    throw new TeamError(400, "validation_error", "角色无效");
  }
  const { team } = await requireTeamActor(slug, actorId, "canManageRoles");
  const target = await db.teamMember.findFirst({
    where: { id: memberId, teamId: team.id, status: ACTIVE },
    select: { id: true, userId: true, role: true },
  });
  if (!target) throw new TeamError(404, "member_not_found", "成员不存在");

  if (role === "OWNER" && target.role !== "OWNER") {
    // 转让队长：原队长降为管理员，保证同一时刻只有一位 OWNER。
    return db.$transaction(async (tx) => {
      const updated = await tx.teamMember.updateMany({
        where: { id: target.id, status: ACTIVE, role: target.role },
        data: { role: "OWNER" },
      });
      if (updated.count !== 1) throw new TeamError(409, "member_stale", "成员状态已变化，请刷新");
      await tx.teamMember.updateMany({
        where: { teamId: team.id, userId: actorId, status: ACTIVE },
        data: { role: "ADMIN" },
      });
      await tx.team.update({ where: { id: team.id }, data: { ownerId: target.userId } });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "TEAM_OWNERSHIP_TRANSFERRED",
          resourceType: "team_member",
          resourceId: target.id,
          before: { role: target.role },
          after: { role: "OWNER", newOwnerId: target.userId },
          metadata: { teamId: team.id, teamSlug: team.slug },
        },
      });
      return { role: "OWNER" as TeamRole };
    });
  }

  if (target.role === "OWNER") {
    throw new TeamError(409, "last_owner", "队长不能被降级，请先转让队长");
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.teamMember.updateMany({
      where: { id: target.id, status: ACTIVE, role: target.role },
      data: { role },
    });
    if (updated.count !== 1) throw new TeamError(409, "member_stale", "成员状态已变化，请刷新");
    await tx.auditLog.create({
      data: {
        actorId,
        action: "TEAM_ROLE_CHANGED",
        resourceType: "team_member",
        resourceId: target.id,
        before: { role: target.role },
        after: { role },
        metadata: { teamId: team.id, teamSlug: team.slug },
      },
    });
    return { role };
  });
}

export async function removeMember(actorId: string, slug: string, memberId: string) {
  const { team, membership } = await requireTeamActor(slug, actorId, "canRemoveMember");
  const target = await db.teamMember.findFirst({
    where: { id: memberId, teamId: team.id, status: ACTIVE },
    select: { id: true, userId: true, role: true },
  });
  if (!target) throw new TeamError(404, "member_not_found", "成员不存在");
  if (target.role === "OWNER") throw new TeamError(409, "last_owner", "不能移除队长");
  // 管理员只能移除普通成员；管理员之间需要队长操作。
  if (membership.role === "ADMIN" && target.role === "ADMIN") {
    throw new TeamError(403, "forbidden", "只有队长可以移除管理员");
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.teamMember.updateMany({
      where: { id: target.id, status: ACTIVE },
      data: { status: "LEFT" },
    });
    if (updated.count !== 1) throw new TeamError(409, "member_stale", "成员状态已变化，请刷新");
    await tx.auditLog.create({
      data: {
        actorId,
        action: "TEAM_MEMBER_REMOVED",
        resourceType: "team_member",
        resourceId: target.id,
        before: { role: target.role, status: "ACTIVE" },
        after: { status: "LEFT" },
        metadata: { teamId: team.id, teamSlug: team.slug, removedUserId: target.userId },
      },
    });
    return { status: "LEFT" as MemberStatus };
  });
}

export async function leaveTeam(userId: string, slug: string) {
  const team = await loadTeam(slug);
  const membership = await findActiveMembership(team.id, userId);
  if (!membership) throw new TeamError(404, "member_not_found", "你不在该团队中");
  if (membership.role === "OWNER") {
    throw new TeamError(409, "owner_must_transfer", "队长需先转让队长身份或解散团队");
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.teamMember.updateMany({
      where: { id: membership.id, status: ACTIVE },
      data: { status: "LEFT" },
    });
    if (updated.count !== 1) throw new TeamError(409, "member_stale", "成员状态已变化，请刷新");
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "TEAM_MEMBER_LEFT",
        resourceType: "team_member",
        resourceId: membership.id,
        after: { status: "LEFT" },
        metadata: { teamId: team.id, teamSlug: team.slug },
      },
    });
    return { status: "LEFT" as MemberStatus };
  });
}

export async function allocateQuota(
  actorId: string,
  slug: string,
  memberId: string,
  allowanceInput: unknown
) {
  const allowance = parseQuota(allowanceInput);
  const { team, membership } = await requireTeamActor(slug, actorId, "canAllocateQuota");
  const target = await db.teamMember.findFirst({
    where: { id: memberId, teamId: team.id, status: ACTIVE },
    select: { id: true, userId: true, role: true, quotaAllowance: true, quotaUsed: true },
  });
  if (!target) throw new TeamError(404, "member_not_found", "成员不存在");
  if (target.userId === actorId) {
    throw new TeamError(403, "self_allocation", "不能给自己分配团队额度");
  }
  if (membership.role === "ADMIN" && target.role !== "MEMBER") {
    throw new TeamError(403, "forbidden", "只有队长可以调整管理员或队长的额度");
  }
  if (allowance < target.quotaUsed) {
    throw new TeamError(409, "below_used", "该成员已消耗 " + target.quotaUsed + " 点，额度不能低于已用量");
  }

  const quota = await getTeamQuota(team.id);
  const delta = allowance - target.quotaAllowance;
  if (delta > quota.available) {
    throw new TeamError(409, "insufficient_team_quota", "团队可用额度不足，当前可分配 " + quota.available + " 点");
  }

  return db.$transaction(async (tx) => {
    // 条件更新：额度未被他人改动时才写入，避免并发重复分配导致超额。
    const updated = await tx.teamMember.updateMany({
      where: { id: target.id, status: ACTIVE, quotaAllowance: target.quotaAllowance },
      data: { quotaAllowance: allowance },
    });
    if (updated.count !== 1) throw new TeamError(409, "member_stale", "成员额度已被其他人修改，请刷新");
    if (delta !== 0) {
      await tx.quotaLedger.create({
        data: {
          userId: target.userId,
          amount: delta,
          balanceAfter: allowance - target.quotaUsed,
          reason: "TEAM_GRANT",
          refType: "team_member",
          refId: team.id,
          note: delta > 0 ? "团队「" + team.name + "」分配额度" : "团队「" + team.name + "」回收额度",
        },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId,
        action: "TEAM_QUOTA_ALLOCATED",
        resourceType: "team_member",
        resourceId: target.id,
        before: { quotaAllowance: target.quotaAllowance },
        after: { quotaAllowance: allowance },
        metadata: { teamId: team.id, teamSlug: team.slug, targetUserId: target.userId, delta },
      },
    });
    return { quotaAllowance: allowance, delta, available: quota.available - Math.max(0, delta) };
  });
}

export async function deleteTeam(actorId: string, slug: string, confirmName: unknown) {
  const { team } = await requireTeamActor(slug, actorId, "canDeleteTeam");
  const confirm = typeof confirmName === "string" ? confirmName.trim() : "";
  if (confirm !== team.name) {
    throw new TeamError(400, "confirm_mismatch", "请输入完整团队名称以确认解散");
  }

  await db.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        actorId,
        action: "TEAM_DELETED",
        resourceType: "team",
        resourceId: team.id,
        before: { name: team.name, slug: team.slug },
      },
    });
    await tx.team.delete({ where: { id: team.id } });
  });
  return { deleted: true };
}

/** 团队额度流水：管理员发放（refType=team）与成员分配（refType=team_member）。 */
export async function listTeamLedger(slug: string, actorId: string, take = 50) {
  const { team } = await requireTeamActor(slug, actorId, "canViewQuota");
  const members = await db.teamMember.findMany({
    where: { teamId: team.id },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);
  const [grants, ledger] = await Promise.all([
    db.quotaLedger.findMany({
      where: { refType: "team", refId: team.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: { id: true, amount: true, reason: true, note: true, createdAt: true, userId: true },
    }),
    db.quotaLedger.findMany({
      where: { userId: { in: userIds }, refType: "team_member", refId: team.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        userId: true,
        amount: true,
        reason: true,
        note: true,
        createdAt: true,
        user: { select: { id: true, username: true, nickname: true } },
      },
    }),
  ]);
  return { grants, ledger };
}

/** 管理员：给团队发放比赛/运营额度（refType=team），供队长再分配给成员。 */
export async function grantTeamQuota(
  adminId: string,
  teamId: string,
  amountInput: unknown,
  note?: unknown
) {
  const amount = Number(amountInput);
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > TEAM_QUOTA_MAX_ALLOCATION) {
    throw new TeamError(400, "validation_error", "发放额度需为非 0 整数，绝对值不超过 " + TEAM_QUOTA_MAX_ALLOCATION);
  }
  const team = await db.team.findUnique({ where: { id: teamId }, select: { id: true, name: true, slug: true } });
  if (!team) throw new TeamError(404, "team_not_found", "团队不存在");

  return db.$transaction(async (tx) => {
    const ledger = await tx.quotaLedger.create({
      data: {
        userId: null,
        amount,
        reason: "TEAM_GRANT",
        refType: "team",
        refId: team.id,
        note: typeof note === "string" && note.trim() ? note.trim().slice(0, 200) : "管理员发放团队额度",
      },
      select: { id: true, amount: true, createdAt: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "TEAM_QUOTA_GRANTED",
        resourceType: "team",
        resourceId: team.id,
        after: { amount },
        metadata: { teamSlug: team.slug },
      },
    });
    return { ledger, team };
  });
}
