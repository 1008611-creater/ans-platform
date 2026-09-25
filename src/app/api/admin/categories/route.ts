import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { createCategory } from "@/server/admin/categories";

// Create category
export async function POST(request: NextRequest) {
  try {
    const context = await requireAdminPermission("PROMPTS_MANAGE");
    if (!context) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, description, icon, parentId, pinned } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const category = await createCategory({
      name,
      slug,
      description: description || null,
      icon: icon || null,
      parentId: parentId || null,
      pinned: pinned || false,
    });

    revalidateTag("categories", "max");

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
