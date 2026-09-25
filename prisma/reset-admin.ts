import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error("缺少环境变量 " + name + "。请显式提供管理员邮箱与密码，例如：");
    console.error("   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=<强密码> npm run db:resetadmin");
    process.exit(1);
  }
  return value;
}

async function main() {
  const email = required("ADMIN_EMAIL").toLowerCase();
  const plain = required("ADMIN_PASSWORD");
  if (plain.length < 12) {
    console.error("ADMIN_PASSWORD 至少 12 位，请改用更强的密码。");
    process.exit(1);
  }

  console.log("Resetting admin user...");

  const password = await bcrypt.hash(plain, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: password,
      role: "ADMIN",
    },
    create: {
      email,
      username: process.env.ADMIN_USERNAME?.trim() || "admin",
      name: process.env.ADMIN_NAME?.trim() || "Admin User",
      password: password,
      role: "ADMIN",
      locale: "en",
    },
  });

  // 只输出非敏感字段，避免密码进入日志与终端历史。
  console.log("Admin user reset successfully!");
  console.log("   Email:    " + admin.email);
  console.log("   Role:     " + admin.role);
  console.log("   Password: (已设置，未回显)");
}

main()
  .catch((e) => {
    console.error("Failed to reset admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
