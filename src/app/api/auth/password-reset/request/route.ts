import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { incrementCounter, readCounter, resetToken, RESET_COOLDOWN_SECONDS, RESET_MAX_ATTEMPTS, RESET_TTL_MS, retryAfter, withResetLock } from "@/lib/password-reset";
const GENERIC_MESSAGE = "如果该邮箱已注册，验证码已发送。";
const emailPattern = /^\S+@\S+\.\S+$/;
function unavailable() { return NextResponse.json({ error: "email_unavailable", message: "邮件服务暂不可用，请稍后重试" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
class RateLimitError extends Error {
    constructor(public readonly retryAfter: number) { super("rate limited"); }
}
export async function POST(request: Request) {
    const secret = process.env.AUTH_SECRET?.trim();
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!secret || !resendKey || !from)
        return unavailable();
    const body = (await request.json().catch(() => null)) as {
        email?: unknown;
    } | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !emailPattern.test(email))
        return NextResponse.json({ error: "invalid_email", message: "请输入有效邮箱" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    let reservation: {
        code: string;
        token: string;
        identifier: string;
    } | undefined;
    try {
        reservation = await withResetLock(email, async (tx) => {
            const now = new Date();
            const sends = await readCounter(tx, "sends", email, now);
            if (sends.count >= RESET_MAX_ATTEMPTS)
                throw new RateLimitError(retryAfter(sends.expires, now));
            const cooldownToken = `password-reset:cooldown:${email}`;
            const cooldown = await tx.verificationToken.findUnique({ where: { token: cooldownToken } });
            if (cooldown && cooldown.expires > now)
                throw new RateLimitError(retryAfter(cooldown.expires, now));
            await tx.verificationToken.deleteMany({ where: { token: cooldownToken } });
            await tx.verificationToken.create({ data: { identifier: `password-reset:cooldown:${email}`, token: cooldownToken, expires: new Date(now.getTime() + RESET_COOLDOWN_SECONDS * 1000) } });
            await incrementCounter(tx, sends);
            const user = await tx.user.findUnique({ where: { email }, select: { id: true } });
            if (!user)
                return undefined;
            const code = String(randomInt(1000, 10000));
            const token = resetToken(email, code, secret);
            const identifier = `password-reset:${email}`;
            await tx.verificationToken.deleteMany({ where: { identifier } });
            await tx.verificationToken.create({ data: { identifier, token, expires: new Date(now.getTime() + RESET_TTL_MS) } });
            return { code, token, identifier };
        });
    }
    catch (error) {
        if (error instanceof RateLimitError)
            return NextResponse.json({ error: "rate_limited", message: "请求过于频繁，请稍后重试" }, { status: 429, headers: { "Retry-After": String(error.retryAfter) } });
        return unavailable();
    }
    if (!reservation)
        return NextResponse.json({ message: GENERIC_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
    try {
        const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `password-reset-${createHash("sha256").update(reservation.token).digest("hex").slice(0, 32)}` }, body: JSON.stringify({ from, to: [email], subject: "ANS 密码重置验证码", text: `你的 ANS 密码重置验证码是：${reservation.code}\n\n验证码 15 分钟内有效。如非本人操作，请忽略此邮件。` }), signal: AbortSignal.timeout(10000), cache: "no-store" });
        if (!response.ok)
            throw new Error("email delivery failed");
    }
    catch {
        const { identifier, token } = reservation;
        try {
            await withResetLock(email, tx => tx.verificationToken.deleteMany({ where: { identifier, token } }));
        }
        catch { /* Never expose provider or database errors. The token has a bounded expiry. */ }
        // Failed delivery and unknown accounts retain limits to prevent unlimited retries and enumeration.
        return unavailable();
    }
    return NextResponse.json({ message: GENERIC_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
}
