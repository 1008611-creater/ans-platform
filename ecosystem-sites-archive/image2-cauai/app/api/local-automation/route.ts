import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { toUserFacingError } from "@/lib/user-facing-error";
import { hiddenRouteResponse, isInternalOperationsApiEnabled } from "@/lib/runtime-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const scriptDir = path.join(root, "automation", "gui_agent");
const recordingDir = path.join(scriptDir, "recordings");
const pythonBin = process.env.PYTHON ?? "python";

type ScriptResult = {
  ok: boolean;
  parsed: unknown | null;
  stdout: string;
  stderr: string;
  command: string[];
};

function isLocalAvailable() {
  return existsSync(path.join(scriptDir, "inspect_click.py")) && existsSync(path.join(scriptDir, "web_action.py"));
}

function readJson(name: string) {
  const target = path.join(recordingDir, name);
  if (!existsSync(target)) return null;
  try {
    return JSON.parse(readFileSync(target, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") inString = true;
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      try {
        return JSON.parse(text.slice(start, index + 1)) as unknown;
      } catch {
        return null;
      }
    }
  }

  return null;
}

async function runPython(args: string[], timeout = 45000): Promise<ScriptResult> {
  if (!isLocalAvailable()) {
    throw new Error("没有找到本地自动化脚本，请确认当前目录是 seedance2 项目根目录。");
  }

  const { stdout, stderr } = await execFileAsync(pythonBin, args, {
    cwd: root,
    timeout,
    windowsHide: false,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      PYTHONIOENCODING: "utf-8"
    }
  });

  return {
    ok: true,
    parsed: extractJson(stdout),
    stdout,
    stderr,
    command: [pythonBin, ...args]
  };
}

function json(payload: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json({
    localAvailable: isLocalAvailable(),
    ...payload
  }, init);
}

export async function GET() {
  if (!isInternalOperationsApiEnabled()) return hiddenRouteResponse();
  return json({
    lastClick: readJson("last_click.json"),
    lastWebClick: readJson("last_web_click.json"),
    lastWebAction: readJson("last_web_action.json")
  });
}

export async function POST(request: NextRequest) {
  if (!isInternalOperationsApiEnabled()) return hiddenRouteResponse();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const nearbyIndex = Number(body.nearbyIndex ?? 0);
  const selector = String(body.selector ?? "");
  const text = String(body.text ?? "");

  try {
    let result: ScriptResult;

    if (action === "inspect-click") {
      result = await runPython(["automation\\gui_agent\\inspect_click.py", "--screenshot"], 120000);
    } else if (action === "inspect-web") {
      result = await runPython(["automation\\gui_agent\\inspect_web_click.py"], 45000);
    } else if (action === "dry-run-click") {
      result = await runPython([
        "automation\\gui_agent\\web_action.py",
        "--dry-run",
        "click-last",
        "--target",
        "nearby",
        "--nearby-index",
        String(nearbyIndex)
      ], 45000);
    } else if (action === "click-nearby") {
      result = await runPython([
        "automation\\gui_agent\\web_action.py",
        "click-last",
        "--target",
        "nearby",
        "--nearby-index",
        String(nearbyIndex)
      ], 45000);
    } else if (action === "click-selector") {
      if (!selector) return json({ error: "请填写 CSS 选择器。" }, { status: 400 });
      result = await runPython(["automation\\gui_agent\\web_action.py", "click-selector", selector], 45000);
    } else if (action === "fill-selector") {
      if (!selector) return json({ error: "请填写 CSS 选择器。" }, { status: 400 });
      result = await runPython(["automation\\gui_agent\\web_action.py", "fill-selector", selector, text], 45000);
    } else {
      return json({ error: "未知操作。" }, { status: 400 });
    }

    return json({
      result,
      lastClick: readJson("last_click.json"),
      lastWebClick: readJson("last_web_click.json"),
      lastWebAction: readJson("last_web_action.json")
    });
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "本地自动化执行失败。");
    return json({ error: message }, { status: 500 });
  }
}
