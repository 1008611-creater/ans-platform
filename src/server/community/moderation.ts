import { z } from "zod";
import { db } from "@/lib/db";
import { CommunityError } from "@/server/community/errors";

const authorSelect = { id: true, username: true, nickname: true } as const;
const pendingReports = { where: { status: "PENDING" as const }, orderBy: { createdAt: "asc" as const }, select: { id: true, reason: true, createdAt: true, reporter: { select: authorSelect } } };

/** 待复核：有未处理举报的帖子和漂流瓶，包括已经被自动收起的。 */
export async function listCommunityReports() {
  const [posts, bottles] = await Promise.all([
    db.communityPost.findMany({
      where: { reports: { some: { status: "PENDING" } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true, title: true, body: true, status: true, kind: true, board: true, createdAt: true,
        author: { select: authorSelect },
        reports: { ...pendingReports, select: { ...pendingReports.select, details: true } },
      },
    }),
    db.communityBottle.findMany({
      where: { reports: { some: { status: "PENDING" } } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, body: true, status: true, createdAt: true, author: { select: authorSelect }, reports: pendingReports },
    }),
  ]);
  return { posts, bottles };
}
export type CommunityReportQueue = Awaited<ReturnType<typeof listCommunityReports>>;

export const reviewCommunityReportSchema = z.object({
  target: z.enum(["post", "bottle"]),
  id: z.string().trim().min(1).max(40),
  /** restore：举报不成立，恢复显示；remove：确认违规，保持收起。 */
  decision: z.enum(["restore", "remove"]),
});

export async function reviewCommunityReport(adminId: string, raw: unknown) {
  const parsed = reviewCommunityReportSchema.safeParse(raw);
  if (!parsed.success) throw new CommunityError(400, "INVALID_INPUT");
  const { target, id, decision } = parsed.data;
  const reportStatus = decision === "restore" ? "DISMISSED" : "REVIEWED";

  if (target === "post") {
    const post = await db.communityPost.findUnique({ where: { id }, select: { status: true, resolvedAt: true } });
    if (!post) throw new CommunityError(404, "NOT_FOUND");
    // 收起前已经解决的帖子恢复成「已解决」，不能被复核重新打开。
    const status = decision === "remove" ? "HIDDEN" : post.status !== "HIDDEN" ? post.status : post.resolvedAt ? "RESOLVED" : "OPEN";
    await db.$transaction([
      db.communityPostReport.updateMany({ where: { postId: id, status: "PENDING" }, data: { status: reportStatus } }),
      db.communityPost.update({ where: { id }, data: { status } }),
      db.auditLog.create({ data: { actorId: adminId, action: "COMMUNITY_REPORT_REVIEWED", resourceType: "community_post", resourceId: id, before: { status: post.status }, after: { status }, metadata: { decision } } }),
    ]);
    return { status };
  }

  const bottle = await db.communityBottle.findUnique({ where: { id }, select: { status: true } });
  if (!bottle) throw new CommunityError(404, "NOT_FOUND");
  const status = decision === "remove" ? "HIDDEN" : "OPEN";
  await db.$transaction([
    db.communityBottleReport.updateMany({ where: { bottleId: id, status: "PENDING" }, data: { status: reportStatus } }),
    db.communityBottle.update({ where: { id }, data: { status } }),
    db.auditLog.create({ data: { actorId: adminId, action: "COMMUNITY_REPORT_REVIEWED", resourceType: "community_bottle", resourceId: id, before: { status: bottle.status }, after: { status }, metadata: { decision } } }),
  ]);
  return { status };
}
