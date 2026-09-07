// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Template } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), admin: vi.fn(), review: vi.fn(),
  db: { user: { findUnique: vi.fn() }, category: { findUnique: vi.fn(), findMany: vi.fn() }, template: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() }, auditLog: { create: vi.fn() }, $transaction: vi.fn() },
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/admin-permissions", () => ({ requireAdminPermission: mocks.admin }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/template-review", () => ({ reviewTemplate: mocks.review }));
import { GET as list, POST as create } from "@/app/api/templates/route";
import { GET as detail, PATCH as edit } from "@/app/api/templates/[id]/route";
import { GET as mine } from "@/app/api/templates/mine/route";
import { POST as submit } from "@/app/api/templates/[id]/submit/route";
import { POST as revise } from "@/app/api/templates/[id]/revise/route";
import { GET as queue } from "@/app/api/admin/templates/route";
import { POST as review } from "@/app/api/admin/templates/[id]/review/route";
import { POST as recheck } from "@/app/api/admin/templates/[id]/recheck/route";

const context = { params: Promise.resolve({ id: "tpl1" }) };
const valid = { title: "文章整理", summary: "清晰表达", description: "整理输入文章", categoryId: "scene", formSchema: [], promptBody: "请整理用户提供的文章。", outputType: "TEXT" };
const aiPass = { verdict: "PASS", pass: true, scores: { compliance: 95, quality: 90, intent: 90 }, reason: "合规", source: "AI", model: "test", checkedAt: "2026-09-07T00:00:00.000Z" };
let record: Template;
const req = (data?: unknown, url = "http://localhost/api/templates") => new Request(url, data === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
function matches(where: Record<string, unknown>) {
  if (where.id && where.id !== record.id) return false;
  if (where.authorId && where.authorId !== record.authorId) return false;
  if (where.status) {
    if (typeof where.status === "string" && record.status !== where.status) return false;
    if (typeof where.status === "object" && !(where.status as { in: string[] }).in.includes(record.status)) return false;
  }
  if (where.updatedAt && new Date(where.updatedAt as Date).getTime() !== record.updatedAt.getTime()) return false;
  return true;
}
beforeEach(() => {
  vi.resetAllMocks();
  record = { ...valid, id: "tpl1", slug: "test-template", authorId: "author", icon: null, coverUrl: null, modelKey: null, params: null, estimatedCost: 1, status: "DRAFT", reviewScore: null, reviewNote: null, reviewedAt: null, useCount: 0, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01") } as Template;
  mocks.auth.mockResolvedValue({ user: { id: "author", verified: true } });
  mocks.db.user.findUnique.mockResolvedValue({ id: "author", verified: true, deletedAt: null, flagged: false, xp: 0 });
  mocks.admin.mockResolvedValue({ userId: "admin" });
  mocks.db.category.findUnique.mockResolvedValue({ id: "scene", parentId: "domain" });
  mocks.db.category.findMany.mockResolvedValue([]);
  mocks.db.template.findUnique.mockImplementation(async () => ({ ...record }));
  mocks.db.template.findUniqueOrThrow.mockImplementation(async () => ({ ...record }));
  mocks.db.template.findFirst.mockImplementation(async ({ where }) => matches(where) ? { ...record } : null);
  mocks.db.template.findMany.mockResolvedValue([]);
  mocks.db.template.create.mockImplementation(async ({ data }) => ({ ...record, ...data, id: "new-template" }));
  mocks.db.template.updateMany.mockImplementation(async ({ where, data }) => {
    if (!matches(where)) return { count: 0 };
    record = { ...record, ...data };
    return { count: 1 };
  });
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit" });
  mocks.db.$transaction.mockImplementation(async (fn) => {
    const before = { ...record };
    try { return await fn(mocks.db); } catch (error) { record = before; throw error; }
  });
  mocks.review.mockResolvedValue(aiPass);
});

describe("模板访问与字段边界", () => {
  it.each([null, { id: "author", verified: false }, { id: "author", verified: true, deletedAt: new Date() }, { id: "author", verified: true, flagged: true }])("从数据库拒绝不合格作者 %#", async (user) => {
    mocks.db.user.findUnique.mockResolvedValue(user);
    expect((await create(req(valid))).status).toBe(403);
    expect(mocks.db.template.create).not.toHaveBeenCalled();
  });
  it.each(["edit", "submit", "revise"])("账户被封禁后不能继续 %s", async (action) => {
    mocks.db.user.findUnique.mockResolvedValue({ id: "author", verified: true, flagged: true, deletedAt: null });
    const response = action === "edit" ? await edit(req(valid), context) : action === "submit" ? await submit(req({}), context) : await revise(req({}), context);
    expect(response.status).toBe(403);
    expect(mocks.db.template.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.template.create).not.toHaveBeenCalled();
  });
  it("匿名不可创建", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await create(req(valid))).status).toBe(401);
  });
  it("零经验已验证用户可以创建草稿，作者与状态由服务端设置且审计", async () => {
    expect((await create(req(valid))).status).toBe(201);
    expect(mocks.db.template.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ authorId: "author", status: "DRAFT", estimatedCost: 1 }) }));
    expect(mocks.db.$transaction).toHaveBeenCalled();
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "TEMPLATE_CREATED" }) }));
  });
  it.each(["authorId", "status", "reviewScore", "reviewNote", "reviewedAt", "estimatedCost", "useCount", "modelKey", "params"])("创建和编辑拒绝注入 %s", async (field) => {
    expect((await create(req({ ...valid, [field]: "forged" }))).status).toBe(400);
    expect((await edit(req({ ...valid, [field]: "forged" }), context)).status).toBe(400);
  });
  it.each(["DRAFT", "PENDING", "REJECTED", "ARCHIVED"] as const)("公开详情不能读取 %s（即使是作者）", async (status) => {
    record.status = status;
    expect((await detail(req(), context)).status).toBe(404);
  });
  it("公开详情只读已发布", async () => {
    record.status = "PUBLISHED";
    expect((await detail(req(), context)).status).toBe(200);
    expect(mocks.db.template.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "PUBLISHED" }) }));
  });
  it("私人列表始终限定当前数据库用户", async () => {
    expect((await mine(req())).status).toBe(200);
    expect(mocks.db.template.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { authorId: "author" } }));
  });
  it("父领域包含直接分类与子场景，子场景组合条件生效", async () => {
    await list(req(undefined, "http://localhost/api/templates?domain=writing&scene=summary"));
    expect(mocks.db.template.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "PUBLISHED", category: { is: { slug: "summary", parent: { is: { slug: "writing", parentId: null } } } } }) }));
    await list(req(undefined, "http://localhost/api/templates?domain=writing"));
    expect(mocks.db.template.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }));
  });
  it("拒绝不存在的分类", async () => {
    mocks.db.category.findUnique.mockResolvedValue(null);
    expect((await create(req(valid))).status).toBe(400);
  });
});

