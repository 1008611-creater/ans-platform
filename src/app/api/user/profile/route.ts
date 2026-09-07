import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isUniqueConstraintViolation } from "@/lib/db-errors";
import { assertNicknameChangeAllowed, assertValidNickname, DisplayNameError } from "@/lib/display-name";

const customLinkSchema = z.object({
  type: z.enum(["website", "github", "twitter", "linkedin", "instagram", "youtube", "twitch", "discord", "mastodon", "bluesky", "sponsor"]),
  url: z.string().url(),
  label: z.string().max(30).optional(),
});

// Trim before validation to prevent unicode/whitespace tricks that bypass uniqueness checks (e.g. "admin\u200B@x.com" vs "admin@x.com")
const trimmed = z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string());

const updateProfileSchema = z.object({
  // 保留原值，在确认需要改昵称时统一验证，兼容未变更的历史 name。
  name: z.string().optional(),
  username: trimmed.pipe(z.string().min(1).max(30).regex(/^[a-z0-9_]+$/)),
  avatar: z.string().url().optional().or(z.literal("")),
  bio: z.string().max(250).optional().or(z.literal("")),
  customLinks: z.array(customLinkSchema).max(5).optional(),
  // 公开昵称：30 天可改一次（`nicknameSetAt` 冷却），与 username 解耦。
  nickname: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "unauthorized", message: "You must be logged in" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "validation_error", message: "Invalid JSON" },
        { status: 400 }
      );
    }
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", message: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, username, avatar, bio, customLinks, nickname } = parsed.data;

    try {
      const user = await db.$transaction(async (tx) => {
        // READ COMMITTED 下锁等待结束后读到最新行；检查和写入持有同一行锁。
        const [current] = await tx.$queryRaw<Array<{
          name: string | null;
          nickname: string | null;
          nicknameSetAt: Date | null;
          deletedAt: Date | null;
          flagged: boolean;
        }>>`
          SELECT "name", "nickname", "nicknameSetAt", "deletedAt", "flagged"
          FROM "users" WHERE "id" = ${session.user.id} FOR UPDATE
        `;
        if (!current) {
          throw new DisplayNameError(404, "not_found", "User not found");
        }
        if (current.deletedAt || current.flagged) {
          throw new DisplayNameError(403, "forbidden", "Account unavailable");
        }

        const data: Prisma.UserUpdateInput = {
          username,
          ...(avatar !== undefined ? { avatar: avatar || null } : {}),
          ...(bio !== undefined ? { bio: bio || null } : {}),
          ...(customLinks !== undefined ? {
            customLinks: customLinks.length > 0 ? customLinks : Prisma.DbNull,
          } : {}),
        };
        // 显式 nickname 优先；旧客户端原样回传 name 不视为改昵称。
        const requestedNickname = nickname ?? (
          name !== undefined && name.trim() !== current.name?.trim() ? name : undefined
        );
        if (requestedNickname !== undefined) {
          const nextNickname = assertValidNickname(requestedNickname);
          const currentNickname = current.nickname?.trim() || current.name?.trim();
          if (nextNickname !== currentNickname) {
            const now = new Date();
            assertNicknameChangeAllowed(current.nicknameSetAt, now);
            data.nicknameSetAt = now;
          }
          data.name = nextNickname;
          data.nickname = nextNickname;
        }

        return tx.user.update({
          where: { id: session.user.id },
          data,
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            avatar: true,
            bio: true,
            customLinks: true,
            nickname: true,
            nicknameSetAt: true,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

      return NextResponse.json(user);
    } catch (error) {
      if (isUniqueConstraintViolation(error, "username")) {
        return NextResponse.json(
          { error: "username_taken", message: "This username is already taken" },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof DisplayNameError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status, headers: error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {} }
      );
    }
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "unauthorized", message: "You must be logged in" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        nickname: true,
        nicknameSetAt: true,
        deletedAt: true,
        flagged: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "not_found", message: "User not found" },
        { status: 404 }
      );
    }

    const { deletedAt, flagged, ...profile } = user;
    if (deletedAt || flagged) {
      return NextResponse.json(
        { error: "forbidden", message: "Account unavailable" },
        { status: 403 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Something went wrong" },
      { status: 500 }
    );
  }
}
