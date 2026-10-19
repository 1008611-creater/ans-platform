import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { toUserFacingError } from "@/lib/user-facing-error";
import { hiddenRouteResponse, isInternalOperationsApiEnabled } from "@/lib/runtime-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JinaResult = {
  title: string;
  url: string;
  description: string;
  date?: string;
};

type JinaReadResult = {
  title: string;
  url: string;
  content: string;
  description?: string;
};

const execFileAsync = promisify(execFile);
const pythonBin = process.env.PYTHON ?? "python";
const jinaSkillScript = path.join(
  process.env.USERPROFILE ?? "",
  ".codex",
  "skills",
  "jina-search",
  "scripts",
  "jina_search.py"
);

function parseTextResults(text: string): JinaResult[] {
  const chunks = text.split(/\n(?=\[\d+\]\s+Title:)/g);
  return chunks
    .map((chunk) => {
      const title = chunk.match(/\[\d+\]\s+Title:\s*(.+)/)?.[1]?.trim() ?? "";
      const url = chunk.match(/\[\d+\]\s+URL Source:\s*(.+)/)?.[1]?.trim() ?? "";
      const description = chunk.match(/\[\d+\]\s+Description:\s*([\s\S]*?)(?=\n\[\d+\]\s+|\n#|\n$)/)?.[1]?.trim() ?? "";
      const date =
        chunk.match(/\[\d+\]\s+(?:Published Time|Date):\s*(.+)/)?.[1]?.trim() ??
        chunk.match(/\[\d+\]\s+Published Time:\s*(.+)/)?.[1]?.trim();
      return { title, url, description, date };
    })
    .filter((item) => item.title && item.url)
    .slice(0, 8);
}

function normalizeJsonResults(payload: unknown): JinaResult[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const results: JinaResult[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
    const result: JinaResult = {
        title: String(entry.title ?? ""),
        url: String(entry.url ?? ""),
        description: String(entry.description ?? entry.content ?? "").replace(/\s+/g, " ").trim(),
        date: entry.date ? String(entry.date) : undefined
      };
    if (result.title && result.url) results.push(result);
    if (results.length >= 8) break;
  }

  return results;
}

function normalizeReadResult(payload: unknown, fallbackUrl: string): JinaReadResult | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const entry = data as Record<string, unknown>;
  const content = String(entry.content ?? "").trim();
  if (!content) return null;
  return {
    title: String(entry.title ?? "网页摘要"),
    url: String(entry.url ?? fallbackUrl),
    description: entry.description ? String(entry.description) : undefined,
    content
  };
}

function buildAdvice(query: string) {
  const lower = query.toLowerCase();
  if (/验证码|captcha|人机|verification|verify/.test(lower)) {
    return ["优先把这类流程设计成人工确认点。", "自动化只负责识别状态、暂停、记录结果。"];
  }
  if (/选择器|selector|click|点击|button|input|输入/.test(lower)) {
    return ["先用语义选择器，其次用文本和 role，最后才用坐标。", "每次执行前保留预演，降低误点成本。"];
  }
  return ["把搜索结果当作外部上下文，不直接替代你的确认。", "遇到高风险动作，保持人工确认。"];
}

async function searchWithSkillScript(query: string) {
  if (!existsSync(jinaSkillScript)) return null;

  const { stdout } = await execFileAsync(
    pythonBin,
    [jinaSkillScript, "--format", "json", "--timeout", "45", "search", query],
    {
      cwd: process.cwd(),
      timeout: 60000,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      }
    }
  );

  const parsed = JSON.parse(stdout) as unknown;
  return normalizeJsonResults(parsed);
}

async function readWithSkillScript(url: string) {
  if (!existsSync(jinaSkillScript)) return null;

  const { stdout } = await execFileAsync(
    pythonBin,
    [jinaSkillScript, "--format", "json", "--timeout", "45", "read", url],
    {
      cwd: process.cwd(),
      timeout: 60000,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      }
    }
  );

  return normalizeReadResult(JSON.parse(stdout) as unknown, url);
}

async function searchWithFetch(query: string) {
  const headers: HeadersInit = {
    Accept: "application/json",
    "X-Respond-With": "no-content"
  };
  const key = process.env.JINA_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;

  const url = `https://s.jina.ai/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(45000)
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Jina 检索失败：${response.status} ${raw.slice(0, 200)}`);
  }

  try {
    return normalizeJsonResults(JSON.parse(raw) as unknown);
  } catch {
    return parseTextResults(raw);
  }
}

async function readWithFetch(url: string) {
  const headers: HeadersInit = {
    Accept: "application/json"
  };
  const key = process.env.JINA_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;

  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(45000)
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Jina Reader 失败：${response.status} ${raw.slice(0, 200)}`);
  }

  try {
    return normalizeReadResult(JSON.parse(raw) as unknown, url);
  } catch {
    return {
      title: "网页摘要",
      url,
      content: raw
    };
  }
}

export async function GET() {
  if (!isInternalOperationsApiEnabled()) return hiddenRouteResponse();
  return NextResponse.json({
    hasKey: Boolean(process.env.JINA_API_KEY),
    hasSkillScript: existsSync(jinaSkillScript),
    endpoint: "s.jina.ai",
    status: "ready"
  });
}

export async function POST(request: NextRequest) {
  if (!isInternalOperationsApiEnabled()) return hiddenRouteResponse();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const mode = String(body.mode ?? "search");
  const query = String(body.query ?? "").trim();
  const targetUrl = String(body.url ?? "").trim();

  if (mode === "read") {
    if (!/^https?:\/\//.test(targetUrl)) {
      return NextResponse.json({ error: "请输入完整的 http/https 链接。" }, { status: 400 });
    }

    let read: JinaReadResult | null = null;
    let provider = "jina-search skill";
    try {
      read = await readWithSkillScript(targetUrl);
      if (!read) {
        provider = "fetch";
        read = await readWithFetch(targetUrl);
      }
    } catch (error) {
      const message = toUserFacingError(error instanceof Error ? error.message : error, "Jina Reader 失败");
      return NextResponse.json(
        {
          error: message,
          hasKey: Boolean(process.env.JINA_API_KEY),
          hasSkillScript: existsSync(jinaSkillScript)
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode,
      hasKey: Boolean(process.env.JINA_API_KEY),
      hasSkillScript: existsSync(jinaSkillScript),
      provider,
      source: "https://jina.ai/reader/",
      read
    });
  }

  if (!query) {
    return NextResponse.json({ error: "请输入要检索的问题。" }, { status: 400 });
  }

  let results: JinaResult[] = [];
  let provider = "jina-search skill";
  try {
    results = (await searchWithSkillScript(query)) ?? [];
    if (!results.length) {
      provider = "fetch";
      results = await searchWithFetch(query);
    }
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "Jina 检索失败");
    return NextResponse.json(
      {
        error: message,
        hasKey: Boolean(process.env.JINA_API_KEY),
        hasSkillScript: existsSync(jinaSkillScript)
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    query,
    hasKey: Boolean(process.env.JINA_API_KEY),
    hasSkillScript: existsSync(jinaSkillScript),
    provider,
    source: "https://jina.ai/reader/",
    advice: buildAdvice(query),
    results
  });
}
