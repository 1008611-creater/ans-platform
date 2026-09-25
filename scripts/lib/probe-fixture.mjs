/**
 * 浏览器类门禁共用的固定规模探针数据。
 *
 * 性能门禁需要真实数据量才有意义（空表的查询永远是快的），可访问性门禁
 * 同样需要页面里真的渲染出内容——列表为空时，卡片上的缺陷一个都扫不到，
 * 门禁会「全绿但什么都没测到」。两个脚本因此共用这一份探针数据：
 *
 *   60 条提示词（slug 前缀 perf-probe-*）
 *   12 个模板
 *   8 条工作流（含一个 3 节点 2 边的合法 DAG 版本）
 *
 * 规模刻意压在「能触发真实查询与真实渲染路径」而不是「压垮本机」的位置：
 * 60 条足够撑起 3 页分页和一个非平凡的模糊搜索，又不会让每轮门禁跑成压测。
 *
 * 每轮开头先删掉上一轮的探针内容，保证每次量的、每次扫的都是同一批数据。
 * 写入只在「本机地址 + 库名含 smoke/test/verify 等关键字」时进行，生产库和
 * 日常开发库一律拒绝（复用 preview-server 的 seedableDatabase 判断）。
 */
import { SEED_EMAIL, seedableDatabase } from "./preview-server.mjs";

/** 探针数据的统一前缀：既用来识别，也用来在每轮开头清理上一轮。 */
export const FIXTURE = "perf-probe";
export const FIXTURE_PROMPTS = 60;
export const FIXTURE_TEMPLATES = 12;
export const FIXTURE_WORKFLOWS = 8;

/** 探针提示词的标题模板，可访问性门禁据此断言「卡片真的渲染出来了」。 */
export function fixturePromptTitle(index) {
  return `性能探针提示词 ${index}`;
}

/**
 * 写入探针数据。返回 `{ seeded, reason }`；`favoriteTargetId` 供写入性能目标复用。
 */
export async function seedProbeFixture(databaseUrl) {
  const guard = seedableDatabase(databaseUrl);
  if (!guard.ok) return { seeded: false, reason: guard.reason };

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const author = await prisma.user.findUnique({
      where: { email: SEED_EMAIL },
      select: { id: true },
    });
    if (!author) return { seeded: false, reason: "缺少冒烟账号，无法建立探针数据" };

    await prisma.prompt.deleteMany({
      where: { authorId: author.id, slug: { startsWith: FIXTURE } },
    });

    const base = Date.now();
    await prisma.prompt.createMany({
      data: Array.from({ length: FIXTURE_PROMPTS }, (_, index) => ({
        title: fixturePromptTitle(index + 1),
        slug: `${FIXTURE}-prompt-${index + 1}`,
        description: `用于性能门禁的第 ${index + 1} 条探针数据，可安全删除。`,
        content: `请用三句话说明第 ${index + 1} 个探针主题，并给出一个校园场景下的例子。`,
        type: "TEXT",
        isPrivate: false,
        authorId: author.id,
        createdAt: new Date(base - index * 60_000),
      })),
    });

    for (let index = 0; index < FIXTURE_TEMPLATES; index += 1) {
      const slug = `${FIXTURE}-template-${index + 1}`;
      const data = {
        title: `性能探针模板 ${index + 1}`,
        summary: `用于性能门禁的第 ${index + 1} 个探针模板。`,
        formSchema: [{ key: "topic", label: "主题", type: "text", required: true }],
        promptBody: `请围绕 {{topic}} 输出一份第 ${index + 1} 种结构的说明。`,
        outputType: "TEXT",
        estimatedCost: 1,
        status: "PUBLISHED",
        authorId: author.id,
      };
      await prisma.template.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    }

    for (let index = 0; index < FIXTURE_WORKFLOWS; index += 1) {
      const slug = `${FIXTURE}-workflow-${index + 1}`;
      const workflow = await prisma.workflow.upsert({
        where: { slug },
        update: { status: "PUBLISHED", publishedVersion: 1 },
        create: {
          slug,
          title: `性能探针工作流 ${index + 1}`,
          summary: `用于性能门禁的第 ${index + 1} 条探针工作流。`,
          authorId: author.id,
          status: "PUBLISHED",
          publishedVersion: 1,
          estimatedCost: 1,
        },
      });
      await prisma.workflowVersion.upsert({
        where: { workflowId_version: { workflowId: workflow.id, version: 1 } },
        update: {},
        create: {
          workflowId: workflow.id,
          version: 1,
          createdById: author.id,
          definition: {
            version: 1,
            maxNodes: 20,
            nodes: [
              { id: "start", type: "prompt", label: "整理输入", config: {}, timeoutMs: 30_000, maxRetries: 1 },
              { id: "draft", type: "model", label: "生成草稿", config: {}, timeoutMs: 30_000, maxRetries: 1 },
              { id: "finish", type: "output", label: "输出结果", config: {}, timeoutMs: 30_000, maxRetries: 0 },
            ],
            edges: [
              { id: "e1", from: "start", to: "draft", mapping: {} },
              { id: "e2", from: "draft", to: "finish", mapping: {} },
            ],
          },
        },
      });
    }

    const favorite = await prisma.prompt.findFirst({
      where: { authorId: author.id, slug: `${FIXTURE}-prompt-1` },
      select: { id: true },
    });
    return { seeded: true, favoriteTargetId: favorite?.id ?? null };
  } finally {
    await prisma.$disconnect();
  }
}