describe("模板状态机与事务审计", () => {
  it("不能编辑或提交别人的模板", async () => {
    record.authorId = "someone-else";
    expect((await edit(req(valid), context)).status).toBe(404);
    expect((await submit(req({}), context)).status).toBe(404);
  });
  it.each(["PENDING", "PUBLISHED", "ARCHIVED"] as const)("%s 正文冻结且不能重新提交", async (status) => {
    record.status = status;
    expect((await edit(req(valid), context)).status).toBe(409);
    expect((await submit(req({}), context)).status).toBe(409);
    expect(mocks.db.template.updateMany).not.toHaveBeenCalled();
  });
  it.each(["DRAFT", "REJECTED"] as const)("%s 可以编辑，旧AI审核被清空", async (status) => {
    record.status = status; record.reviewScore = aiPass;
    expect((await edit(req(valid), context)).status).toBe(200);
    expect(record.status).toBe("DRAFT");
    expect(record.reviewScore).not.toEqual(aiPass);
    expect(mocks.db.auditLog.create).toHaveBeenCalled();
  });
  it("提交后即使AI PASS也只能待审", async () => {
    expect((await submit(req({}), context)).status).toBe(200);
    expect(record.status).toBe("PENDING");
    expect(record.reviewScore).toEqual(aiPass);
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(2);
  });
  it.each(["UNAVAILABLE", "BLOCKED"])("AI %s 不上架", async (verdict) => {
    mocks.review.mockResolvedValue({ verdict, reason: "初审未通过" });
    await submit(req({}), context);
    expect(record.status).toBe("PENDING");
    expect(record.reviewScore).toEqual(expect.objectContaining({ verdict }));
    expect((await review(req({ action: "publish", note: "人工确认" }), context)).status).toBe(409);
  });
  it("AI进行时状态或版本已变，过期结果不能落库", async () => {
    mocks.review.mockImplementation(async () => { record.updatedAt = new Date(record.updatedAt.getTime() + 5000); return aiPass; });
    expect((await submit(req({}), context)).status).toBe(409);
    expect(record.reviewScore).not.toEqual(aiPass);
    const call = mocks.db.template.updateMany.mock.calls.at(-1)![0];
    expect(call.where).toEqual(expect.objectContaining({ id: "tpl1", status: "PENDING", updatedAt: expect.any(Date) }));
  });
  it("条件更新冲突不写审计", async () => {
    mocks.db.template.updateMany.mockResolvedValue({ count: 0 });
    expect((await edit(req(valid), context)).status).toBe(409);
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });
  it("审计失败回滚状态变更", async () => {
    mocks.db.auditLog.create.mockRejectedValue(new Error("audit unavailable"));
    expect((await submit(req({}), context)).status).toBe(500);
    expect(record.status).toBe("DRAFT");
    expect(mocks.review).not.toHaveBeenCalled();
  });
  it("线上修改另建草稿，线上正文和审核保持不变", async () => {
    record.status = "PUBLISHED"; record.reviewScore = aiPass;
    const original = { ...record };
    expect((await revise(req({}), context)).status).toBe(201);
    expect(record).toEqual(original);
    expect(mocks.db.template.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT", authorId: "author", promptBody: original.promptBody }) }));
    expect(mocks.db.template.updateMany).not.toHaveBeenCalled();
  });
});

describe("管理员双重审核", () => {
  beforeEach(() => { record.status = "PENDING"; record.reviewScore = aiPass; });
  it("队列、人工复核、AI复查均要求 PROMPTS_MANAGE", async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await queue(req())).status).toBe(403);
    expect((await review(req({ action: "publish", note: "确认" }), context)).status).toBe(403);
    expect((await recheck(req({}), context)).status).toBe(403);
    expect(mocks.admin).toHaveBeenCalledWith("PROMPTS_MANAGE");
    expect(mocks.db.template.updateMany).not.toHaveBeenCalled();
  });
  it("禁止作者自审，包括AI复查", async () => {
    mocks.admin.mockResolvedValue({ userId: "author" });
    expect((await review(req({ action: "publish", note: "通过" }), context)).status).toBe(403);
    expect((await review(req({ action: "reject", note: "驳回" }), context)).status).toBe(403);
    expect((await recheck(req({}), context)).status).toBe(403);
  });
  it.each([{ verdict: "PASS" }, { ...aiPass, scores: { compliance: 1, quality: 90, intent: 90 } }, { ...aiPass, checkedAt: "invalid" }])("不完整或不合格的历史PASS记录不能发布 %#", async (score) => {
    record.reviewScore = score;
    expect((await review(req({ action: "publish", note: "人工确认" }), context)).status).toBe(409);
  });
  it("AI PASS后人工发布有复核审计，重复发布失败", async () => {
    expect((await review(req({ action: "publish", note: "人工检查正文通过" }), context)).status).toBe(200);
    expect(record.status).toBe("PUBLISHED");
    expect(record.reviewedAt).toBeInstanceOf(Date);
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: "admin", action: "TEMPLATE_PUBLISHED", before: expect.objectContaining({ status: "PENDING" }), after: expect.objectContaining({ status: "PUBLISHED" }) }) }));
    expect((await review(req({ action: "publish", note: "再次发布" }), context)).status).toBe(409);
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it("并发人工发布只有一次成功和一条发布审计", async () => {
    const results = await Promise.all([
      review(req({ action: "publish", note: "复核一" }), context),
      review(req({ action: "publish", note: "复核二" }), context),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(mocks.db.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it("旧AI返回前人工驳回不能被覆盖", async () => {
    mocks.review.mockImplementation(async () => {
      expect((await review(req({ action: "reject", note: "人工发现说明缺失" }), context)).status).toBe(200);
      return aiPass;
    });
    expect((await recheck(req({}), context)).status).toBe(409);
    expect(record.status).toBe("REJECTED");
    expect(record.reviewScore).not.toEqual(aiPass);
  });
  it("人工拒绝必须填写理由", async () => {
    expect((await review(req({ action: "reject", note: " " }), context)).status).toBe(400);
    expect((await review(req({ action: "reject", note: "请补充输入说明" }), context)).status).toBe(200);
    expect(record.status).toBe("REJECTED");
    expect(record.reviewNote).toBe("请补充输入说明");
  });
  it("重新初审先撤销旧PASS，服务失败不能沿用", async () => {
    mocks.review.mockImplementation(async () => {
      expect(record.reviewScore).not.toEqual(aiPass);
      return { verdict: "UNAVAILABLE", reason: "服务不可用" };
    });
    expect((await recheck(req({}), context)).status).toBe(200);
    expect((await review(req({ action: "publish", note: "确认" }), context)).status).toBe(409);
  });
});
