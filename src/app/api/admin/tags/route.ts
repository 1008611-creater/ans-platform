import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { db } from "@/lib/db";

// Create tag
export async function POST(request: NextRequest) {
  try {
    const context = await requireAdminPermission("PROMPTS_MANAGE");
    if (!context) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, color } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const tag = await db.tag.create({
      data: {
        name,
        slug,
        color: color || "#6366f1",
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}
