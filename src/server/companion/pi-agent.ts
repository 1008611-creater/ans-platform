import { db } from "@/lib/db";
import type { AgentLink } from "@/contracts/companion-agent";
import { claimArcadeReward, getArcadeServerBalance, getArcadeTokenBalance, ARCADE_PRIZE_REWARDS } from "@/server/compute-benefits/arcade";
import { listMarketListings } from "@/server/marketplace/listings";
import { marketProductPath } from "@/domain/marketplace/product-route";
import { getOfficialDeliveryMarkdown } from "@/server/marketplace/official-deliveries";
import {
  calculateOfficialTokenPoints,
  estimateMinPreCallPoints,
  type UpstreamUsagePayload,
} from "@/server/integrations/chat-completions-gateway";

export interface PiActionResult {
  ok: boolean;
  /** 失败时的机器可读原因，例如 CONFIRM_REQUIRED（需要用户先确认扣费金额）。 */
  error?: string;
  toolUsed:
    | "claim_daily_benefit"
    | "play_claw_arcade"
    | "search_market"
    | "scaffold_project_draft"
    | "redeem_market_item"
    | "run_model_playground";
  replyZh: string;
  replyEn: string;
  trace?: string[];
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
      trace: [
        "[1/3] agent.intent_router · 识别每日签到指令 (claim_daily_benefit)",
        alreadyClaimed
          ? "[2/3] agent.quota_ledger · 校验今日签到状态（已打卡）"
          : `[2/3] agent.quota_ledger · 发放每日算力奖励 (+${pointsGranted} 积分 + 1 抓娃娃币)`,
        `[3/3] agent.sync_balance · 同步账户可用积分（${balancePoints.toFixed(1)} 积分）`,
      ],
      replyZh: alreadyClaimed
        ? `📅 今日算力签到已经打过卡啦！当前账户可用余额为 **${balancePoints.toFixed(1)} 积分**。`
        : `🎉 **Agent 已帮你完成今日算力签到！** 到账 **+${pointsGranted} 积分** + **1 枚抓娃娃币**！当前账户余额：**${balancePoints.toFixed(1)} 积分**。`,
      replyEn: alreadyClaimed
        ? `📅 Today's check-in is already claimed! Current balance: **${balancePoints.toFixed(1)} pts**.`
        : `🎉 **Agent completed your daily check-in!** Granted **+${pointsGranted} pts** + **1 claw token**! Current balance: **${balancePoints.toFixed(1)} pts**.`,
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
          title: "去 ANS 市场使用积分",
          detail: "兑换 AI 工作流与农大科研工具",
          icon: "discover",
        },
      ],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CLAIM_FAILED";
    return {
      ok: false,
      toolUsed: "claim_daily_benefit",
      trace: [`[1/1] agent.claim_daily_benefit · 执行异常 (${msg})`],
      replyZh: `⚠️ 签到执行遇到问题（${msg}），请前往算力福利页查看详情。`,
      replyEn: `⚠️ Check-in failed (${msg}). Please visit the Compute Benefits page.`,
      links: [{ href: "/workspace/benefits", title: "前往算力福利中心", detail: "手动查看签到与任务状态", icon: "credits" }],
    };
  }
}

