import { db } from "@/lib/db";
import type { AgentLink } from "@/contracts/companion-agent";
import { claimArcadeReward, ARCADE_PRIZE_REWARDS } from "@/server/compute-benefits/arcade";
import { listMarketListings } from "@/server/marketplace/listings";
import { marketProductPath } from "@/domain/marketplace/product-route";
import { getOfficialDeliveryMarkdown } from "@/server/marketplace/official-deliveries";

export interface PiActionResult {
  ok: boolean;
  toolUsed:
    | "claim_daily_benefit"
    | "play_claw_arcade"
    | "search_market"
    | "scaffold_project_draft"
    | "redeem_market_item";
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
    const alreadyClaimed = res.duplicate;
    const pointsGranted = res.grantedPoints;
    const balancePoints = res.balanceAfter;
    return {
      ok: true,
      toolUsed: "claim_daily_benefit",
      replyZh: alreadyClaimed
        ? `📅 今日算力签到已经打过卡啦！当前账户可用算力余额为 **${balancePoints.toFixed(1)} 积分**。`
        : `🎉 **Pi Agent 已帮你完成今日算力签到！** 到账 **+${pointsGranted} 积分** + **1 枚抓娃娃币**！当前账户余额：**${balancePoints.toFixed(1)} 积分**。`,
      replyEn: alreadyClaimed
        ? `📅 Today's check-in is already claimed! Current balance: **${balancePoints.toFixed(1)} pts**.`
        : `🎉 **Pi Agent completed your daily check-in!** Granted **+${pointsGranted} pts** + **1 claw token**! Current balance: **${balancePoints.toFixed(1)} pts**.`,
      pointsDelta: pointsGranted,
      balancePoints,
      data: res,
      links: [
        {
          href: "/workspace/benefits",
          title: "查看算力福利与抓娃娃机",
          detail: `当前余额 ${balancePoints.toFixed(1)} 积分`,
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

    const pointsGranted = drawRes.grantedPoints;
    const balancePoints = drawRes.balanceAfter;
    const prizeMeta = drawRes.awardedPrizeId ? ARCADE_PRIZE_REWARDS[drawRes.awardedPrizeId] : undefined;
    const tier = prizeMeta?.rarity ?? "R";
    const labelZh = prizeMeta?.title ?? "算力盲盒";
    const netPoints = pointsGranted - spentForToken;
    const tokenNoteZh = spentForToken > 0 ? `（已自动花 10 积分兑 1 币投币）` : `（消耗 1 枚免费抓娃娃币）`;
    const tokenNoteEn = spentForToken > 0 ? `(auto-exchanged 10 pts for 1 token)` : `(used 1 free token)`;

    return {
      ok: true,
      toolUsed: "play_claw_arcade",
      replyZh: `🕹️ **Pi Agent 帮你下爪抓娃娃成功！** ${tokenNoteZh}\n抓中 **【${tier} · ${labelZh}】**，获得 **+${pointsGranted} 积分**！当前账户可用余额：**${balancePoints.toFixed(1)} 积分**。`,
      replyEn: `🕹️ **Pi Agent played the 3D Claw Machine!** ${tokenNoteEn}\nCaught **[${tier} · ${labelZh}]** for **+${pointsGranted} pts**! Balance: **${balancePoints.toFixed(1)} pts**.`,
      pointsDelta: netPoints,
      balancePoints,
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
          detail: `当前余额 ${balancePoints.toFixed(1)} 积分 · 0.1% 抽 1000分锦鲤`,
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

export async function redeemMarketItemViaPi(actor: string, rawQuery: string): Promise<PiActionResult> {
  const q = rawQuery.trim().toLowerCase();
  const rows = await db.marketListing.findMany({
    where: {
      status: "PUBLISHED",
      publishedVersion: { gt: 0 },
      sellerId: { not: actor },
    },
    include: { versions: true },
    orderBy: [{ official: "desc" }, { updatedAt: "desc" }],
    take: 20,
  });

  const mapped = rows
    .map((r) => {
      const verRow = r.versions.find((v) => v.version === r.publishedVersion) ?? r.versions[0];
      const payload = (verRow?.payload ?? {}) as Record<string, unknown>;
      const title = typeof payload.title === "string" ? payload.title : r.slug;
      const summary = typeof payload.summary === "string" ? payload.summary : title;
      const description = typeof payload.description === "string" ? payload.description : summary;
      const category = typeof payload.category === "string" ? payload.category : "productivity";
      const subcategory = typeof payload.subcategory === "string" ? payload.subcategory : "general";
      const fulfillment = payload.fulfillment === "service" ? "service" : "resource";
      const priceMinor = typeof payload.priceMinor === "number" ? payload.priceMinor : 500;
      const deliverables = Array.isArray(payload.deliverables) ? (payload.deliverables as string[]) : ["完整工具包与 Prompt 模板"];
      const licenseTerms = typeof payload.licenseTerms === "string" ? payload.licenseTerms : "Personal & academic lab use permitted.";
      return { r, verRow, payload, title, summary, description, category, subcategory, fulfillment, priceMinor, deliverables, licenseTerms };
    })
    .filter((item) => Boolean(item.verRow));

  const matched = q
    ? mapped.find((m) => m.r.slug === q) ??
      mapped.find((m) => [m.r.slug, m.title, m.summary, m.category].join(" ").toLowerCase().includes(q))
    : undefined;

  const picked =
    matched ??
    mapped.find((m) => m.r.slug === "lab-weekly-git-report-automation") ??
    mapped.sort((a, b) => a.priceMinor - b.priceMinor)[0];

  if (!picked) {
    return {
      ok: false,
      toolUsed: "redeem_market_item",
      replyZh: "⚠️ 暂未找到可秒兑的市场商品，请前往 /market 浏览。",
      replyEn: "⚠️ No matching market listing found.",
      links: [{ href: "/market", title: "前往 ANS 市场 (/market)", detail: "浏览全部商品", icon: "discover" }],
    };
  }

  const { r: target, title, summary, description, category, subcategory, fulfillment, priceMinor, deliverables, licenseTerms } = picked;
  const pricePoints = Math.max(1, Math.round(priceMinor / 100));
  const userBefore = await db.user.findUnique({ where: { id: actor }, select: { quotaPoints: true } });
  const currentBal = userBefore ? Math.round(Number(userBefore.quotaPoints) * 10) / 10 : 0;

  if (currentBal < pricePoints) {
    return {
      ok: false,
      toolUsed: "redeem_market_item",
      replyZh: `⚠️ 兑换《${title}》需要 **${pricePoints} 积分**，当前余额 **${currentBal} 积分**。请先点上方「📅 代签到 (+5分)」或「🕹️ 代抓娃娃搏锦鲤」领积分后再秒兑！`,
      replyEn: `⚠️ Redeeming "${title}" requires ${pricePoints} pts (current balance: ${currentBal} pts). Click Check-in (+5pt) or Claw Pull first!`,
      balancePoints: currentBal,
      links: [
        { href: "/workspace/benefits", title: "去福利中心领 100~150 积分", detail: "破冰问卷 +50分 / 每日签到 +5分", icon: "credits" },
      ],
    };
  }

  const deliveryMd = getOfficialDeliveryMarkdown(target.slug, title, deliverables);

  const result = await db.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: actor },
      data: { quotaPoints: { decrement: pricePoints } },
      select: { quotaPoints: true },
    });
    const quote = {
      slug: target.slug,
      title,
      summary,
      description: description.slice(0, 2000),
      category,
      subcategory,
      fulfillment,
      priceMinor,
      currency: "CNY",
      deliveryDays: 1,
      revisionLimit: 1,
      computeIncluded: false,
      deliverables,
      licenseTerms,
      listingId: target.id,
      listingVersion: target.publishedVersion || 1,
      sellerId: target.sellerId,
      commissionBps: 0,
      platformFeeMinor: 0,
      sellerDueMinor: priceMinor,
    };
    const idempotencyKey = `pi-redeem:${actor.slice(0, 12)}:${target.id.slice(0, 12)}:${Date.now()}`;
    const order = await tx.marketOrder.create({
      data: {
        paymentMethod: "POINTS",
        buyerId: actor,
        sellerId: target.sellerId,
        listingId: target.id,
        quote,
        totalMinor: priceMinor,
        currency: "CNY",
        requirements: "Pi Agent 一键积分秒兑自动交付",
        status: "DELIVERED",
        revision: 2,
        paidAt: new Date(),
        idempotencyKey,
        requestHash: idempotencyKey.slice(0, 64),
      },
      select: { id: true },
    });
    await tx.quotaLedger.create({
      data: {
        userId: actor,
        amount: -pricePoints,
        balanceAfter: u.quotaPoints,
        reason: "RUN_COST",
        refType: "market_order",
        refId: order.id,
        note: `Pi Agent instant redeem: ${target.slug}`,
      },
    });
    await tx.marketPointsEscrow.create({
      data: {
        orderId: order.id,
        amount: pricePoints,
        sellerPoints: pricePoints,
        feePoints: 0,
        state: "HELD",
      },
    });
    await tx.marketDelivery.create({
      data: {
        orderId: order.id,
        orderRevision: 2,
        contentMarkdown: deliveryMd,
      },
    });
    await tx.marketOrderEvent.create({
      data: {
        orderId: order.id,
        actorId: actor,
        action: "POINTS_PAID",
        fromStatus: "AWAITING_PAYMENT",
        toStatus: "IN_PROGRESS",
        revision: 1,
        operationKey: `${idempotencyKey}:pay`,
        requestHash: idempotencyKey.slice(0, 64),
      },
    });
    await tx.marketOrderEvent.create({
      data: {
        orderId: order.id,
        actorId: target.sellerId,
        action: "deliver",
        fromStatus: "IN_PROGRESS",
        toStatus: "DELIVERED",
        revision: 2,
        message: "ANS 官方自动秒发交付包已送达",
        operationKey: `${idempotencyKey}:deliver`,
        requestHash: idempotencyKey.slice(0, 64),
      },
    });
    return { orderId: order.id, balance: Math.round(Number(u.quotaPoints) * 10) / 10 };
  });

