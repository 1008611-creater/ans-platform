export class RegistrationError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfter?: number) {
    super(message);
  }
}

export function registrationEnvironment() {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  let hostname: string | undefined;
  try {
    const url = new URL(process.env.AUTH_URL || "");
    if (["https:", "http:"].includes(url.protocol)) hostname = url.hostname;
  } catch { /* 配置不完整时禁止注册。 */ }
  if (!secret || !siteKey || !resendKey || !from || !hostname) {
    throw new RegistrationError(503, "registration_unavailable", "注册服务尚未配置完成，请稍后再试");
  }
  return { secret, siteKey, resendKey, from, hostname };
}

export async function verifyRegistrationChallenge(token: string) {
  const env = registrationEnvironment();
  let result: { success?: boolean; hostname?: string; action?: string };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.secret, response: token }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("服务不可用");
    result = await response.json();
  } catch {
    throw new RegistrationError(503, "challenge_unavailable", "人机验证服务暂不可用，请重试");
  }
  if (!result || result.success !== true || result.hostname !== env.hostname || result.action !== "register") {
    throw new RegistrationError(400, "challenge_invalid", "人机验证无效或已过期，请重新验证");
  }
}

export async function deliverRegistrationCode(email: string, code: string, deliveryId: string) {
  const env = registrationEnvironment();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `registration-${deliveryId}` },
      body: JSON.stringify({ from: env.from, to: [email], subject: "ANS 注册邮箱验证码", text: `你的注册验证码是 ${code}，10 分钟内有效。请勿向他人透露。如果不是你本人操作，请忽略此邮件。` }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("投递失败");
  } catch {
    // 不记录供应商响应、验证码、邮箱或密钥。
    throw new RegistrationError(503, "email_unavailable", "验证码邮件暂时无法发送，请稍后重试");
  }
}
