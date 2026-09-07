import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderTree, Tags, FileText } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { UsersTable } from "@/components/admin/users-table";
import { CategoriesTable } from "@/components/admin/categories-table";
import { TagsTable } from "@/components/admin/tags-table";
import { WebhooksTable } from "@/components/admin/webhooks-table";
import { PromptsManagement } from "@/components/admin/prompts-management";
import { ReportsTable } from "@/components/admin/reports-table";
import { SkillsManagement } from "@/components/admin/skills-management";
import { GovernanceManagement } from "@/components/admin/governance-management";
import { isAISearchEnabled } from "@/lib/ai/embeddings";
import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/lib/admin-permissions";
import { LayoutTemplate, KeyRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Manage your application",
};

export default async function AdminPage() {
  const session = await auth();
  const t = await getTranslations("admin");

  // Check if user is admin
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const adminRecord = await db.user.findUnique({ where: { id: session.user.id }, select: { adminPermissions: true } });
  const can = (permission: (typeof ADMIN_PERMISSIONS)[number]) => hasAdminPermission(adminRecord?.adminPermissions, permission);
  const visibleTabs = [
    can("USERS_VIEW") && "users",
    can("PROMPTS_VIEW") && "prompts",
    can("SKILLS_VIEW") && "skills",
    can("REPORTS_MANAGE") && "reports",
    can("AUDIT_VIEW") && "governance",
    can("PROMPTS_MANAGE") && "categories",
    can("PROMPTS_MANAGE") && "tags",
    can("WEBHOOKS_MANAGE") && "webhooks",
  ].filter(Boolean) as Array<"users" | "categories" | "tags" | "webhooks" | "prompts" | "skills" | "reports" | "governance">;

  // Fetch stats and AI search status
  const [userCount, promptCount, categoryCount, tagCount, aiSearchEnabled] = await Promise.all([
    db.user.count(),
    db.prompt.count({ where: { deletedAt: null } }),
    db.category.count(),
    db.tag.count(),
    isAISearchEnabled(),
  ]);
  
  // Count prompts without embeddings and total public prompts
  let promptsWithoutEmbeddings = 0;
  let totalPublicPrompts = 0;
  if (aiSearchEnabled) {
    [promptsWithoutEmbeddings, totalPublicPrompts] = await Promise.all([
      db.prompt.count({
        where: {
          isPrivate: false,
          deletedAt: null,
          embedding: { equals: Prisma.DbNull },
        },
      }),
      db.prompt.count({
        where: {
          isPrivate: false,
          deletedAt: null,
        },
      }),
    ]);
  }

  // Count prompts without slugs
  const [promptsWithoutSlugs, totalPrompts] = await Promise.all([
    db.prompt.count({
      where: {
        slug: null,
        deletedAt: null,
      },
    }),
    db.prompt.count({
      where: {
        deletedAt: null,
      },
    }),
  ]);

  // Fetch data for tables (users are fetched client-side with pagination)
  const [categories, tags, webhooks, reports] = await Promise.all([
    db.category.findMany({
      orderBy: [{ parentId: "asc" }, { order: "asc" }],
      include: {
        _count: {
          select: {
            prompts: true,
            children: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    db.tag.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            prompts: true,
          },
        },
      },
    }),
    db.webhookConfig.findMany({
      orderBy: { createdAt: "desc" },
    }),
    db.promptReport.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        prompt: {
          select: {
            id: true,
            slug: true,
            title: true,
            isUnlisted: true,
            deletedAt: true,
          },
        },
        reporter: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.users")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.prompts")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promptCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.categories")}</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.tags")}</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tagCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* 管理工具：模板审核队列 / 邀请码（ANS P1/P0） */}
      <div className="mb-4 flex flex-wrap gap-2">
        {can("PROMPTS_MANAGE") && (
          <Link
            href="/admin/templates"
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" /> 模板审核队列
          </Link>
        )}
        {can("INVITES_MANAGE") && (
          <Link
            href="/admin/invites"
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <KeyRound className="h-4 w-4 text-muted-foreground" /> 邀请码管理
          </Link>
        )}
      </div>

      {/* Management Tabs */}
      <AdminTabs
        visibleTabs={visibleTabs}
        translations={{
          users: t("tabs.users"),
          categories: t("tabs.categories"),
          tags: t("tabs.tags"),
          webhooks: t("tabs.webhooks"),
          prompts: t("tabs.prompts"),
          skills: t("tabs.skills"),
          reports: t("tabs.reports"),
          governance: t("tabs.governance"),
        }}
        pendingReportsCount={reports.filter(r => r.status === "PENDING").length}
        children={{
          users: <UsersTable />,
          categories: <CategoriesTable categories={categories} />,
          tags: <TagsTable tags={tags} />,
          webhooks: <WebhooksTable webhooks={webhooks} />,
          prompts: (
            <PromptsManagement 
              aiSearchEnabled={aiSearchEnabled} 
              promptsWithoutEmbeddings={promptsWithoutEmbeddings}
              totalPublicPrompts={totalPublicPrompts}
              promptsWithoutSlugs={promptsWithoutSlugs}
              totalPrompts={totalPrompts}
            />
          ),
          reports: <ReportsTable reports={reports} />,
          skills: <SkillsManagement />,
          governance: <GovernanceManagement />,
        }}
      />
    </div>
  );
}
