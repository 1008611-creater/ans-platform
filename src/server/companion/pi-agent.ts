import { db } from "@/lib/db";
import type { AgentLink } from "@/contracts/companion-agent";
import { claimArcadeReward } from "@/server/compute-benefits/arcade";
import { listMarketListings } from "@/server/marketplace/listings";
import { marketProductPath } from "@/domain/marketplace/product-route";

export interface PiActionResult {
  ok: boolean;
  toolUsed: "claim_daily_benefit" | "play_claw_arcade" | "search_market" | "scaffold_project_draft";
  replyZh: string;
  replyEn: string;
  pointsDelta?: number;
  balancePoints?: number | null;
  data?: unknown;
  links: AgentLink[];
}

export async function claimDailyBenefitViaPi(actor: string): Promise<PiActionResult> {
  try {
    const res = await claimArcadeReward(actor, { kind: "quest", questId: "daily_checkin" });
    return {
      ok: true,
      toolUsed: "claim_daily_benefit",
      replyZh: res.alreadyClaimed
        ? `📅 今日算力签到已经打过卡啦！当前账户可用算力余额为 **${res.balancePoints.toFixed(1)} 积分**（剩余抓娃娃币 **${res.remainingTokens} 枚**）。`
        : `🎉 **Pi Agent 已帮你完成今日算力签到！** 到账 **+${res.pointsGranted} 积分** + **1 枚抓娃娃币**！当前账户余额：**${res.balancePoints.toFixed(1)} 积分**（抓娃娃币 **${res.remainingTokens} 枚**）。`,
      replyEn: res.alreadyClaimed
        ? `📅 Today's check-in is already claimed! Current balance: **${res.balancePoints.toFixed(1)} pts** (**${res.remainingTokens}** claw tokens).`
        : `🎉 **Pi Agent completed your daily check-in!** Granted **+${res.pointsGranted} pts** + **1 claw token**! Current balance: **${res.balancePoints.toFixed(1)} pts**.`,
      pointsDelta: res.pointsGranted,
      balancePoints: res.balancePoints,
      data: res,
      links: [
        {
          href: "/workspace/benefits",
          title: "查看算力福利与抓娃娃机",
          detail: `当前余额 ${res.balancePoints.toFixed(1)} 积分 · 抓娃娃币 ${res.remainingTokens} 枚`,
          icon: "credits",
        },
        {
          href: "/market",
          title: "去 ANS 市场花积分",
          detail: "用积分购买/运行 AI 工作流与农大科研工具",
          icon: "discover",
        },
      ],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CLAIM_FAILED";
    return {
      ok: false,
      toolUsed: "claim_daily_benefit",
      replyZh: `⚠️ 签到执行遇到问题（${msg}），请前往算力福利页查看详情。`,
      replyEn: `⚠️ Check-in failed (${msg}). Please visit the Compute Benefits page.`,
      links: [{ href: "/workspace/benefits", title: "前往算力福利中心", detail: "手动查看签到与任务状态", icon: "credits" }],
    };
  }
}

export async function playClawArcadeViaPi(actor: string): Promise<PiActionResult> {
  try {
    let drawRes;
    let spentForToken = 0;
    try {
      drawRes = await claimArcadeReward(actor, { kind: "draw", machine: "claw" });
    } catch (firstErr) {
      const code = (firstErr as { code?: string })?.code;
      if (code === "NO_ARCADE_TOKENS") {
        await claimArcadeReward(actor, { kind: "buy_tokens", count: 1 });
        spentForToken = 10;
        drawRes = await claimArcadeReward(actor, { kind: "draw", machine: "claw" });
      } else {
        throw firstErr;
      }
    }

    const netPoints = drawRes.pointsGranted - spentForToken;
    const tokenNoteZh = spentForToken > 0 ? `（已自动花 10 积分兑 1 币投币）` : `（消耗 1 枚免费抓娃娃币）`;
    const tokenNoteEn = spentForToken > 0 ? `(auto-exchanged 10 pts for 1 token)` : `(used 1 free token)`;

    return {
      ok: true,
      toolUsed: "play_claw_arcade",
      replyZh: `🕹️ **Pi Agent 帮你下爪抓娃娃成功！** ${tokenNoteZh}\n抓中 **【${drawRes.tier ?? "R"} · ${drawRes.labelZh ?? "算力盲盒"}】**，获得 **+${drawRes.pointsGranted} 积分**！当前账户可用余额：**${drawRes.balancePoints.toFixed(1)} 积分**（剩余抓娃娃币 **${drawRes.remainingTokens} 枚**）。`,
      replyEn: `🕹️ **Pi Agent played the 3D Claw Machine!** ${tokenNoteEn}\nCaught **[${drawRes.tier ?? "R"} · ${drawRes.labelZh ?? "Compute Pod"}]** for **+${drawRes.pointsGranted} pts**! Balance: **${drawRes.balancePoints.toFixed(1)} pts**.`,
      pointsDelta: netPoints,
      balancePoints: drawRes.balancePoints,
      data: { ...drawRes, spentForToken },
      links: [
        {
          href: "/market",
          title: "去市场把积分花掉 (/market)",
          detail: "解锁农学论文精修、方差分析、AI 短剧与简历建站工具",
          icon: "discover",
        },
        {
          href: "/workspace/benefits",
          title: "打开 3D 抓娃娃机主舱",
          detail: `剩余 ${drawRes.remainingTokens} 枚抓娃娃币 · 0.1% 抽 1000分锦鲤`,
          icon: "credits",
        },
      ],
    };
  } catch (err) {
    const code = (err as { code?: string })?.code || (err instanceof Error ? err.message : "ARCADE_ERROR");
    const isLowPoints = code === "INSUFFICIENT_QUOTA";
    return {
      ok: false,
      toolUsed: "play_claw_arcade",
      replyZh: isLowPoints
        ? `⚠️ 免费抓娃娃币已用完，且账户积分不足 10 积分，无法兑币下爪。可以先让我帮你「代签到 (+5分)」或去福利页完成破冰问卷 (+50分)！`
        : `⚠️ 抓娃娃执行暂不可用（${code}），请前往算力游乐场操作。`,
      replyEn: isLowPoints
        ? `⚠️ No free tokens left and balance is under 10 pts. Claim daily check-in (+5 pts) or onboarding (+50 pts) first!`
        : `⚠️ Claw machine unavailable (${code}).`,
      links: [{ href: "/workspace/benefits", title: "去领免费算力与抓娃娃币", detail: "90% 用户可领 100~150 积分", icon: "credits" }],
    };
  }
}

export async function searchMarketViaPi(query: string, viewerId?: string): Promise<PiActionResult> {
  const offers = await listMarketListings(undefined, viewerId);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? offers.filter(({ listing }) =>
        [listing.title, listing.summary, listing.category, listing.subcategory, ...listing.deliverables]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : offers;
  const top = (filtered.length > 0 ? filtered : offers).slice(0, 4);

  const items = top.map((offer) => {
    const tiers = offer.listing.pricingTiers ?? [];
    const minMinor = tiers.length ? Math.min(...tiers.map((t) => t.priceMinor)) : offer.listing.priceMinor;
    const pricePoints = offer.listing.execution ? 2 : Math.round(minMinor / 100);
    return {
      slug: offer.slug,
      title: offer.listing.title,
      summary: offer.listing.summary,
      category: offer.listing.category,
      pricePoints,
      runnable: Boolean(offer.listing.execution),
      href: marketProductPath(offer),
    };
  });

  const summaryListZh = items
    .map((it, idx) => `${idx + 1}. **${it.title}**（${it.runnable ? "按运行计费 ~2积分" : `${it.pricePoints || 10} 积分`}）— ${it.summary.slice(0, 48)}…`)
    .join("\n");
  const summaryListEn = items
    .map((it, idx) => `${idx + 1}. **${it.title}** (${it.runnable ? "~2 pts/run" : `${it.pricePoints || 10} pts`})`)
    .join("\n");

  return {
    ok: true,
    toolUsed: "search_market",
    replyZh: items.length
      ? `🛒 **Pi Agent 已为你从 ANS 市场 (\`/market\`) 挑出 ${items.length} 款高性价比工具/工作流：**\n${summaryListZh}\n\n点击下方卡片即可直接进入对应商品页用积分兑换或一键运行！`
      : `🛒 当前市场暂无完全匹配「${query}」的商品，点击下方按钮可浏览市场全部工具。`,
    replyEn: items.length
      ? `🛒 **Pi Agent found ${items.length} tools on ANS Market (\`/market\`):**\n${summaryListEn}`
      : `🛒 No exact match for "${query}" on ANS Market. Browse all tools below.`,
    data: { items, totalPublished: offers.length },
    links: [
      ...items.slice(0, 3).map((it) => ({
        href: it.href,
        title: `${it.title} (${it.runnable ? "可直接运行" : `${it.pricePoints || 10}积分`})`,
        detail: it.summary.slice(0, 72),
        icon: "discover" as const,
      })),
      {
        href: "/market",
        title: "进入 ANS 市场全部货架 (/market)",
        detail: `共 ${offers.length} 款农大科研、求职简历与 AI 创作工具`,
        icon: "credits" as const,
      },
    ],
  };
}

export async function scaffoldProjectDraftViaPi(actor: string, rawTopic: string): Promise<PiActionResult> {
  const topic = rawTopic.trim().slice(0, 80) || "中国农大智慧农业与多模态 AI 创新项目";
  const markdown = [
    `# ${topic} — 项目立项书与技术架构草案`,
    ``,
    `> 由 **ANS 小恐龙 Pi Agent** 自动生成并写入你的个人项目库，可直接用于农客松参赛申报、README 展示或团队协作。`,
    ``,
    `## 1. 核心痛点与场景定义`,
    `- **目标场景**：围绕「${topic}」解决传统人工经验效率低、数据孤岛或响应滞后的实际问题。`,
    `- **核心用户**：高校科研团队 / 现代农业示范园区 / 数字化创客团队。`,
    ``,
    `## 2. AI 与算力技术路线`,
    `1. **感知与数据层**：多源数据采集（图像/传感器时序/文献语料）与结构化清洗。`,
    `2. **模型与 Agent 推理层**：基于 ANS 算力网关调用 \`DeepSeek-V4.1-Flash\` / \`GPT-6.1-Sol\`，结合领域知识库 RAG 与 Function Calling 工具链。`,
    `3. **交互与交付层**：提供可视化 Web 看板、一键复现工作流与结构化报告导出。`,
    ``,
    `## 3. 最小可行原型 (MVP) 三步走计划`,
    `- **Step 1（第 1~2 天）**：跑通核心 Prompt 与单点数据推理闭环，在 \`/workspace/models\` 验证准确率。`,
    `- **Step 2（第 3~4 天）**：封装为可复用的 ANS 工作流并上架 \`/market\` 市场赚取积分分成。`,
    `- **Step 3（第 5 天）**：完善路演演示页面与评测指标，提交至农客松作品墙拉票。`,
  ].join("\n");

  const created = await db.project.create({
    data: {
      ownerId: actor,
      title: topic,
      goal: "CONTEST",
      status: "ACTIVE",
      visibility: "PRIVATE",
      facts: {
        create: [
          {
            key: "problem",
            value: `针对「${topic}」构建可落地的 AI + 场景智能化解决方案。`,
            confirmation: "CONFIRMED",
            updatedById: actor,
          },
          {
            key: "audience",
            value: "农客松评委、科研实验室与行业应用方",
            confirmation: "CONFIRMED",
            updatedById: actor,
          },
        ],
      },
      artifacts: {
        create: {
          workflowId: "readme-draft",
          kind: "README_DRAFT",
          title: `${topic} · README 与立项架构书`,
          visibility: "PRIVATE",
          currentVersion: 1,
          createdById: actor,
          versions: {
            create: {
              version: 1,
              contentJson: { title: topic, summary: `Pi Agent 自动生成的「${topic}」立项草案`, markdown },
              contentMarkdown: markdown,
              factSnapshotHash: "pi-agent-scaffold-v1",
              createdById: actor,
            },
          },
        },
      },
    },
    select: { id: true, title: true },
  });

  return {
    ok: true,
    toolUsed: "scaffold_project_draft",
    replyZh: `📝 **Pi Agent 已在你的工作台创建真实项目《${created.title}》！**\n同时已自动写入首版 **《README 与立项架构书》** 及核心项目事实，点击下方按钮即可直接打开编辑或提交参赛！`,
    replyEn: `📝 **Pi Agent created project "${created.title}" in your workspace!**\nIncludes a complete v1 README & architecture blueprint. Click below to open and edit!`,
    data: { projectId: created.id, title: created.title, href: `/projects/${created.id}` },
    links: [
      {
        href: `/projects/${created.id}`,
        title: `打开新项目：《${created.title.slice(0, 28)}》`,
        detail: "已包含首版 README 架构书与项目事实，可直接继续打磨",
        icon: "project",
      },
      {
        href: "/market",
        title: "去市场搭配现成 AI 工具 (/market)",
        detail: "用积分选购论文润色、数据分析或路演分镜工具加速开发",
        icon: "discover",
      },
    ],
  };
}

export async function executePiAgentAction(
  actor: string,
  input: { intent?: "checkin" | "claw" | "market" | "scaffold" | "auto"; prompt?: string },
): Promise<PiActionResult> {
  const rawPrompt = (input.prompt ?? "").trim();
  const intent = input.intent ?? "auto";

  if (intent === "checkin") return claimDailyBenefitViaPi(actor);
  if (intent === "claw") return playClawArcadeViaPi(actor);
  if (intent === "market") return searchMarketViaPi(rawPrompt, actor);
  if (intent === "scaffold") return scaffoldProjectDraftViaPi(actor, rawPrompt);

  // Auto-route natural language command via Pi Agent intent router
  const lower = rawPrompt.toLowerCase();
  if (/签到|打卡|每日|领积分|checkin|check-in|daily/.test(lower)) {
    return claimDailyBenefitViaPi(actor);
  }
  if (/抓娃娃|娃娃机|转盘|抽奖|锦鲤|兑币|claw|arcade|gacha|spin/.test(lower)) {
    return playClawArcadeViaPi(actor);
  }
  if (/新建|创建|立项|建个项目|写个项目|保存项目|scaffold|create project|new project/.test(lower)) {
    const cleanedTopic = rawPrompt
      .replace(/^(帮我|请|麻烦|小恐龙|pi\s*agent)?(新建|创建|立项|建个项目|写个项目|生成一个项目)[:：\s]*/i, "")
      .trim();
    return scaffoldProjectDraftViaPi(actor, cleanedTopic || rawPrompt);
  }
  const marketQuery = rawPrompt
    .replace(/^(帮我|请|去市场|市场里|找一下|搜一下|推荐|挑个|买个|花积分)[:：\s]*/i, "")
    .trim();
  return searchMarketViaPi(marketQuery, actor);
}
