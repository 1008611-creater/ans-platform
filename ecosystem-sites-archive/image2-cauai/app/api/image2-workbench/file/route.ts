import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { image2WorkbenchAccessResponse, requireImage2WorkbenchTeamMember } from "@/lib/image2-workbench-access";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

const projectOutputRoot = path.resolve(
  process.env.DAIHUO_OUTPUT_ROOT || (process.env.VERCEL ? "/tmp/daihuo-output" : "D:/codex-work/daihuo/output")
);
const userHome = process.env.USERPROFILE ?? process.env.HOME ?? os.homedir();
const allowedRoots = [
  projectOutputRoot,
  path.join(/* turbopackIgnore: true */ userHome, "Downloads"),
  path.join(/* turbopackIgnore: true */ userHome, "Desktop")
].map((item) => path.resolve(/* turbopackIgnore: true */ item).toLowerCase());

function isAllowedPath(filePath: string) {
  const resolved = path.resolve(/* turbopackIgnore: true */ filePath).toLowerCase();
  return allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

export async function GET(request: NextRequest) {
  try {
    await requireImage2WorkbenchTeamMember(request);
    const filePath = request.nextUrl.searchParams.get("path") ?? "";
    if (!filePath || !isAllowedPath(filePath)) {
      return NextResponse.json({ error: "图片路径不可读取。" }, { status: 403 });
    }

    const file = await readFile(/* turbopackIgnore: true */ filePath);
    return new Response(new Uint8Array(file), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentTypeFor(filePath)
      }
    });
  } catch (error) {
    const accessResponse = await image2WorkbenchAccessResponse(error);
    if (accessResponse) return accessResponse;
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "图片读取失败。") },
      { status: 404 }
    );
  }
}
