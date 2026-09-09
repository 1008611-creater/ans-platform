import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    token?: unknown;
    password?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (
    !email || !/^\S+@\S+\.\S+$/.test(email) || !/^\d{4}$/.test(code) ||
    password.length < 6 || Buffer.byteLength(password, "utf8") > 72
  ) {
    return NextResponse.json(
      { error: "invalid_input", message: "邮箱、验证码或密码格式无效" },
      { status: 400 },
    );
  }

  const identifier = `password-reset:${email}`;
  const token = createHash("sha256").update(code).digest("hex");
  const now = new Date();
  const row = await db.verificationToken.findFirst({
    where: { identifier, token, expires: { gt: now } },
  });
  if (!row) {
    return NextResponse.json(
      { error: "token_invalid", message: "验证码无效或已过期" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const consumed = await db.verificationToken.deleteMany({
    where: { identifier, token, expires: { gt: now } },
  });
  if (!consumed.count) {
    return NextResponse.json(
      { error: "token_invalid", message: "验证码无效或已使用" },
      { status: 400 },
    );
  }
  await db.user.update({ where: { email }, data: { password: passwordHash } });
  return NextResponse.json({ message: "密码已重置，请使用新密码登录" });
}
