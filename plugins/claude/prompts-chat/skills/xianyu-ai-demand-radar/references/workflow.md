# Xianyu AI Demand Radar Workflow

## Goal

Find AI-related demand that can become a real Xianyu/Goofish listing within 24 hours, then rank it by evidence, delivery feasibility, and the user's existing assets.

## Demand Sources

Use at least three source types before calling an idea "validated":

| Source | What to Look For | Useful Signals |
| --- | --- | --- |
| Xianyu/Goofish | Active listings, "想要" count, pricing, titles, buyer phrasing | Repeated listings, high want count, low-quality competitor copy |
| Bilibili/YouTube | Tutorials, comments, views, creator follow-ups | "工作流有分享吗", "能部署吗", "电脑带得动吗" |
| Zhihu/36Kr/tech media | Trend explanations and monetization angle | "卖铲子", deployment demand, beginner pain |
| GitHub/LiblibAI/ModelScope | Tool/workflow popularity and setup difficulty | stars, downloads, online runs, missing-model comments |
| User assets | Owned workflows, sites, scripts, image/video examples | Can deliver repeatedly with proof |
| Published listing data | User's own Xianyu listing views, chats, wants | Buyer questions, conversion friction |

## Query Templates

Run several targeted searches:

```text
闲鱼 {keyword} 教程
闲鱼 {keyword} 部署
site:goofish.com/item {keyword}
{keyword} 闲鱼 卖
{keyword} 工作流 下载
{keyword} 工作流 有分享吗
{keyword} 部署 教程 价格
{keyword} 必装 skill
{keyword} comments workflow
{keyword} bilibili 工作流
{keyword} LiblibAI 工作流
{keyword} 问题 报错 显存
```

For social visual trends:

```text
{style} AI 照片 爆红
{style} AI 生成 闲鱼
{style} 展示面 男生
{style} 小红书 AI 修图
```

## Evidence Notes

For each source, record:

- URL
- platform
- published or observed date
- metric: views, likes, comments, downloads, wants, price, stars, etc.
- buyer pain quote or paraphrase
- why it suggests purchase intent

Keep quotes short. Prefer paraphrase unless exact buyer wording is important.

## WORTH Scoring

Score each candidate from 0 to 5:

| Field | 0 | 3 | 5 |
| --- | --- | --- | --- |
| heat | No evidence | One platform shows interest | Multiple recent signals or strong metrics |
| pain | Nice-to-have | Clear confusion/time cost | Blocks buyer from doing the thing |
| asset_fit | No current asset | Partial reusable asset | User already has workflow/site/proof |
| reuse | Fully custom each time | Some templating | Repeatable pack or service |
| price_power | Only low-ticket | Mid-ticket add-ons possible | Setup/custom packages possible |
| risk | No risk | Manageable wording/support | High ethics/platform/support risk |

Formula:

```text
score = heat + pain + asset_fit + reuse + price_power - risk
```

Priority:

- 18+: publish or test immediately
- 15-17: build a lightweight listing and watch chats
- 12-14: keep as content/lead magnet or bundle
- below 12: archive unless new evidence appears

## Productization Ladder

Turn an idea into one or more offers:

| Offer Type | Best For | Example |
| --- | --- | --- |
| SOP/PDF | Low-ticket education | "OpenClaw 必装 Skills 清单" |
| Template/workflow | Repeatable digital asset | "Wan2.2 Animate 工作流+模型路径表" |
| Remote deployment | High-pain setup | "Hermes Agent 1Panel/VPS 远程部署" |
| Custom output | Buyer sends material | "男生展示面 9 张旅行/球场照片" |
| Tool/site access | Owned website or SaaS | "Image2 案例库同款图生成" |
| Done-for-you system | Higher ticket | "电商带货视频矩阵生成系统搭建" |

## Account Growth Fit

Do not evaluate opportunities as isolated one-off listings. Check whether each idea strengthens a single account position:

```text
AI 工作流 / AI 部署 / AI 图片视频交付
```

Good fit:

- OpenClaw / 龙虾部署、Skills、报错排查。
- Hermes / 赫妹 Agent 部署、Telegram/Discord 私人助理。
- ComfyUI 工作流、高清修复、人物替换、动作迁移。
- Image2 商品图、展示面、海报、电商主图。
- AI 自动化 Skill、网站/工具站、电商带货视频矩阵。

Poor fit:

- Unrelated second-hand goods.
- Low-quality virtual-material dumping.
- Account sales, SMS verification, mass messaging, privacy invasion, bypassing platform controls, or deceptive services.

Recommended publishing rhythm:

- New or restarted account: 2-3 high-quality same-niche listings per day for 7 days.
- Stable account: 3-5 same-niche listings or variants per day.
- Avoid 10-15+ same-day low-quality or repetitive listings, frequent delete/repost loops, and repeated title/image edits on the same item.

Traffic rule:

- Free "擦亮" can be used daily but should not be treated as the main growth lever.
- Paid exposure/super boost should only amplify listings with natural clicks, wants, chats, or orders.
- If a boosted listing gets exposure but no chats, stop spending and improve the cover, title, price ladder, and body.

## Compounding Value

For each opportunity, estimate what reusable assets it creates:

| Asset | Examples | Why It Compounds |
| --- | --- | --- |
| Demand asset | trend notes, competitor proof, buyer questions | feeds the next listing angle |
| Image asset | Image2 backgrounds, overlay templates, case grids | faster future listing images |
| Copy asset | titles, body structures, price ladders, boundary wording | reusable across same keyword cluster |
| Delivery asset | SOP, scripts, workflow files, error fixes | reduces per-order delivery time |
| Proof asset | screenshots, sample outputs, published links | increases trust in future listings |
| Data asset | exposure, views, wants, chats, orders | tells which variant to publish next |

Rate compounding value:

```text
5 = long-term reusable, can split into multiple listings, can upsell
4 = reusable but needs trend/case updates
3 = sellable but manual delivery is still heavy
2 = occasional demand, test only
1 = not worth pushing now
```

When recommending opportunities, prefer those with WORTH >= 18 and compounding value >= 4.

## Listing Opportunity Template

For each promising opportunity, write:

```text
需求名:
目标买家:
买家搜索词:
证据:
WORTH评分:
可卖商品形态:
首发标题:
建议价格:
交付内容:
买家需要提供:
上架图角度:
详情页爆点:
风险/边界话术:
下一步素材缺口:
账号标签匹配:
复利资产:
复利评级:
下一条变体:
```

## Compliance and Trust Wording

Use these boundaries:

- "使用买家本人或已授权素材，不接公众人物/未授权换脸/擦边内容。"
- "部署服务不代管密钥，API Key 由买家自行输入或现场指导。"
- "不同电脑配置/模型额度会影响速度与效果，先做配置评估。"
- "不承诺涨粉、必爆、包变现、包过审。"
- "工作流交付包含安装路径、节点说明、常见报错处理，不包含盗版模型。"

## First Listing Decision

Pick the first listing by asking:

1. Can we create convincing original images today?
2. Can the user deliver the first order without new R&D?
3. Is buyer pain visible in comments/search/listings?
4. Is the support boundary explainable in one sentence?
5. Can the offer be split into low-ticket lead-in and higher-ticket upsell?

If yes, hand off to `xianyu-product-publisher`.