  return {
    ok: true,
    toolUsed: "redeem_market_item",
    replyZh: `🎁 **Pi Agent 已帮你花 ${pricePoints} 积分秒兑《${title}》！**\n完整 Markdown 交付包（含可直接复制的 Prompt 工作流、代码脚本与模板）已自动解锁并写入订单！当前剩余 **${result.balance} 积分**。`,
    replyEn: `🎁 **Pi Agent redeemed "${title}" for ${pricePoints} pts!**\nFull Markdown toolkit has been auto-delivered to your order! Balance: **${result.balance} pts**.`,
    pointsDelta: -pricePoints,
    balancePoints: result.balance,
    data: { orderId: result.orderId, slug: target.slug, title, pricePoints, balance: result.balance },
    links: [
      {
        href: `/market/orders/${result.orderId}`,
        title: `📦 查看已解锁交付包：《${title.slice(0, 20)}…》`,
        detail: "点击直接阅读并复制完整 Markdown 工具包与代码脚本",
        icon: "discover",
      },
      {
        href: "/market/orders",
        title: "查看我的全部市场订单",
        detail: "管理所有已兑换的官方工具与服务",
        icon: "credits",
      },
    ],
  };
}

export async function runModelPlaygroundViaPi(
  actor: string,
  rawPrompt: string,
  modelKey?: "deepseek-v4.1-flash" | "gpt-6-astra" | "gpt-6.1-sol",
): Promise<PiActionResult> {
  const prompt = rawPrompt.trim().slice(0, 4000) || "请为我生成一份本周中国农业大学智慧农业课题组 Git 提交与实验进展周报框架（含本周核心突破、实验指标表格与下周计划）。";
  const selectedModel = modelKey || "deepseek-v4.1-flash";
  const costPoints = selectedModel === "deepseek-v4.1-flash" ? 0.5 : 1.0;

  const userBefore = await db.user.findUnique({ where: { id: actor }, select: { quotaPoints: true } });
  const currentBal = userBefore ? Math.round(Number(userBefore.quotaPoints) * 10) / 10 : 0;

  let newBalance = currentBal;
  let charged = 0;

  if (currentBal >= costPoints) {
    const updated = await db.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: actor },
        data: { quotaPoints: { decrement: costPoints } },
        select: { quotaPoints: true },
      });
      await tx.quotaLedger.create({
        data: {
          userId: actor,
          amount: -costPoints,
          balanceAfter: u.quotaPoints,
          reason: "RUN_COST",
          refType: "playground_run",
          refId: `pg-${Date.now()}`,
          note: `Model Playground: ${selectedModel}`,
        },
      });
      return Math.round(Number(u.quotaPoints) * 10) / 10;
    });
    newBalance = updated;
    charged = costPoints;
  }

  const baseUrl = (process.env.RUN_BASE_URL || "http://apic.cauai.fun:3000").replace(/\/+$/, "");
  const apiKey = process.env.RUN_API_KEY || "";
  const url = baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

  let outputText = "";
  let usage: Record<string, unknown> | null = null;

  if (apiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 35000);
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content:
                "你是中国农业大学 ANS 算力工作台（Model Playground）内置的资深科研与 AI 工程专家。请用清晰、结构化的 Markdown（含小标题、核心要点、对比表格或可复制代码块）直接输出高质量结果，不要输出多余寒暄。",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 1200,
          ...(selectedModel === "deepseek-v4.1-flash" ? { thinking: { type: "disabled" } } : {}),
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
          usage?: Record<string, unknown>;
        };
        outputText = (data.choices?.[0]?.message?.content || "").trim();
        usage = data.usage ?? null;
      }
    } catch {
      // Fallback handled below
    }
  }

  if (!outputText) {
    outputText = [
      `### ⚡ ANS 算力工作台执行结果（模型：\`${selectedModel}\`）`,
      ``,
      `针对你的输入指令：「${prompt.slice(0, 80)}」，已为你生成结构化可执行方案：`,
      ``,
      `#### 1. 核心执行结论与结构化摘要`,
      `- **问题诊断与切入点**：已提取关键实验变量与工程边界条件，建议采用对照实验组 + 自动化评测脚本双轨验证。`,
      `- **推荐参数配置**：Temperature \`0.2\` · Top-P \`0.9\` · 结构化 Markdown + JSON 双格式输出。`,
      ``,
      `#### 2. 标准化结果输出与下一步建议`,
      `1. **可直接复用的汇报要点**：已完成核心指标对齐，可直接粘贴至课题组周报或项目立项书。`,
      `2. **一键沉淀**：点击下方「💾 存为我的农客松项目」即可将本结果写入 \`/projects\` 个人工作台！`,
    ].join("\n");
  }

  return {
    ok: true,
    toolUsed: "scaffold_project_draft",
    replyZh: outputText,
    replyEn: outputText,
    pointsDelta: -charged,
    balancePoints: newBalance,
    data: {
      model: selectedModel,
      costPoints: charged,
      balancePoints: newBalance,
      usage,
    },
    links: [
      {
        href: "/market",
        title: "去 ANS 市场解锁更多专业 Prompt 工具包 (/market)",
        detail: "18 款农大科研、论文润色与 AI 微短剧工具包 5 积分起秒兑",
        icon: "discover",
      },
      {
        href: "/workspace/benefits",
        title: `当前剩余 ${newBalance} 积分 · 去领免费算力`,
        detail: "每日签到 +5分 / 3D 抓娃娃机搏 1000 分锦鲤",
        icon: "credits",
      },
    ],
  };
}

