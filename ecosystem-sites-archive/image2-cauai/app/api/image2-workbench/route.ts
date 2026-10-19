import { NextRequest, NextResponse } from "next/server";
import { image2WorkbenchAccessResponse, loadImage2WorkbenchDataForRequest } from "@/lib/image2-workbench-access";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await loadImage2WorkbenchDataForRequest(request));
  } catch (error) {
    const accessResponse = await image2WorkbenchAccessResponse(error);
    if (accessResponse) return accessResponse;
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "工作台数据读取失败。") },
      { status: 500 }
    );
  }
}
