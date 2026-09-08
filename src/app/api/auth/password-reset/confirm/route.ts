import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; token?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const raw = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !raw || password.length < 6 || Buffer.byteLength(password, "utf8") > 72) return NextResponse.json({ error: "invalid_input", message: "重置链接或密码无效" }, { status: 400 });
  const token = createHash("sha256").update(raw).digest("hex"); const identifier = `password-reset:${email}`;
  const row = await db.verificationToken.findFirst({ where: { identifier, token, expires: { gt: new Date() } } });
  if (!row) return NextResponse.json({ error: "token_invalid", message: "链接无效或已过期" }, { status: 400 });
  const hash = await bcrypt.hash(password, 12);
  const consumed = await db.verificationToken.deleteMany({ where: { identifier, token, expires: { gt: new Date() } } });
  if (!consumed.count) return NextResponse.json({ error: "token_invalid", message: "链接无效或已使用" }, { status: 400 });
  await db.user.update({ where: { email }, data: { password: hash } });
  return NextResponse.json({ message: "密码已重置，请重新登录" });
}
