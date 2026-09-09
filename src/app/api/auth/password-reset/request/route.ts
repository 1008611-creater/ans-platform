import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const GENERIC_MESSAGE = "如果该邮箱已注册，验证码已发送。";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email", message: "请输入有效邮箱" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ message: GENERIC_MESSAGE });

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!resendKey || !from) {
    return NextResponse.json(
      { error: "email_unavailable", message: "邮件服务暂不可用，请稍后重试" },
      { status: 503 },
    );
  }

  const code = String(randomInt(1000, 10000));
  const token = createHash("sha256").update(code).digest("hex");
  const identifier = `password-reset:${email}`;
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: { identifier, token, expires: new Date(Date.now() + 15 * 60 * 1000) },
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "ANS 密码重置验证码",
        text: `你的 ANS 密码重置验证码是：${code}\n\n验证码 15 分钟内有效。如非本人操作，请忽略此邮件。`,
      }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("email delivery failed");
  } catch {
    await db.verificationToken.deleteMany({ where: { identifier, token } });
    return NextResponse.json(
      { error: "email_unavailable", message: "验证码邮件暂时无法发送，请稍后重试" },
      { status: 503 },
    );
  }
  return NextResponse.json({ message: GENERIC_MESSAGE });
}
