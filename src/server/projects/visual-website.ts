import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { VISUAL_WEBSITE_ID, visualWebsiteSaveSchema, visualWebsiteSchema, type VisualWebsiteState } from "@/contracts/visual-website";
import { plainResumeWebsiteCopy, resumeWebsiteMarkdown } from "@/domain/projects/resume-website";
import { ProjectServiceError } from "./service";
import { ownedModelAsset } from "@/server/visual-portfolio/assets";

export async function getVisualWebsite(projectId: string, userId: string): Promise<VisualWebsiteState> {
 const project = await db.project.findFirst({ where: { id: projectId, ownerId: userId }, select: { id: true, artifacts: { where: { workflowId: VISUAL_WEBSITE_ID }, select: { currentVersion: true, versions: { orderBy: { version: "desc" }, take: 20, select: { version: true, contentJson: true, createdAt: true } } } } } });
 if (!project) throw new ProjectServiceError("NOT_FOUND", "NOT_FOUND", 404);
 const artifact = project.artifacts[0];
 return { projectId, currentVersion: artifact?.currentVersion ?? 0, versions: (artifact?.versions ?? []).flatMap(v => { const parsed = visualWebsiteSchema.safeParse(v.contentJson); return parsed.success ? [{ version: v.version, createdAt: v.createdAt.toISOString(), document: parsed.data }] : []; }) };
}
/** Manual edits are private, free, immutable versions. Never create a workflow run or debit quota. */
export async function saveVisualWebsite(userId: string, raw: unknown) {
 const input = visualWebsiteSaveSchema.parse(raw);
 const hash = createHash("sha256").update(JSON.stringify(input.document)).digest("hex");
 try {
 return await db.$transaction(async tx => {
  const user = await tx.user.findFirst({ where: { id: userId, deletedAt: null, flagged: false }, select: { id: true } });
  if (!user) throw new ProjectServiceError("FORBIDDEN", "FORBIDDEN", 403);
  const modelAsset = input.document.appearance.tour?.modelAsset;
  if (modelAsset) await ownedModelAsset(userId, modelAsset, tx);
  let project = await tx.project.findUnique({ where: { id: input.projectId }, select: { ownerId: true, status: true } });
  if (!project) {
   if (input.expectedVersion !== 0) throw new ProjectServiceError("NOT_FOUND", "NOT_FOUND", 404);
   project = await tx.project.create({ data: { id: input.projectId, ownerId: userId, title: input.document.profile.fullName + " · Portfolio", goal: "PORTFOLIO", visibility: "PRIVATE" }, select: { ownerId: true, status: true } });
  }
  if (project.ownerId !== userId) throw new ProjectServiceError("NOT_FOUND", "NOT_FOUND", 404);
  await tx.$queryRaw`SELECT id FROM projects WHERE id = ${input.projectId} AND "ownerId" = ${userId} FOR UPDATE`;
  // Archive/ownership is re-read after the lock, so a concurrent archive cannot accept a save.
  const editable = await tx.project.findFirst({ where: { id: input.projectId, ownerId: userId, status: "ACTIVE" }, select: { id: true } });
  if (!editable) throw new ProjectServiceError("PROJECT_ARCHIVED", "PROJECT_ARCHIVED", 409);
  let artifact = await tx.artifact.findUnique({ where: { projectId_workflowId: { projectId: input.projectId, workflowId: VISUAL_WEBSITE_ID } }, select: { id: true, currentVersion: true, versions: { orderBy: { version: "desc" }, take: 1, select: { factSnapshotHash: true } } } });
  if (artifact && artifact.currentVersion === input.expectedVersion + 1 && artifact.versions[0]?.factSnapshotHash === hash) return { projectId: input.projectId, version: artifact.currentVersion };
  if ((artifact?.currentVersion ?? 0) !== input.expectedVersion) throw new ProjectServiceError("VERSION_CONFLICT", "VERSION_CONFLICT", 409);
  if (!artifact) {
   const created = await tx.artifact.create({ data: { projectId: input.projectId, workflowId: VISUAL_WEBSITE_ID, kind: "RESUME_WEBSITE", title: input.document.profile.fullName, visibility: "PRIVATE", createdById: userId }, select: { id: true, currentVersion: true } });
   artifact = { ...created, versions: [] };
  }
  const version = input.expectedVersion + 1;
  await tx.artifactVersion.create({ data: { artifactId: artifact.id, version, contentJson: input.document as Prisma.InputJsonValue, contentMarkdown: resumeWebsiteMarkdown(input.document.profile, plainResumeWebsiteCopy(input.document.profile)), factSnapshotHash: hash, createdById: userId, workflowRunId: null } });
  await tx.artifact.update({ where: { id: artifact.id }, data: { currentVersion: version, title: input.document.profile.fullName } });
  await tx.project.update({ where: { id: input.projectId }, data: { updatedAt: new Date() } });
  return { projectId: input.projectId, version };
 // Remote PostgreSQL round trips can exceed Prisma's 5s default even for a
 // small document. Keep this atomic operation bounded without changing other transactions.
 }, { maxWait: 5_000, timeout: 15_000 });
 } catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ProjectServiceError("VERSION_CONFLICT", "VERSION_CONFLICT", 409);
  throw error;
 }
}
