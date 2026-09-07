import { NextResponse } from "next/server";
import { CommunityError } from "@/lib/community";

export function communityJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function communityFailure(error: unknown) {
  if (error instanceof CommunityError) return communityJson({ error: error.code }, error.status);
  return communityJson({ error: "SERVER_ERROR" }, 500);
}