export async function playClawArcadeViaPi(actor: string, confirmedTokenPoints?: number): Promise<PiActionResult> {
  try {
    // 免费币用完时，"花 10 积分兑 1 枚"必须先由用户确认；未确认一律不扣费（服务端强制，不依赖界面）。
    const tokenState = await getArcadeTokenBalance(actor);
    if (tokenState.tokens <= 0 && confirmedTokenPoints !== tokenState.nextTokenCostPoints) {
      const { balancePoints } = await getArcadeServerBalance(actor);
      return {
        ok: false,
        error: "CONFIRM_REQUIRED",
        toolUsed: "play_claw_arcade",
        trace: [`[1/1] agent.play_claw_arcade · 免费币已用完，报价 ${tokenState.nextTokenCostPoints} 积分（未扣费）`],
        replyZh: `💰 免费抓娃娃币用完了。继续抽需要花 **${tokenState.nextTokenCostPoints} 积分**兑换 1 枚（当前余额 **${balancePoints.toFixed(1)} 积分**）。点「确认」我才扣费——**现在还没有扣分**。`,
        replyEn: `💰 No free claw tokens left. Continuing costs **${tokenState.nextTokenCostPoints} pts** for 1 token (balance ${balancePoints.toFixed(1)} pts). Nothing is charged until you confirm.`,
        balancePoints,
        data: { requiresConfirmation: true, pricePoints: tokenState.nextTokenCostPoints, intent: "claw" },
        links: [{ href: "/workspace/benefits", title: "去领免费算力与抓娃娃币", detail: "每日签到 +5 分 · 破冰问卷 +50 分", icon: "credits" }],
      };
    }
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
      trace: [
        "[1/3] agent.intent_router · 识别 3D 抓娃娃机指令 (play_claw_arcade)",
        `[2/3] agent.arcade_engine · 执行下爪抓取 ${tokenNoteZh} -> 命中【${tier} · ${labelZh}】`,
        `[3/3] agent.quota_ledger · 结算奖励 +${pointsGranted} 积分（当前余额 ${balancePoints.toFixed(1)} 积分）`,
      ],
      replyZh: `🕹️ **Agent 帮你下爪抓娃娃成功！** ${tokenNoteZh}\n抓中 **【${tier} · ${labelZh}】**，获得 **+${pointsGranted} 积分**！当前账户可用余额：**${balancePoints.toFixed(1)} 积分**。`,
      replyEn: `🕹️ **Agent played the 3D Claw Machine!** ${tokenNoteEn}\nCaught **[${tier} · ${labelZh}]** for **+${pointsGranted} pts**! Balance: **${balancePoints.toFixed(1)} pts**.`,
      pointsDelta: netPoints,
      balancePoints,
      data: { ...drawRes, spentForToken },
      links: [
        {
          href: "/market",
          title: "去市场使用积分 (/market)",
          detail: "解锁农学论文精修、方差分析、AI 短剧与简历建站工具",
          icon: "discover",
        },
        {
          href: "/workspace/benefits",
          title: "打开 3D 抓娃娃机主舱",
          detail: `当前余额 ${balancePoints.toFixed(1)} 积分`,
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
      trace: [`[1/1] agent.play_claw_arcade · 执行中止 (${code})`],
      replyZh: isLowPoints
        ? `⚠️ 免费抓娃娃币已用完，且账户积分不足 10 积分。可以先点上方「📅 签到」或去福利页完成破冰问卷 (+50分)！`
        : `⚠️ 抓娃娃执行暂不可用（${code}），请前往算力游乐场操作。`,
      replyEn: isLowPoints
        ? `⚠️ No free tokens left and balance is under 10 pts. Claim daily check-in (+5 pts) or onboarding (+50 pts) first!`
        : `⚠️ Claw machine unavailable (${code}).`,
      links: [{ href: "/workspace/benefits", title: "去领免费算力与抓娃娃币", detail: "新人可领 100~150 积分", icon: "credits" }],
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
  const top = filtered.slice(0, 4);

  const items = top.map((offer) => {
    const tiers = offer.listing.pricingTiers ?? [];
    const minMinor = tiers.length ? Math.min(...tiers.map((t) => t.priceMinor)) : offer.listing.priceMinor;
    // 未标注价格就用 0 表示"未知"，绝不编造金额；按运行计费的商品在列表里没有单一价格。
    const pricePoints = offer.listing.execution ? 0 : Math.max(0, Math.round(minMinor / 100));
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

  // 只有货架真实标注了价格才展示金额；未知就不写数字（曾出现 "~2积分"/`|| 10` 这类编造价格）。
  const priceLabelZh = (it: { runnable: boolean; pricePoints: number }) =>
    it.runnable ? "按运行计费" : it.pricePoints > 0 ? `${it.pricePoints} 积分` : "";
  const priceLabelEn = (it: { runnable: boolean; pricePoints: number }) =>
    it.runnable ? "billed per run" : it.pricePoints > 0 ? `${it.pricePoints} pts` : "";
  const summaryListZh = items
    .map((it, idx) => `${idx + 1}. **${it.title}**${priceLabelZh(it) ? `（${priceLabelZh(it)}）` : ""}`)
    .join("\n");
  const summaryListEn = items
    .map((it, idx) => `${idx + 1}. **${it.title}**${priceLabelEn(it) ? ` (${priceLabelEn(it)})` : ""}`)
    .join("\n");

  return {
    ok: true,
    toolUsed: "search_market",
    trace: [
      `[1/2] agent.search_market · 检索市场货架（关键词：${q || "全部在售"}，共扫描 ${offers.length} 款）`,
      items.length
        ? `[2/2] agent.rank_offers · 关键词命中 ${items.length} 款，生成直达链接`
        : `[2/2] agent.rank_offers · 关键词无命中，未推荐任何商品`,
    ],
    replyZh: items.length
      ? q
        ? `🛒 **Agent 在市场 (\`/market\`) 找到 ${items.length} 款匹配「${query}」的商品：**\n${summaryListZh}`
        : `🛒 **市场 (\`/market\`) 当前在售 ${items.length} 款商品：**\n${summaryListZh}`
      : `🛒 当前市场暂无匹配「${query}」的商品，点击下方可浏览全部在售商品。`,
    replyEn: items.length
      ? q
        ? `🛒 **Agent found ${items.length} match(es) for "${query}" on ANS Market (\`/market\`):**\n${summaryListEn}`
        : `🛒 **${items.length} listing(s) currently on ANS Market (\`/market\`):**\n${summaryListEn}`
      : `🛒 No match for "${query}" on ANS Market. Browse all listings below.`,
    data: { items, totalPublished: offers.length },
    links: [
      ...items.slice(0, 3).map((it) => ({
        href: it.href,
        title: `${it.title}${it.runnable ? " (可直接运行)" : it.pricePoints > 0 ? ` (${it.pricePoints}积分)` : ""}`,
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
    `> 由 **ANS Agent** 自动生成并写入你的个人项目库，可直接用于农客松参赛申报、README 展示或团队协作。`,
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
    `- **Step 1（第 1~2 天）**：跑通核心 Prompt 与单点数据推理，在 \`/workspace/models\` 验证准确率。`,
    `- **Step 2（第 3~4 天）**：封装为可复用的 ANS 工作流并上架 \`/market\` 市场。`,
    `- **Step 3（第 5 天）**：完善路演演示页面与评测指标，提交至农客松作品墙。`,
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
              contentJson: { title: topic, summary: `Agent 自动生成的「${topic}」立项草案`, markdown },
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
    trace: [
      `[1/3] agent.scaffold_project · 创建项目实体《${created.title}》(${created.id})`,
      "[2/3] agent.write_facts · 写入核心问题定义与目标受众事实",
      "[3/3] agent.write_artifact · 生成首版《README 与立项架构书》(v1)",
    ],
    replyZh: `📝 **Agent 已在你的工作台创建真实项目《${created.title}》！**\n同时已自动写入首版 **《README 与立项架构书》** 及核心项目事实。`,
    replyEn: `📝 **Agent created project "${created.title}" in your workspace!**\nIncludes a complete v1 README & architecture blueprint.`,
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

export async function redeemMarketItemViaPi(actor: string, rawQuery: string, confirmedPoints?: number): Promise<PiActionResult> {
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

  // 绝不替用户挑一件"差不多的"商品下单：匹配不到就明确说没匹配到，并且不发生任何扣费。
  if (!matched) {
    const asked = rawQuery.trim();
    return {
      ok: false,
      toolUsed: "redeem_market_item",
      trace: [`[1/1] agent.redeem_market_item · 未匹配到「${asked || "指定商品"}」，未发生扣费`],
      replyZh: asked
        ? `⚠️ 没找到和「${asked}」匹配的在售商品，**没有扣任何积分**。请到市场挑一件再兑换。`
        : "⚠️ 请告诉我要兑换哪件商品（或直接在市场页面点兑换），**没有扣任何积分**。",
      replyEn: asked
        ? `⚠️ No published listing matches "${asked}". Nothing was charged — pick one on the market.`
        : "⚠️ Tell me which listing to redeem (or redeem from the market page). Nothing was charged.",
      links: [{ href: "/market", title: "前往 ANS 市场 (/market)", detail: "浏览全部在售商品", icon: "discover" }],
    };
  }

  const { r: target, title, summary, description, category, subcategory, fulfillment, priceMinor, deliverables, licenseTerms } = matched;
  const pricePoints = Math.max(1, Math.round(priceMinor / 100));
  const userBefore = await db.user.findUnique({ where: { id: actor }, select: { quotaPoints: true } });
  const currentBal = userBefore ? Math.round(Number(userBefore.quotaPoints) * 10) / 10 : 0;

  if (currentBal < pricePoints) {
    return {
      ok: false,
      toolUsed: "redeem_market_item",
      replyZh: `⚠️ 兑换《${title}》需要 **${pricePoints} 积分**，当前余额 **${currentBal} 积分**。请先点上方「📅 签到」或「🕹️ 抓娃娃」领积分后再秒兑！`,
      replyEn: `⚠️ Redeeming "${title}" requires ${pricePoints} pts (current balance: ${currentBal} pts). Click Check-in (+5pt) or Claw Pull first!`,
      balancePoints: currentBal,
      links: [
        { href: "/workspace/benefits", title: "去福利中心领 100~150 积分", detail: "破冰问卷 +50分 / 每日签到 +5分", icon: "credits" },
      ],
    };
  }

  // 需要用户用"同一个金额"确认过才允许扣费；未确认时只报价，不落任何账。
  if (confirmedPoints !== pricePoints) {
    return {
      ok: false,
      error: "CONFIRM_REQUIRED",
      toolUsed: "redeem_market_item",
      trace: [`[1/2] agent.redeem_market_item · 匹配到《${title}》，报价 ${pricePoints} 积分（未扣费）`],
      replyZh: `💰 兑换《${title}》需要 **${pricePoints} 积分**（当前余额 **${currentBal} 积分**）。点「确认兑换」我才扣费——**现在还没有扣分**。`,
      replyEn: `💰 Redeeming "${title}" costs **${pricePoints} pts** (balance ${currentBal} pts). Nothing is charged until you confirm.`,
      balancePoints: currentBal,
      data: { requiresConfirmation: true, pricePoints, intent: "redeem", slug: target.slug, title },
      links: [{ href: "/market", title: "先去市场看看其他商品 (/market)", detail: "对比价格与交付清单后再兑换", icon: "discover" }],
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
        requirements: "Agent 一键积分秒兑自动交付",
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
        note: `Agent instant redeem: ${target.slug}`,
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
    trace: [
      `[1/3] agent.redeem_market_item · 锁定目标商品《${title}》(${pricePoints} 积分)`,
      `[2/3] agent.quota_escrow · 扣除 ${pricePoints} 积分并创建订单 (${result.orderId})`,
      `[3/3] agent.auto_deliver · 自动写入完整 Markdown 交付包（剩余 ${result.balance} 积分）`,
    ],
    replyZh: `🎁 **Agent 已帮你花 ${pricePoints} 积分秒兑《${title}》！**\n完整 Markdown 交付包已自动解锁并写入订单！当前剩余 **${result.balance} 积分**。`,
    replyEn: `🎁 **Agent redeemed "${title}" for ${pricePoints} pts!**\nFull Markdown toolkit has been auto-delivered to your order! Balance: **${result.balance} pts**.`,
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
  mode: "code" | "ask" = "code",
  contextCode?: string,
): Promise<PiActionResult> {
  const prompt = rawPrompt.trim().slice(0, 4000) || "请为我生成一份本周中国农业大学智慧农业课题组 Git 提交与实验进展周报框架（含本周核心突破、实验指标表格与下周计划）。";
  const selectedModel = modelKey || "deepseek-v4.1-flash";
  const minRequiredPoints = estimateMinPreCallPoints(selectedModel, prompt);

  const userBefore = await db.user.findUnique({ where: { id: actor }, select: { quotaPoints: true } });
  const currentBal = userBefore ? Math.round(Number(userBefore.quotaPoints) * 1_000_000) / 1_000_000 : 0;

  if (currentBal <= 0 || currentBal < minRequiredPoints) {
    return {
      ok: false,
      toolUsed: "run_model_playground",
      trace: [
        `[1/2] agent.read_workspace · 解析任务指令 (${mode === "ask" ? "Ask 提问" : "Code 构建"})`,
        `[2/2] agent.quota_guard · 余额不足 (${currentBal} < ${minRequiredPoints} pt)，已触发零扣费保护`,
      ],
      replyZh: `⚠️ 当前算力积分不足（剩余 **${currentBal}** 积分，按官方 Token 单价与倍率预估最低需 **${minRequiredPoints}** 积分），本次未产生扣费。请先前往免费算力中心每日签到（+5 积分）或兑换算力积分后再试。`,
      replyEn: `⚠️ Insufficient compute points (balance: ${currentBal}, estimated minimum required: ${minRequiredPoints} for ${selectedModel}). No points were charged.`,
      pointsDelta: 0,
      balancePoints: currentBal,
      data: {
        model: selectedModel,
        costPoints: 0,
        balancePoints: currentBal,
        usage: null,
      },
      links: [
        {
          href: "/workspace/benefits",
          title: "🎁 去免费算力中心签到 (+5 积分)",
          detail: "每日签到领 5 积分，或使用抓娃娃机抽取 1000 积分大奖",
          icon: "credits",
        },
        {
          href: "/workspace/credits",
          title: "💳 前往积分中心充值 / 兑换卡密",
          detail: "查看算力积分余额与充值明细",
          icon: "credits",
        },
      ],
    };
  }

  const baseUrl = (process.env.RUN_BASE_URL || "http://apic.cauai.fun:3000").replace(/\/+$/, "");
  const apiKey = process.env.RUN_API_KEY || "";
  const chatUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
  const responsesUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/responses` : `${baseUrl}/v1/responses`;

  const hasContext = Boolean(contextCode && contextCode.trim().length > 0);
  const systemPrompt =
    mode === "ask"
      ? "你是 ANS 工作模式内置的资深软件架构师与科研顾问（Ask 模式）。请直接用清晰、干练的 Markdown 回答用户的技术问题、架构规划或代码审查建议，不输出多余寒暄。"
      : hasContext
        ? "你是 ANS 工作模式内置的 Codex 全栈工程智能体（Code 迭代模式）。用户正在基于已有代码进行增量修改。请先用 1~2 句话简要说明本次修改点，然后在一个完整的 ```html（或 ```python / ```markdown）代码块中输出修改后的完整可运行源码，确保所有既有功能与新增需求完整工作。"
        : "你是 ANS 工作模式内置的 Codex 全栈工程智能体（Code 生成模式）。当用户需要网页、工具、看板或小游戏时，请先用 1~2 句话说明实现亮点，随后在一个完整的 ```html 代码块中输出单文件可直接运行的 HTML5 + CSS + JS 源码（深色现代高对比度 UI，内置真实可点击交互）；若用户明确要求 Python 脚本或文档，则输出对应的 ```python 或 ```markdown 代码块。";

  const userPayload = hasContext
    ? `【当前工作区已有源码】：\n\`\`\`\n${contextCode!.slice(0, 12000)}\n\`\`\`\n\n【${mode === "ask" ? "本次提问/分析指令" : "本次修改/迭代指令"}】：\n${prompt}`
    : prompt;

  let outputText = "";
  let usage: UpstreamUsagePayload | null = null;

  if (apiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 35000);
      const res = await fetch(chatUrl, {
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
              content: systemPrompt,
            },
            { role: "user", content: userPayload },
          ],
          max_tokens: 1800,
          ...(selectedModel === "deepseek-v4.1-flash" ? { thinking: { type: "disabled" } } : {}),
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
          usage?: UpstreamUsagePayload;
        };
        outputText = (data.choices?.[0]?.message?.content || "").trim();
        usage = data.usage ?? null;
      } else if (selectedModel !== "deepseek-v4.1-flash") {
        const fallbackCtrl = new AbortController();
        const fallbackTimer = setTimeout(() => fallbackCtrl.abort(), 35000);
        const respRes = await fetch(responsesUrl, {
          method: "POST",
          signal: fallbackCtrl.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            instructions: systemPrompt,
            input: userPayload,
            max_output_tokens: 1800,
          }),
        });
        clearTimeout(fallbackTimer);
        if (respRes.ok) {
          const respData = (await respRes.json()) as {
            output_text?: string;
            output?: { type?: string; content?: { type?: string; text?: string }[] }[];
            usage?: UpstreamUsagePayload;
          };
          outputText = (
            respData.output_text ||
            (respData.output ?? [])
              .flatMap((item) => (item.type === "message" ? item.content ?? [] : []))
              .filter((part) => part.type === "output_text" && typeof part.text === "string")
              .map((part) => part.text)
              .join("\n")
          ).trim();
          usage = respData.usage ?? null;
        }
      }
    } catch {
      // Upstream timeout or network failure — handled below with zero deduction
    }
  }

  if (!outputText) {
    return {
      ok: false,
      toolUsed: "run_model_playground",
      trace: [
        `[1/3] agent.read_workspace · 解析任务指令 (${selectedModel})`,
        `[2/3] agent.gateway_call · 上游模型节点响应超时`,
        `[3/3] agent.zero_charge_guard · 已触发零扣费保护 (消耗 0 积分)`,
      ],
      replyZh: `⚠️ 上游模型节点（\`${selectedModel}\`）响应超时或暂时繁忙，**本次调用未扣除任何算力积分（消耗 0 积分，当前余额 ${currentBal} 积分）**。请稍后重试或切换至 \`deepseek-v4.1-flash\` 极速模型。`,
      replyEn: `⚠️ Upstream model (${selectedModel}) timed out or is temporarily unavailable. 0 points were deducted (balance: ${currentBal}). Please retry or switch models.`,
      pointsDelta: 0,
      balancePoints: currentBal,
      data: {
        model: selectedModel,
        costPoints: 0,
        balancePoints: currentBal,
        usage: null,
      },
      links: [
        {
          href: "/workspace/models",
          title: "⚡ 切换其他模型重试 (/workspace/models)",
          detail: "按官方 Token 单价与倍率（DeepSeek 1x / GPT-6 0.16x）实算扣费",
          icon: "discover",
        },
      ],
    };
  }

  const breakdown = calculateOfficialTokenPoints(
    selectedModel,
    usage,
    userPayload,
    outputText,
  );
  const costPoints = breakdown.billedPoints;

  const { chargedPoints, newBalance } = await db.$transaction(async (tx) => {
    const freshUser = await tx.user.findUnique({ where: { id: actor }, select: { quotaPoints: true } });
    const freshBal = freshUser ? Number(freshUser.quotaPoints) : 0;
    const actualDeduct = Math.round(Math.min(freshBal, costPoints) * 1_000_000) / 1_000_000;
    if (actualDeduct <= 0) {
      throw new Error("QUOTA_INSUFFICIENT");
    }
    const u = await tx.user.update({
      where: { id: actor },
      data: { quotaPoints: { decrement: actualDeduct } },
      select: { quotaPoints: true },
    });
    await tx.quotaLedger.create({
      data: {
        userId: actor,
        amount: -actualDeduct,
        balanceAfter: u.quotaPoints,
        reason: "RUN_COST",
        refType: "playground_run",
        refId: `pg-${Date.now()}`,
        note: `Model Playground (${selectedModel}: in=${breakdown.uncachedInputTokens}, cache=${breakdown.cachedReadTokens}, out=${breakdown.outputTokens}, x${breakdown.consumptionMultiplier})`,
      },
    });
    return {
      chargedPoints: actualDeduct,
      newBalance: Math.round(Number(u.quotaPoints) * 1_000_000) / 1_000_000,
    };
  });

  return {
    ok: true,
    toolUsed: "run_model_playground",
    trace: [
      `[1/4] agent.read_workspace · 读取工作区上下文 (${hasContext ? `含既存代码 ${contextCode!.split("\n").length} 行` : "新建空白环境"})`,
      `[2/4] agent.plan_strategy · 执行模式：${mode === "ask" ? "Ask 架构问答" : "Code 产物构建与 Diff 合成"}`,
      `[3/4] agent.model_invoke (${selectedModel}) · 输入 ${breakdown.inputTokens} tok / 输出 ${breakdown.outputTokens} tok`,
      `[4/4] agent.quota_settle · 实算扣费 -${chargedPoints} 积分（剩余 ${newBalance} 积分）`,
    ],
    replyZh: outputText,
    replyEn: outputText,
    pointsDelta: -chargedPoints,
    balancePoints: newBalance,
    data: {
      model: selectedModel,
      costPoints: chargedPoints,
      balancePoints: newBalance,
      usage: {
        ...(usage ?? {}),
        input_tokens: breakdown.inputTokens,
        uncached_input_tokens: breakdown.uncachedInputTokens,
        cached_read_tokens: breakdown.cachedReadTokens,
        cache_write_tokens: breakdown.cacheWriteTokens,
        output_tokens: breakdown.outputTokens,
        consumption_multiplier: breakdown.consumptionMultiplier,
        usd_cost: breakdown.usdCost,
      },
    },
    links: [
      {
        href: "/market",
        title: "去 ANS 市场解锁更多专业 Prompt 工具包 (/market)",
        detail: "农大科研、论文润色与 AI 短剧工具包，可用积分兑换",
        icon: "discover",
      },
      {
        href: "/workspace/benefits",
        title: `当前剩余 ${newBalance} 积分 · 去领免费算力`,
        detail: "每日签到 +5分 / 3D 抓娃娃机抽 1000 积分大奖",
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
    mode?: "code" | "ask";
    contextCode?: string;
    /** 用户已确认的扣费金额（积分）。与实时报价不一致时服务端拒绝扣费。 */
    confirmedPoints?: number;
  },
): Promise<PiActionResult> {
  const rawPrompt = (input.prompt ?? "").trim();
  const intent = input.intent ?? "auto";
  const lower = rawPrompt.toLowerCase();

  if (intent === "checkin") return claimDailyBenefitViaPi(actor);
  if (intent === "claw") return playClawArcadeViaPi(actor, input.confirmedPoints);
  if (intent === "market") return searchMarketViaPi(rawPrompt, actor);
  if (intent === "scaffold") return scaffoldProjectDraftViaPi(actor, rawPrompt);
  if (intent === "redeem") return redeemMarketItemViaPi(actor, rawPrompt, input.confirmedPoints);

  // Even when called from Work Mode (intent === "playground"), allow explicit site-level pi-agent tool commands!
  if (/^(帮我|请)?(签到|打卡|每日签到|领每日积分|checkin|check-in)$/i.test(lower)) {
    return claimDailyBenefitViaPi(actor);
  }
  if (/^(帮我|请)?(抓娃娃|玩抓娃娃|下爪|claw|play claw)$/i.test(lower)) {
    return playClawArcadeViaPi(actor, input.confirmedPoints);
  }
  if (intent === "playground") {
    return runModelPlaygroundViaPi(actor, rawPrompt, input.model, input.mode ?? "code", input.contextCode);
  }

  // Auto-route natural language command via Agent intent router
  if (/签到|打卡|每日|领积分|checkin|check-in|daily/.test(lower)) {
    return claimDailyBenefitViaPi(actor);
  }
  if (/抓娃娃|娃娃机|转盘|抽奖|兑币|claw|arcade|gacha|spin/.test(lower)) {
    return playClawArcadeViaPi(actor, input.confirmedPoints);
  }
  if (/兑换|秒兑|买|购买|解锁|redeem|buy/.test(lower)) {
    const cleaned = rawPrompt.replace(/^(帮我|请|小恐龙)?(兑换|秒兑|购买|买一个|买|解锁)[:：\s]*/i, "").trim();
    return redeemMarketItemViaPi(actor, cleaned, input.confirmedPoints);
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
