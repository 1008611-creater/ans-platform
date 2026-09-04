import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { z } from "zod";

const adminUserUpdateSchema = z.object({
  role: z.enum(["ADMIN", "USER"]).optional(),
  verified: z.boolean().optional(),
  flagged: z.boolean().optional(),
  flaggedReason: z.string().trim().max(500).optional().nullable(),
  dailyGenerationLimit: z.coerce.number().int().min(0).max(10000).optional(),
});

// Update user (role change or verification)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAdminPermission("USERS_MANAGE");
    if (!context) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = adminUserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user update" }, { status: 400 });
    }
    const { role, verified, flagged, flaggedReason, dailyGenerationLimit } = parsed.data;

    // Build update data
    const updateData: { 
      role?: "ADMIN" | "USER"; 
      verified?: boolean;
      flagged?: boolean;
      flaggedAt?: Date | null;
      flaggedReason?: string | null;
      dailyGenerationLimit?: number;
      generationCreditsRemaining?: number;
    } = {};

    if (role !== undefined) {
      if (!["ADMIN", "USER"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updateData.role = role;
    }

    if (verified !== undefined) {
      updateData.verified = verified;
    }

    if (flagged !== undefined) {
      updateData.flagged = flagged;
      if (flagged) {
        updateData.flaggedAt = new Date();
        updateData.flaggedReason = flaggedReason || null;
      } else {
        updateData.flaggedAt = null;
        updateData.flaggedReason = null;
      }
    }

    if (dailyGenerationLimit !== undefined) {
      const limit = dailyGenerationLimit;
      updateData.dailyGenerationLimit = limit;
      // Also reset remaining credits to the new limit
      updateData.generationCreditsRemaining = limit;
    }

    const beforeUser = await db.user.findUnique({
      where: { id },
      select: { role: true, verified: true, flagged: true, dailyGenerationLimit: true },
    });
    if (!beforeUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        role: true,
        verified: true,
        flagged: true,
        flaggedAt: true,
        flaggedReason: true,
        dailyGenerationLimit: true,
        generationCreditsRemaining: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      actorId: context.userId,
      action: "USER_UPDATE",
      resourceType: "USER",
      resourceId: id,
      before: beforeUser,
      after: { role: user.role, verified: user.verified, flagged: user.flagged, dailyGenerationLimit: user.dailyGenerationLimit },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAdminPermission("USERS_MANAGE");
    if (!context) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Don't allow deleting yourself
    if (id === context.userId) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, role: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog({
      actorId: context.userId,
      action: "USER_DELETE",
      resourceType: "USER",
      resourceId: id,
      before: user,
      after: { deletedAt: new Date().toISOString() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
