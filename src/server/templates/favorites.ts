import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export async function getPublishedTemplateByKey(key: string) {
  return db.template.findFirst({
    where: { status: "PUBLISHED", OR: [{ id: key }, { slug: key }] },
    select: { id: true, slug: true, title: true },
  });
}

export async function isTemplateFavorited(userId: string, templateId: string) {
  const favorite = await db.templateFavorite.findUnique({
    where: { userId_templateId: { userId, templateId } },
    select: { createdAt: true },
  });
  return Boolean(favorite);
}

export async function favoriteTemplate(
  userId: string,
  template: { id: string; slug: string },
  context: { ipAddress: string | null; userAgent: string | null },
) {
  const favorite = await db.templateFavorite.upsert({
    where: { userId_templateId: { userId, templateId: template.id } },
    create: { userId, templateId: template.id },
    update: {},
  });
  await writeAuditLog({
    actorId: userId,
    action: "TEMPLATE_FAVORITED",
    resourceType: "template",
    resourceId: template.id,
    after: { favorited: true, createdAt: favorite.createdAt },
    metadata: { templateId: template.id, templateSlug: template.slug },
    ...context,
  });
}

export async function unfavoriteTemplate(
  userId: string,
  template: { id: string; slug: string },
  context: { ipAddress: string | null; userAgent: string | null },
) {
  const removed = await db.templateFavorite.deleteMany({
    where: { userId, templateId: template.id },
  });
  if (removed.count > 0) {
    await writeAuditLog({
      actorId: userId,
      action: "TEMPLATE_UNFAVORITED",
      resourceType: "template",
      resourceId: template.id,
      before: { favorited: true },
      after: { favorited: false },
      metadata: { templateId: template.id, templateSlug: template.slug },
      ...context,
    });
  }
  return removed.count > 0;
}
