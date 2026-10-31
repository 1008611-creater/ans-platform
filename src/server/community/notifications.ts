import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";

export type CommunityNotificationType = Extract<NotificationType, `COMMUNITY_${string}` | "BOTTLE_REPLY">;

/** 同一个帖子上还没读的同类提醒合并成一条，避免一串回复刷满铃铛。 */
const MERGEABLE = new Set<CommunityNotificationType>(["COMMUNITY_REPLY", "COMMUNITY_HELP_OFFER", "COMMUNITY_APPLICATION", "BOTTLE_REPLY"]);
const EXCERPT_MAX = 80;

export function notificationExcerpt(text: string | null | undefined) {
  const plain = (text ?? "").replace(/\s+/g, " ").trim();
  if (!plain) return null;
  return plain.length > EXCERPT_MAX ? `${plain.slice(0, EXCERPT_MAX - 1)}…` : plain;
}

type NotifyInput = {
  userId: string;
  /** 漂流瓶是匿名的，不记录是谁回的。 */
  actorId: string | null;
  type: CommunityNotificationType;
  communityPostId?: string;
  bottleId?: string;
  excerpt?: string | null;
};

/** 写一条站内提醒。提醒失败不能拖垮主操作，所以只记日志。 */
export async function notifyCommunity(input: NotifyInput) {
  if (input.actorId && input.actorId === input.userId) return;
  const excerpt = notificationExcerpt(input.excerpt);
  try {
    if (MERGEABLE.has(input.type)) {
      const existing = await db.notification.findFirst({
        where: { userId: input.userId, type: input.type, read: false, communityPostId: input.communityPostId ?? null, bottleId: input.bottleId ?? null },
        select: { id: true },
      });
      if (existing) {
        await db.notification.update({ where: { id: existing.id }, data: { actorId: input.actorId, excerpt, createdAt: new Date() } });
        return;
      }
    }
    await db.notification.create({
      data: { userId: input.userId, actorId: input.actorId, type: input.type, communityPostId: input.communityPostId ?? null, bottleId: input.bottleId ?? null, excerpt },
    });
  } catch {
    console.error("COMMUNITY_NOTIFY_FAILED", input.type);
  }
}
