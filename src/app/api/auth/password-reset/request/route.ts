import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "invalid_email", message: "请输入有效邮箱" }, { status: 400 });
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const raw = randomBytes(32).toString("hex");
    const token = createHash("sha256").update(raw).digest("hex");
    const identifier = `password-reset:${email}`;
    await db.verificationToken.deleteMany({ where: { identifier } });
    await db.verificationToken.create({ data: { identifier, token, expires: new Date(Date.now() + 15 * 60 * 1000) } });
    const base = process.env.AUTH_URL || "https://ans.cauai.fun";
    const key = process.env.RESEND_API_KEY?.trim(); const from = process.env.EMAIL_FROM?.trim();
    if (key && from) await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [email], subject: "ANS 密码重置", text: `请在 15 分钟内打开此链接重置密码：${base}/reset-password?token=${raw}&email=${encodeURIComponent(email)}` }) });
  }
  return NextResponse.json({ message: "如果邮箱存在，重置链接已发送" });
}
