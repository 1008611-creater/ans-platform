/**
 * 管理后台服务的统一错误类型。
 *
 * 路由层用 `respondWithError` 把它映射成 `{ ok: false, error: { code, message } }`，
 * 这样服务层只需要描述「哪里不对」，不需要知道 HTTP 细节。
 */
export class AdminServiceError extends Error {
  constructor(
    message: string,
    public readonly code = "ADMIN_ERROR",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}