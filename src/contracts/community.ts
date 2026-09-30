import type { LevelProgress } from "./level";

/**
 * 社区契约：`/api/community/*` 的响应形状（JSON 线上格式）。
 *
 * 时间字段在这里是 **字符串**：服务端 `Date` 经 `NextResponse.json` 序列化为 ISO 串。
 * 客户端组件依赖这些类型，因此不能引用任何服务端模块（否则会把 Prisma 拖进浏览器 bundle）。
 *
 * `src/lib/community.ts` 里有一处编译期断言，保证服务端返回类型序列化后
 * 与本文件完全一致——契约不会悄悄漂移。
 */

/** 经验流水条目。`reason` 对应 `XP_RULES` 的键，序列化后为字符串。 */
export type CommunityLedgerEntry = {
  id: string;
  amount: number;
  reason: string;
  note: string | null;
  createdAt: string;
  appeal: { status: "PENDING" | "APPROVED" | "REJECTED" } | null;
};

/** 签到记录。 */
export type CommunityCheckIn = {
  id: string;
  day: string;
  streak: number;
  xpAwarded: number;
  createdAt: string;
};

/** `GET /api/community/me`：仅本人可见的成长数据。 */
export type CommunityMe = {
  xp: number;
  level: LevelProgress;
  checkInStreak: number;
  todayCheckIn: CommunityCheckIn | null;
  ledger: CommunityLedgerEntry[];
};

/** 贡献榜条目。 */
export type CommunityContribution = {
  id: string;
  nickname: string;
  xp: number;
  level: LevelProgress;
  rank: number;
};

/** `GET /api/community/contributions`：榜单与本人名次。 */
export type CommunityContributions = {
  top: CommunityContribution[];
  me: CommunityContribution;
};

/** `POST /api/community/check-in`：幂等签到结果。 */
export type CommunityCheckInResult = {
  alreadyCheckedIn: boolean;
  checkIn: CommunityCheckIn;
};

/** `/api/community/*` 的错误响应体。 */
export type CommunityErrorBody = {
  error: string;
};