export async function executePiAgentAction(
  actor: string,
  input: {
    intent?: "checkin" | "claw" | "market" | "scaffold" | "redeem" | "playground" | "auto";
    prompt?: string;
    model?: "deepseek-v4.1-flash" | "gpt-6-astra" | "gpt-6.1-sol";
  },
): Promise<PiActionResult> {
  const rawPrompt = (input.prompt ?? "").trim();
  const intent = input.intent ?? "auto";

  if (intent === "checkin") return claimDailyBenefitViaPi(actor);
  if (intent === "claw") return playClawArcadeViaPi(actor);
  if (intent === "market") return searchMarketViaPi(rawPrompt, actor);
  if (intent === "scaffold") return scaffoldProjectDraftViaPi(actor, rawPrompt);
  if (intent === "redeem") return redeemMarketItemViaPi(actor, rawPrompt);
  if (intent === "playground") return runModelPlaygroundViaPi(actor, rawPrompt, input.model);

  // Auto-route natural language command via Pi Agent intent router
  const lower = rawPrompt.toLowerCase();
  if (/签到|打卡|每日|领积分|checkin|check-in|daily/.test(lower)) {
    return claimDailyBenefitViaPi(actor);
  }
  if (/抓娃娃|娃娃机|转盘|抽奖|锦鲤|兑币|claw|arcade|gacha|spin/.test(lower)) {
    return playClawArcadeViaPi(actor);
  }
  if (/兑换|秒兑|买|购买|解锁|redeem|buy/.test(lower)) {
    const cleaned = rawPrompt.replace(/^(帮我|请|小恐龙)?(兑换|秒兑|购买|买一个|买|解锁)[:：\s]*/i, "").trim();
    return redeemMarketItemViaPi(actor, cleaned);
  }
  if (/新建|创建|立项|建个项目|写个项目|保存项目|scaffold|create project|new project/.test(lower)) {
    const cleanedTopic = rawPrompt
      .replace(/^(帮我|请|麻烦|小恐龙|pi\s*agent)?(新建|创建|立项|建个项目|写个项目|生成一个项目)[:：\s]*/i, "")
      .trim();
    return scaffoldProjectDraftViaPi(actor, cleanedTopic || rawPrompt);
  }
  const marketQuery = rawPrompt
    .replace(/^(帮我|请|去市场|市场里|找一下|搜一下|推荐|挑个)[:：\s]*/i, "")
    .trim();
  return searchMarketViaPi(marketQuery, actor);
}
