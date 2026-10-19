import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { hiddenRouteResponse, isInternalOperationsApiEnabled } from "@/lib/runtime-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DouyinLeadStatus = "待拆解" | "已复制" | "已入池" | "放弃";
type DouyinLeadKind = "视频" | "账号" | "直播" | "商品";

type DouyinLead = {
  id: string;
  sourceUrl: string;
  accountName: string;
  sampleKind: DouyinLeadKind;
  category: string;
  title: string;
  hook: string;
  commentIntent: string;
  productSignal: string;
  evidence: string;
  note: string;
  status: DouyinLeadStatus;
  createdAt: string;
};

const dataDir = path.join(process.cwd(), "public", "data", "daihuo-scout");
const leadFile = path.join(dataDir, "douyin-leads.json");

export async function GET() {
  if (!isInternalOperationsApiEnabled()) return hiddenRouteResponse();
  return NextResponse.json({ leads: await readLeads() });
}

export async function POST(request: NextRequest) {
  if (!isInternalOperationsApiEnabled()) return hiddenRouteResponse();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const leads = normalizeLeadList(payload);
  await mkdir(dataDir, { recursive: true });
  await writeFile(leadFile, `${JSON.stringify(leads, null, 2)}\n`, "utf8");

  return NextResponse.json({ ok: true, leads });
}

async function readLeads() {
  try {
    const raw = await readFile(leadFile, "utf8");
    return normalizeLeadList(JSON.parse(raw));
  } catch {
    return [];
  }
}

function normalizeLeadList(payload: unknown) {
  const rawLeads = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload && Array.isArray((payload as { leads?: unknown }).leads)
      ? (payload as { leads: unknown[] }).leads
      : [];

  return rawLeads.map(normalizeLead).filter((lead): lead is DouyinLead => Boolean(lead));
}

function normalizeLead(value: unknown): DouyinLead | null {
  if (!value || typeof value !== "object") return null;
  const lead = value as Partial<DouyinLead>;
  if (typeof lead.sourceUrl !== "string" || !lead.sourceUrl.trim()) return null;

  return {
    id: typeof lead.id === "string" && lead.id ? lead.id : createLeadId(),
    sourceUrl: lead.sourceUrl.trim(),
    accountName: typeof lead.accountName === "string" ? lead.accountName.trim() : "",
    sampleKind: isLeadKind(lead.sampleKind) ? lead.sampleKind : "视频",
    category: typeof lead.category === "string" && lead.category ? lead.category : "童装",
    title: typeof lead.title === "string" ? lead.title.trim() : "",
    hook: typeof lead.hook === "string" ? lead.hook.trim() : "",
    commentIntent: typeof lead.commentIntent === "string" ? lead.commentIntent.trim() : "",
    productSignal: typeof lead.productSignal === "string" ? lead.productSignal.trim() : "",
    evidence: typeof lead.evidence === "string" ? lead.evidence.trim() : "",
    note: typeof lead.note === "string" ? lead.note.trim() : "",
    status: isLeadStatus(lead.status) ? lead.status : "待拆解",
    createdAt: typeof lead.createdAt === "string" ? lead.createdAt : new Date().toISOString()
  };
}

function isLeadKind(value: unknown): value is DouyinLeadKind {
  return value === "视频" || value === "账号" || value === "直播" || value === "商品";
}

function isLeadStatus(value: unknown): value is DouyinLeadStatus {
  return value === "待拆解" || value === "已复制" || value === "已入池" || value === "放弃";
}

function createLeadId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
