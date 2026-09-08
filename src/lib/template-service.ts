import { randomUUID } from "node:crypto";
import { Prisma, type Template } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { TemplateError } from "@/lib/template-access";
import { reviewTemplate } from "@/lib/template-review";

const formField = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/),
  label: z.string().trim().min(1).max(100),
  type: z.enum(["text", "textarea", "number", "select"]),
  required: z.boolean().optional(),
  options: z.array(z.string().min(1).max(200)).max(50).optional(),
  default: z.union([z.string().max(2000), z.number().finite()]).optional(),
  placeholder: z.string().max(200).optional(),
}).strict().refine((field) => field.type !== "select" || Boolean(field.options?.length), "选项字段必须提供可选值");
const contentSchema = z.object({
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(8000).nullable().optional(),
  categoryId: z.string().min(1).max(100).nullable().optional(),
  formSchema: z.array(formField).max(30).refine((fields) => new Set(fields.map((f) => f.key)).size === fields.length, "输入字段标识不能重复"),
  promptBody: z.string().trim().min(10).max(30000),
  outputType: z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO"]),
}).strict();
const humanReviewSchema = z.object({ action: z.enum(["publish", "reject"]), note: z.string().trim().min(1).max(2000) }).strict();
const passedReviewSchema = z.object({
  verdict: z.literal("PASS"), source: z.literal("AI"), pass: z.literal(true),
  scores: z.object({ compliance: z.number().min(80).max(100), quality: z.number().min(80).max(100), intent: z.number().min(80).max(100) }).strict(),
  reason: z.string().trim().min(1).max(2000), model: z.string().min(1), checkedAt: z.string().datetime(),
}).strict();
const privateInclude = { category: { select: { id: true, name: true, slug: true, parentId: true } } } as const;
const publicSelect = {
  id: true, slug: true, title: true, summary: true, description: true,
  promptBody: true, formSchema: true, outputType: true, estimatedCost: true, createdAt: true,
  category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
} as const;

export function templatePublishedWhere(filters: { domain?: string; scene?: string }): Prisma.TemplateWhereInput {
  const { domain, scene } = filters;
  if (scene) return { status: "PUBLISHED", category: { is: { slug: scene, parent: { is: { ...(domain ? { slug: domain } : {}), parentId: null } } } } };
  if (domain) return { status: "PUBLISHED", OR: [
    { category: { is: { slug: domain, parentId: null } } },
    { category: { is: { parent: { is: { slug: domain, parentId: null } } } } },
  ] };
  return { status: "PUBLISHED" };
}
export async function listPublishedTemplates(filters: { domain?: string; scene?: string; page?: number }) {
  const page = Math.max(1, Math.min(10000, Math.floor(filters.page || 1)));
  return db.template.findMany({ where: templatePublishedWhere(filters), orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 24, skip: (page - 1) * 24, select: { id: true, slug: true, title: true, summary: true, outputType: true, category: { select: { name: true, slug: true } } } });
}
export async function getPublishedTemplate(key: string, bySlug = false) {
  return db.template.findFirst({ where: { ...(bySlug ? { slug: key } : { id: key }), status: "PUBLISHED" }, select: publicSelect });
}
export async function templateCategories() {
  return db.category.findMany({ where: { parentId: null }, orderBy: { order: "asc" }, select: {
    id: true, name: true, slug: true,
    children: { orderBy: { order: "asc" }, select: { id: true, name: true, slug: true } },
  } });
}
export async function listOwnTemplates(authorId: string) {
  return db.template.findMany({ where: { authorId }, orderBy: { updatedAt: "desc" }, take: 100, include: privateInclude });
}
export async function listTemplateQueue() {
  return db.template.findMany({ where: { status: "PENDING" }, orderBy: { updatedAt: "asc" }, take: 100, include: { ...privateInclude, author: { select: { id: true, username: true } } } });
}
async function content(input: unknown) {
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) throw new TemplateError(400, "模板字段无效：请检查标题、正文、表单和输出类型，勿传入审核或系统字段");
  const data = parsed.data;
  if (data.categoryId && !await db.category.findUnique({ where: { id: data.categoryId }, select: { id: true } })) throw new TemplateError(400, "分类不存在");
  return { ...data, summary: data.summary ?? null, description: data.description ?? null, categoryId: data.categoryId ?? null };
}
async function load(id: string) {
  const template = await db.template.findUnique({ where: { id } });
  if (!template) throw new TemplateError(404, "模板不存在");
  return template;
}
function own(template: Template, authorId: string) {
  if (template.authorId !== authorId) throw new TemplateError(404, "模板不存在");
}
function editable(template: Template) {
  if (template.status !== "DRAFT" && template.status !== "REJECTED") throw new TemplateError(409, "仅草稿或已驳回模板可编辑和提交；已发布模板请另建草稿");
}
function pending(template: Template, adminId: string) {
  if (template.authorId === adminId) throw new TemplateError(403, "不能审核自己的模板");
  if (template.status !== "PENDING") throw new TemplateError(409, "模板不在待审状态，请刷新");
}
function nextVersion(template: Template) { return new Date(Math.max(Date.now(), template.updatedAt.getTime() + 1)); }
const clearedReview = { reviewScore: Prisma.DbNull, reviewNote: null, reviewedAt: null };

