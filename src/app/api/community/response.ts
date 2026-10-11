import { NextResponse } from "next/server";
import { HttpRequestError } from "@/server/http/json";
import { CommunityError } from "@/server/community/errors";

export function communityJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function communityFailure(error: unknown) {
  if (error instanceof HttpRequestError) return communityJson({ error: error.code }, error.status);
  if (error instanceof CommunityError) return communityJson({ error: error.code }, error.status);
  return communityJson({ error: "SERVER_ERROR" }, 500);
}
