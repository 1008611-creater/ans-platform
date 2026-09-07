// 昵称（公开展示名）修改规则：30 天可改一次。
// 独立成 lib 便于单测；被 `/api/user/profile` 复用。
export const NICKNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 40;

export class DisplayNameError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

/** 距下次可改昵称的剩余毫秒；0 表示现在可改。 */
export function nicknameRemainingCooldown(setAt: Date | null | undefined, now: Date): number {
  if (!setAt) return 0;
  const remaining = setAt.getTime() + NICKNAME_COOLDOWN_MS - now.getTime();
  return remaining > 0 ? remaining : 0;
}

export function assertNicknameChangeAllowed(setAt: Date | null | undefined, now: Date) {
  const remaining = nicknameRemainingCooldown(setAt, now);
  if (remaining > 0) {
    throw new DisplayNameError(
      429,
      "nickname_cooldown",
      `昵称 30 天可修改一次，请 ${Math.max(1, Math.ceil(remaining / 1000))} 秒后再试`,
      Math.max(1, Math.ceil(remaining / 1000)),
    );
  }
}

export function assertValidNickname(value: string) {
  // 在 trim 前检查，防止首尾控制符被静默消除；同时拒绝不可见格式控制符。
  if (/[\p{Cc}\p{Cf}]/u.test(value)) {
    throw new DisplayNameError(400, "validation_error", "昵称不能包含控制符");
  }
  const name = value.trim();
  const length = Array.from(name).length;
  if (length < NICKNAME_MIN || length > NICKNAME_MAX) {
    throw new DisplayNameError(400, "validation_error", `昵称需为 ${NICKNAME_MIN}-${NICKNAME_MAX} 个字符`);
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(name)) {
    throw new DisplayNameError(400, "validation_error", "昵称不能使用邮箱格式");
  }
  return name;
}