// 所有状态更新及对应审计同事务提交；旧版本或状态不匹配时不产生审计。
async function change(template: Template, actorId: string, action: string, data: Prisma.TemplateUpdateManyMutationInput) {
  return db.$transaction(async (tx) => {
    const updatedAt = nextVersion(template);
    const result = await tx.template.updateMany({
      where: { id: template.id, authorId: template.authorId, status: template.status, updatedAt: template.updatedAt },
      data: { ...data, updatedAt },
    });
    if (result.count !== 1) throw new TemplateError(409, "模板已发生变化，请刷新后重试");
    const after = await tx.template.findUniqueOrThrow({ where: { id: template.id } });
    await tx.auditLog.create({ data: {
      actorId, action, resourceType: "template", resourceId: template.id,
      before: { status: template.status, updatedAt: template.updatedAt.toISOString(), reviewScore: template.reviewScore, reviewNote: template.reviewNote },
      after: { status: after.status, updatedAt: after.updatedAt.toISOString(), reviewScore: after.reviewScore, reviewNote: after.reviewNote },
    } });
    return after;
  });
}
export async function createTemplate(authorId: string, input: unknown) {
  const data = await content(input);
  return db.$transaction(async (tx) => {
    const template = await tx.template.create({ data: { ...data, authorId, slug: `tpl-${randomUUID()}`, status: "DRAFT", estimatedCost: 1 } });
    await tx.auditLog.create({ data: { actorId: authorId, action: "TEMPLATE_CREATED", resourceType: "template", resourceId: template.id, after: { status: "DRAFT" } } });
    return template;
  });
}
export async function editTemplate(id: string, authorId: string, input: unknown) {
  const data = await content(input);
  const template = await load(id);
  own(template, authorId); editable(template);
  return change(template, authorId, "TEMPLATE_EDITED", { ...data, ...clearedReview, status: "DRAFT" });
}
async function finishAI(template: Template, actorId: string) {
  const reviewScore = await reviewTemplate(template);
  return change(template, actorId, "TEMPLATE_AI_REVIEWED", { reviewScore });
}
export async function submitTemplate(id: string, authorId: string) {
  const template = await load(id);
  own(template, authorId); editable(template);
  const frozen = await change(template, authorId, "TEMPLATE_SUBMITTED", { ...clearedReview, status: "PENDING" });
  return finishAI(frozen, authorId);
}
export async function recheckTemplate(id: string, adminId: string) {
  const template = await load(id);
  pending(template, adminId);
  // 开始复查先撤销旧PASS，防止AI请求期间仍然使用旧结果发布。
  const frozen = await change(template, adminId, "TEMPLATE_AI_RECHECK_REQUESTED", { ...clearedReview });
  return finishAI(frozen, adminId);
}
export async function reviewTemplateManually(id: string, adminId: string, input: unknown) {
  const parsed = humanReviewSchema.safeParse(input);
  if (!parsed.success) throw new TemplateError(400, "请选择发布或驳回，并填写复核理由");
  const template = await load(id);
  pending(template, adminId);
  if (parsed.data.action === "publish" && !passedReviewSchema.safeParse(template.reviewScore).success) {
    throw new TemplateError(409, "必须先获得 AI 初审 PASS，才可人工发布");
  }
  return change(template, adminId, parsed.data.action === "publish" ? "TEMPLATE_PUBLISHED" : "TEMPLATE_REJECTED", {
    status: parsed.data.action === "publish" ? "PUBLISHED" : "REJECTED", reviewNote: parsed.data.note, reviewedAt: new Date(),
  });
}
export async function revisePublishedTemplate(id: string, authorId: string) {
  const template = await load(id);
  own(template, authorId);
  if (template.status !== "PUBLISHED") throw new TemplateError(409, "仅已发布模板可另建修订草稿");
  return db.$transaction(async (tx) => {
    const draft = await tx.template.create({ data: {
      title: template.title, summary: template.summary, description: template.description,
      categoryId: template.categoryId, formSchema: template.formSchema as Prisma.InputJsonValue,
      promptBody: template.promptBody, outputType: template.outputType,
      authorId, slug: `tpl-${randomUUID()}`, status: "DRAFT", estimatedCost: 1,
    } });
    await tx.auditLog.create({ data: { actorId: authorId, action: "TEMPLATE_REVISION_CREATED", resourceType: "template", resourceId: draft.id, after: { status: "DRAFT" }, metadata: { sourceTemplateId: template.id } } });
    return draft;
  });
}
