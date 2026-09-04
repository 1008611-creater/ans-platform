import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const context = await requireAdminPermission("SKILLS_VIEW");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
  const search = searchParams.get("search")?.trim() || "";
  const includeDeleted = searchParams.get("includeDeleted") === "true";
  const where = {
    type: "SKILL" as const,
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(search ? { OR: [
      { title: { contains: search, mode: "insensitive" as const } },
      { description: { contains: search, mode: "insensitive" as const } },
    ] } : {}),
  };

  const [skills, total] = await Promise.all([
    db.prompt.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, title: true, titleZh: true, titleEn: true,
        description: true, descriptionZh: true, descriptionEn: true,
        slug: true, isPrivate: true, isUnlisted: true, deletedAt: true,
        createdAt: true, updatedAt: true,
        author: { select: { id: true, username: true, name: true } },
      },
    }),
    db.prompt.count({ where }),
  ]);

  return NextResponse.json({
    skills,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
