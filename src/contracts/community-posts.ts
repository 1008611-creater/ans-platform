import { z } from "zod";

/**
 * 社区帖子契约：发帖表单与 `/api/community/posts*` 共用同一套校验。
 * 不能引用任何服务端模块，客户端组件会直接 import。
 */

export const COMMUNITY_BOARDS = ["TEAM", "CAREER", "RESEARCH", "AIGC", "CAMPUS"] as const;
export const COMMUNITY_POST_KINDS = ["NOTE", "TEXT", "STALL"] as const;
export const COMMUNITY_STALL_KINDS = ["SEEK", "OFFER", "SWAP", "TEAM"] as const;
export const COMMUNITY_REPORT_REASONS = ["SPAM", "INAPPROPRIATE", "PERSONAL", "MISLEADING", "OTHER"] as const;

export type CommunityBoardId = typeof COMMUNITY_BOARDS[number];
export type CommunityPostKindId = typeof COMMUNITY_POST_KINDS[number];
export type CommunityStallKindId = typeof COMMUNITY_STALL_KINDS[number];

export const POST_TITLE_MAX = 80;
export const POST_BODY_MAX = 2000;
export const TEXT_POST_MAX = 140;
export const POST_IMAGE_MAX = 4;
export const TEAM_ROLE_MAX = 6;
export const TEAM_ROLE_SLOTS_MAX = 5;
export const STALL_MAX_DAYS = 60;
export const HELP_REWARD_XP = 20;

const board = z.enum(COMMUNITY_BOARDS);
const imageUrl = z.string().trim().max(500).url().refine((value) => value.startsWith("https://"), "IMAGE_URL");
const optionalId = z.string().trim().min(1).max(40).optional();

export const teamRoleSchema = z.object({
  name: z.string().trim().min(1).max(20),
  slots: z.number().int().min(1).max(TEAM_ROLE_SLOTS_MAX),
});
export type CommunityTeamRole = z.infer<typeof teamRoleSchema>;

export const createCommunityPostSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("NOTE"),
    board,
    title: z.string().trim().min(2).max(POST_TITLE_MAX),
    body: z.string().trim().min(2).max(POST_BODY_MAX),
    images: z.array(imageUrl).max(POST_IMAGE_MAX).default([]),
  }),
  z.object({
    kind: z.literal("TEXT"),
    board,
    body: z.string().trim().min(2).max(TEXT_POST_MAX),
  }),
  z.object({
    kind: z.literal("STALL"),
    stall: z.enum(COMMUNITY_STALL_KINDS),
    board,
    title: z.string().trim().min(4).max(POST_TITLE_MAX),
    body: z.string().trim().max(POST_BODY_MAX).default(""),
    expiresAt: z.coerce.date(),
    competitionId: optionalId,
    teamId: optionalId,
    roles: z.array(teamRoleSchema).max(TEAM_ROLE_MAX).optional(),
  }).superRefine((value, ctx) => {
    if (value.stall !== "TEAM") return;
    if (!value.teamId) ctx.addIssue({ code: "custom", path: ["teamId"], message: "TEAM_REQUIRED" });
    if (!value.roles?.length) ctx.addIssue({ code: "custom", path: ["roles"], message: "ROLES_REQUIRED" });
    const names = new Set(value.roles?.map((role) => role.name));
    if (names.size !== (value.roles?.length ?? 0)) ctx.addIssue({ code: "custom", path: ["roles"], message: "ROLES_DUPLICATE" });
  }),
]);
export type CreateCommunityPostInput = z.input<typeof createCommunityPostSchema>;

export const communityPostActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reply"), body: z.string().trim().min(1).max(1000) }),
  z.object({ action: z.literal("like") }),
  z.object({ action: z.literal("help"), message: z.string().trim().max(200).optional() }),
  z.object({ action: z.literal("resolve"), helperId: optionalId }),
  z.object({ action: z.literal("close") }),
  z.object({ action: z.literal("apply"), role: z.string().trim().min(1).max(20), message: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("decide"), applicationId: z.string().trim().min(1).max(40), decision: z.enum(["ACCEPT", "DECLINE"]) }),
  z.object({ action: z.literal("report"), reason: z.enum(COMMUNITY_REPORT_REASONS), details: z.string().trim().max(500).optional() }),
]);
export type CommunityPostAction = z.input<typeof communityPostActionSchema>;

/** 「我能帮」用在求和换上，「我想要」用在出上；组队走入队申请。 */
export function helpVerb(stall: CommunityStallKindId | null | undefined): "help" | "want" | null {
  if (stall === "SEEK" || stall === "SWAP") return "help";
  if (stall === "OFFER") return "want";
  return null;
}

export const BOTTLE_BODY_MAX = 280;
export const BOTTLE_REPLY_MAX = 280;

export const throwBottleSchema = z.object({ body: z.string().trim().min(2).max(BOTTLE_BODY_MAX) });

export const bottleActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reply"), body: z.string().trim().min(1).max(BOTTLE_REPLY_MAX) }),
  z.object({ action: z.literal("report"), reason: z.enum(COMMUNITY_REPORT_REASONS) }),
]);
