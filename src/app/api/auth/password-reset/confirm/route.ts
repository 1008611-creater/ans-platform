import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { incrementCounter, legacyResetToken, readCounter, resetToken, RESET_MAX_ATTEMPTS, retryAfter, sameToken, withResetLock } from "@/lib/password-reset";
const invalid = () => NextResponse.json({ error: "token_invalid", message: "验证码无效或已过期" }, { status: 400 });
const emailPattern = /^\S+@\S+\.\S+$/;
export async function POST(request: Request) {
    const secret = process.env.AUTH_SECRET?.trim();
    if (!secret)
        return NextResponse.json({ error: "service_unavailable", message: "服务暂不可用，请稍后重试" }, { status: 503 });
    const body = (await request.json().catch(() => null)) as {
        email?: unknown;
        token?: unknown;
        password?: unknown;
    } | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !emailPattern.test(email) || !/^\d{4}$/.test(code) || password.length < 6 || Buffer.byteLength(password, "utf8") > 72)
        return NextResponse.json({ error: "invalid_input", message: "邮箱、验证码或密码格式无效" }, { status: 400 });
    try {
        const result = await withResetLock(email, async (tx) => {
            const now = new Date();
            const attempts = await readCounter(tx, "attempts", email, now);
            if (attempts.count >= RESET_MAX_ATTEMPTS)
                return { limited: retryAfter(attempts.expires, now) };
            const identifier = `password-reset:${email}`;
            const expected = resetToken(email, code, secret);
            const legacy = legacyResetToken(code);
            const row = await tx.verificationToken.findFirst({ where: {
                    identifier, token: { in: [expected, legacy] }, expires: { gt: now },
                } });
            if (!row || (!sameToken(row.token, expected) && !sameToken(row.token, legacy))) {
                await incrementCounter(tx, attempts, attempts.count === RESET_MAX_ATTEMPTS - 1 ? new Date(now.getTime() + 10 * 60 * 1000) : attempts.expires);
                return attempts.count >= RESET_MAX_ATTEMPTS - 1 ? { limited: 600 } : { invalid: true };
            }
            const passwordHash = await bcrypt.hash(password, 12);
            const consumed = await tx.verificationToken.deleteMany({ where: { identifier, token: row.token, expires: { gt: new Date() } } });
            if (consumed.count !== 1)
                return { invalid: true };
            const updated = await tx.user.updateMany({ where: { email }, data: { password: passwordHash, passwordChangedAt: new Date() } });
            if (updated.count !== 1)
                throw new Error("password reset user disappeared");
            await tx.verificationToken.deleteMany({ where: { identifier } });
            await tx.verificationToken.deleteMany({ where: { token: attempts.token } });
            return { success: true };
        });
        if ("limited" in result)
            return NextResponse.json({ error: "rate_limited", message: "尝试次数过多，请稍后重试" }, { status: 429, headers: { "Retry-After": String(result.limited) } });
        if ("invalid" in result)
            return invalid();
        return NextResponse.json({ message: "密码已重置，请使用新密码登录" });
    }
    catch {
        return NextResponse.json({ error: "server_error", message: "服务暂时异常，请稍后重试" }, { status: 500 });
    }
}
