# 小恐龙目录数据英文草稿（评审用 · 未落库）

> **状态**：草稿。没有改任何代码、没有改任何词条，只把"英文该怎么写"摊开给你审。
> **怎么审**：可以直接在 GitHub 的 diff 里改英文；或回复「同意」，以及需要改的条目（我按你的版本落库）。
> **批准后我怎么落地**：见文末「落地方式」，纯机械改动 + 一条 locale 选择逻辑。

## 为什么这些不算"UI 文案"

它们不是界面上的固定句子，而是**目录数据**（族群、衣橱物品、风格标签），当前只有中文：

| 数据 | 位置 | 条数 |
|---|---|---|
| 4 个族群（name / defaultNickname / title / mbti / tagline / personality / agentSpecialty / agentBuffLabel / greetingLine / whipLine / feedLine） | `src/domain/mascot/sanctuary.ts` `DINO_SPECIES` | 44 |
| 22 件衣橱物品（name / description / specialQuote） | `src/domain/mascot/sanctuary.ts` `DINO_WARDROBE_ITEMS` | 66 |
| 风格标签（极客/甜酷/赛博/学院/星神，出现在稀有度徽章旁） | 同上 `styleTag` | 5 |

食物（`BLIND_BOX_FOODS`）本来就是 `nameZh/nameEn` 双语，不在本表内。

英文界面上，上面这些现在**全都显示中文** —— 这是审查里"面板数据层未 i18n"那一条。

## 表 1：族群（44 条）

| id | field | 中文 | 建议英文 |
|---|---|---|---|
| `mint_star` | name | 薄荷星翼龙 | Mint Starwing Dragon |
| `mint_star` | defaultNickname | 小薄荷 Minty | Minty |
| `mint_star` | title | 原初灵感种 · 创意搭子 | Primordial Spark lineage · Idea partner |
| `mint_star` | mbti | ENFP · 快乐小狗型 | ENFP · Happy-puppy type |
| `mint_star` | tagline | 薄荷青玉背棘 + 星芒小肉翅，脑洞永远比需求大三圈！ | Mint-jade back spikes with starry little wings — ideas always three sizes bigger than the brief! |
| `mint_star` | personality | 元气E龙、灵感永动机，最擅长帮你拆解神仙项目、包装高颜值作品集；偶尔在屏幕边兜圈摸鱼。 | High-energy idea engine. Best at breaking down wild project ideas and packaging polished portfolios; occasionally circles the screen edge to slack off. |
| `mint_star` | agentSpecialty | 项目灵感拆解 / 作品集包装 / 跨学科脑暴 | Idea breakdown / portfolio packaging / cross-discipline brainstorms |
| `mint_star` | agentBuffLabel | ✨ 创意发散度 +25% · 每日首聊赠 15 星豆 | ✨ Idea spread +25% · 15 Star Beans on the first chat of each day |
| `mint_star` | greetingLine | 咻~ 我是你的专属薄荷星翼龙！今天咱们一起造个什么酷东西？ | Zwoosh~ I'm your very own Mint Starwing. What cool thing are we building today? |
| `mint_star` | whipLine | 啪！嗷呜小屁股开花啦！本薄荷龙已经在用 300% 手速帮你肝灵感了！ | Whap! Ow, my little tail! This mint dragon is already farming ideas at 300% speed! |
| `mint_star` | feedLine | 哇咔咔！一口吞下十倍快乐！灵感槽直接溢出来啦~ | Wahaha! Ten times the joy in one bite — my idea meter is overflowing~ |
| `cyber_gold` | name | 熔金赛博暴龙 | Molten-Gold Cyber Rex |
| `cyber_gold` | defaultNickname | 4090暴龙哥 | Rex 4090 |
| `cyber_gold` | title | 算力狂飙种 · 硬核卷王 | Compute Overdrive lineage · Hardcore grinder |
| `cyber_gold` | mbti | ENTJ · 满血算力指挥官 | ENTJ · Full-throttle compute commander |
| `cyber_gold` | tagline | 曜石黑金机甲鳞片 + 熔岩金折角，血管里流淌着 800W 满血算力！ | Obsidian-black mech scales with molten-gold horns — 800W of raw compute runs through my veins! |
| `cyber_gold` | personality | 嘴硬心软的硬核卷王，见不得任何低效工作流与空指针 Bug；被抽屁股会傲娇开启超频狂暴模式。 | Tough-talking but soft-hearted grinder. Cannot stand inefficient workflows or null-pointer bugs; whip me and I sulk into overclocked berserk mode. |
| `cyber_gold` | agentSpecialty | 工作流自动编排 / 硬核代码 Debug / 算力赛事冲榜 | Workflow automation / hardcore debugging / compute-contest leaderboards |
| `cyber_gold` | agentBuffLabel | ⚡ 搬砖手速 +35% · 抽屁股好感加成翻倍 | ⚡ Coding speed +35% · whip affection bonus doubled |
| `cyber_gold` | greetingLine | 显卡已预热，算力已拉满！说吧搭档，今天先秒掉哪个硬核任务？ | GPU warmed up, compute maxed out. So, partner — which hard task do we delete first today? |
| `cyber_gold` | whipLine | 嗷！！敢抽本赛博暴龙的钛金屁股？！看我一秒给你飙出十万行零 Bug 代码！ | RAAAGH! You dare whip a cyber rex's titanium tail?! Watch me blast out a hundred thousand bug-free lines in one second! |
| `cyber_gold` | feedLine | 咔哧咔哧！算力燃料注入完毕，GPU 核心温度直冲云霄！ | Crunch crunch! Compute fuel injected — GPU core temperature heading for the sky! |
| `sakura_mochi` | name | 樱粉云朵泡芙龙 | Sakura Cloud Puff Dragon |
| `sakura_mochi` | defaultNickname | 糯米泡芙 Mochi | Mochi |
| `sakura_mochi` | title | 治愈摸鱼种 · 审美天花板 | Comfort Slacker lineage · Aesthetic ceiling |
| `sakura_mochi` | mbti | INFP · 甜酷美学小恐龙 | INFP · Sweet-cool aesthetic dino |
| `sakura_mochi` | tagline | 奶油樱花粉Q弹圆肚皮 + 软糯垂耳角，一口吃掉你的精神内耗！ | Creamy sakura-pink belly and soft floppy horns — I eat your creative burnout for breakfast! |
| `sakura_mochi` | personality | 顶级情绪价值搭子与奇迹暖暖级穿搭控，对页面排版、字体审美与去 AI 味文案有近乎偏执的直觉。 | Top-tier emotional support buddy and a wardrobe perfectionist, with near-obsessive instincts for layout, typography and de-AI-ified copy. |
| `sakura_mochi` | agentSpecialty | 高颜值简历精修 / 去 AI 味文案润色 / 穿搭审美把关 | Resume polish / de-AI copy editing / outfit aesthetic review |
| `sakura_mochi` | agentBuffLabel | 💖 投喂好感度 +30% · 衣橱时尚评分额外 +15% | 💖 Feed affection +30% · wardrobe style score +15% extra |
| `sakura_mochi` | greetingLine | 贴贴你~ 今天也要漂漂亮亮地搞创作哦，累了随时戳我充个电！ | Cuddle~ Let's make something pretty today. Tired? Poke me anytime for a recharge! |
| `sakura_mochi` | whipLine | 呜呜轻点抽泡芙小屁股呀！人家已经在含泪把你的简历擦得blingbling发光啦！ | Wuuu, easy on the puff tail! I'm already wiping your resume sparkling clean with tears in my eyes! |
| `sakura_mochi` | feedLine | 幸福到冒粉红泡泡╰(*°▽°*)╯！你是全宇宙最宠小恐龙的好搭档！ | So happy I'm blowing pink bubbles ╰(*°▽°*)╯! You're the most doting partner in the universe! |
| `aurora_ice` | name | 极光量子冰龙 | Aurora Quantum Ice Dragon |
| `aurora_ice` | defaultNickname | 星璇 Nova | Nova |
| `aurora_ice` | title | 高冷学神种 · 逻辑审判官 | Cold Genius lineage · Logic judge |
| `aurora_ice` | mbti | INTJ · 清醒六边形学神 | INTJ · Sober all-round scholar |
| `aurora_ice` | tagline | 冰川极光蓝紫鳞羽 + 星璇棱镜水晶冠，一眼洞穿全链路逻辑漏洞！ | Glacier aurora scales and a prismatic crystal crown — I spot logic holes across the whole pipeline at a glance! |
| `aurora_ice` | personality | 表面高冷毒舌的人间清醒小恐龙，实则护短第一名；帮你审论文、抠架构、过 VibeHub 课程稳如泰山。 | Looks aloof and sharp-tongued, actually fiercely protective. Reviews papers, audits architecture and clears VibeHub courses like clockwork. |
| `aurora_ice` | agentSpecialty | VibeHub 深度陪学 / 提示词工程调优 / 架构逻辑审计 | VibeHub deep study / prompt-engineering tuning / architecture audits |
| `aurora_ice` | agentBuffLabel | 🔮 深度推理加成 +30% · 升级解锁衣装折扣 -15% | 🔮 Deep reasoning +30% · level-up unlocks 15% wardrobe discount |
| `aurora_ice` | greetingLine | 推了推眼镜——你的创作轨迹我已经建模完毕，随时可以开始高阶推演。 | Adjusts glasses — your creative trail is modelled. We may begin advanced deduction whenever you like. |
| `aurora_ice` | whipLine | 咳…别动手动脚抽屁股！本小恐龙不用催也在满负荷帮你推导最优解！ | Ahem… kindly keep your hands off my tail. This dino is already running flat out for your optimal solution. |
| `aurora_ice` | feedLine | 唔…口感尚可，多巴胺分泌 +18%，勉强允许你再摸一下我的水晶角。 | Mmm… acceptable texture. Dopamine +18%. You may pat my crystal horn one more time. |

## 表 2：衣橱（66 条）

| id | slot | field | 中文 | 建议英文 |
|---|---|---|---|---|
| `none_head` | headwear | name | 清爽裸冠 | Bare Crown |
| `none_head` | headwear | description | 露出小恐龙骄傲的原生头顶小背刺。 | Shows off the dino's proud little back spikes. |
| `none_head` | headwear | specialQuote | 原生背刺吹着小风，清爽得想原地起飞~ | Native spikes in the breeze — light enough to take off~ |
| `starter_antenna` | headwear | name | 5G 灵感小天线 | 5G Idea Antenna |
| `starter_antenna` | headwear | description | 新人领养赠礼！随时接收 ANS 宇宙满格创作信号。 | Adoption gift! Always tuned to full-strength creative signals from the ANS universe. |
| `starter_antenna` | headwear | specialQuote | 哔哔——头顶小天线已捕捉到一条绝妙 Prompt！ | Beep-beep — antenna caught an excellent prompt! |
| `beret_cloud` | headwear | name | 奶油云朵画家帽 | Cream Cloud Beret |
| `beret_cloud` | headwear | description | 软糯斜戴的法式艺术家贝雷帽，审美气场瞬间拉满。 | A soft, tilted French-artist beret. Instant aesthetic aura. |
| `beret_cloud` | headwear | specialQuote | 戴上画家帽，今天你的简历和作品集由本艺术龙亲自操刀！ | Beret on — your resume and portfolio are mine to craft today! |
| `cyber_visor` | headwear | name | RTX 全息战术护额 | RTX Holographic Visor |
| `cyber_visor` | headwear | description | 探索者等级解锁！搭载算力监控 HUD 的钛金流光护额。 | Explorer-tier unlock! Titanium visor with a built-in compute HUD. |
| `cyber_visor` | headwear | specialQuote | 全息护额启动！正在以 240Hz 帧率扫描你的项目代码~ | Holo-visor online — scanning your project code at 240Hz~ |
| `phd_mortarboard` | headwear | name | 常春藤金穗学士帽 | Ivy Gold-Tassel Cap |
| `phd_mortarboard` | headwear | description | 实践者等级解锁！拨穗镀金流苏，自带满级学术 Buff。 | Practitioner-tier unlock! Gilded tassel with a max-level academic buff. |
| `phd_mortarboard` | headwear | specialQuote | 严谨求实，格物致知！这篇项目文档本博士龙给你打出 S+！ | Rigour and curiosity! This doc gets an S+ from Doctor Dino! |
| `crown_aurora` | headwear | name | ANS 极光星神王冠 | ANS Aurora Star-God Crown |
| `crown_aurora` | headwear | description | 构建者高阶荣耀！悬浮六芒星钻与极光流苏交织的传奇冠冕。 | Builder-tier honour! Legendary circlet of floating hexagram gems and aurora tassels. |
| `crown_aurora` | headwear | specialQuote | 头戴星神冠，整个 ANS 广场最闪耀的仔就是咱俩！ | With the Star-God crown, we two are the shiniest pair on the plaza! |
| `none` | eyewear | name | 澄澈萌眸 | Travel Light |
| `none` | eyewear | description | 毫无遮挡的布林布林大眼睛，眨眼卖萌杀伤力满分。 | Two little arms ready to applaud you any moment. |
| `none` | eyewear | specialQuote | 盯——用我 100% 纯真大眼睛看着你干活！ | These short arms can't reach the back of my head, but they can send you a heart! |
| `gold_glasses` | eyewear | name | 斯文金丝半框镜 | Scholarly Gold Half-Frames |
| `gold_glasses` | eyewear | description | 知识分子感拉满的玫瑰金细框眼镜，逻辑推理感 +100。 | Rose-gold thin frames with instant intellectual aura. Logic +100. |
| `gold_glasses` | eyewear | specialQuote | 推了推金丝眼镜，发现你刚刚偷懒了 3.14 秒哦~ | Adjusts glasses… I noticed you slacked off for exactly 3.14 seconds~ |
| `pixel_shades` | eyewear | name | DealWithIt 像素墨镜 | Deal-With-It Pixel Shades |
| `pixel_shades` | eyewear | description | 自带 BGM 的经典 8-bit 大佬墨镜，Bug 见了都得绕道走。 | Classic 8-bit boss shades with built-in BGM. Bugs take a detour. |
| `pixel_shades` | eyewear | specialQuote | 墨镜一戴，谁都不爱！这波代码直接一次编译通过！ | Shades on, nothing to fear — this code compiles first try! |
| `star_monocle` | eyewear | name | 星轨全息单片镜 | Star-Track Holo Monocle |
| `star_monocle` | eyewear | description | 创作者等级解锁！右眼悬浮翡翠全息星盘，洞察一切 Token 消耗。 | Creator-tier unlock! A jade holographic star chart hovering over the right eye, reading every token spent. |
| `star_monocle` | eyewear | specialQuote | 星轨单片镜锁定目标——这个项目的核心亮点已经被我拆穿啦！ | Monocle locked on — the core highlight of this project is exposed! |
| `starter_scarf` | neckwear | name | ANS 初创极客领巾 | ANS Starter Geek Scarf |
| `starter_scarf` | neckwear | description | 领养即赠的薄荷撞色小领巾，印有 AI Never Stops 徽章。 | Adoption gift: a mint two-tone scarf with the AI Never Stops badge. |
| `starter_scarf` | neckwear | specialQuote | 系紧小领巾，今天也是元气满满的 ANS 野生代言龙！ | Scarf tied tight — ANS's wildest unofficial mascot, full of energy! |
| `boba_jetpack` | neckwear | name | 吨吨冰美式外挂喷射包 | Double Iced-Americano Jetpack |
| `boba_jetpack` | neckwear | description | 背后背着双联装超大杯浓缩冰美式，边飞边续命。 | Twin oversized iced americanos strapped to the back. Refuel while flying. |
| `boba_jetpack` | neckwear | specialQuote | 冰美式喷射推进器点火！咖啡因浓度 100%，根本不知道什么叫困！ | Iced-americano thruster ignited! 100% caffeine — what is 'sleepy'? |
| `cyber_wings` | neckwear | name | 六翼光量子推进羽翼 | Six-Wing Photon Thrusters |
| `cyber_wings` | neckwear | description | 创作者等级解锁！半透明霓虹能量羽翼，飞行速度与帅气度拉爆。 | Creator-tier unlock! Translucent neon energy wings. Flight speed and style both maxed. |
| `cyber_wings` | neckwear | specialQuote | 光量子六翼展开！围绕你 360° 全景巡航护驾！ | Six photon wings out — circling you 360° as escort! |
| `pioneer_cape` | neckwear | name | ANS 先锋熔金星河披风 | ANS Vanguard Molten-Gold Cape |
| `pioneer_cape` | neckwear | description | 领航员殿堂级背饰！随飞行轨迹猎猎飘扬的流金星河斗篷。 | Navigator-tier backpiece! A flowing gold-dust galaxy cape trailing your flight path. |
| `pioneer_cape` | neckwear | specialQuote | 披风迎风猎猎作响——别怕，你的背后有整座 ANS 算力星河！ | Cape snapping in the wind — fear not, an entire ANS compute galaxy has your back! |
| `none` | handheld | name | 轻装上阵 | Clear Bright Eyes |
| `none` | handheld | description | 挥舞两只小短手随时准备给你鼓掌加油。 | Nothing in the way of those sparkling big eyes. Maximum cuteness damage. |
| `none` | handheld | specialQuote | 虽然小短手够不到后脑勺，但给你比心刚刚好！ | Stare — watching you work with 100% pure big eyes! |
| `magic_wand` | handheld | name | 零 Bug 祈愿仙女棒 | Zero-Bug Wish Wand |
| `magic_wand` | handheld | description | 挥一挥洒下金色星尘，专治各种玄学报错与排版错位。 | A wave scatters golden stardust; cures mysterious errors and broken layouts. |
| `magic_wand` | handheld | specialQuote | 巴啦啦能量——仙女棒一挥，所有报错全部退散！ | Bibbidi-bobbidi — one wave and every error retreats! |
| `gold_keyboard` | handheld | name | 冒火星子纯金机械键盘 | Spark-Spitting Solid-Gold Keyboard |
| `gold_keyboard` | handheld | description | 实践者等级解锁！段落青轴手感，被鞭策时敲击速度突破天际。 | Practitioner-tier unlock! Crisp tactile switches that hit escape velocity when you're pushed. |
| `gold_keyboard` | handheld | specialQuote | 啪嗒啪嗒啪嗒！这把黄金青轴键盘已经被我敲出残影啦！ | Clack clack clack — this golden keyboard is already a blur! |
| `floating_grimoire` | handheld | name | 全栈提示词悬浮魔导书 | Full-Stack Prompt Grimoire |
| `floating_grimoire` | handheld | description | 构建者等级解锁！自动翻页的赛博法典，封印着万千神级工作流。 | Builder-tier unlock! A self-turning cyber codex sealing thousands of elite workflows. |
| `floating_grimoire` | handheld | specialQuote | 翻开魔导书第七章——你要的满血 Agent 咒语已经吟唱完毕！ | Opening chapter seven — the full-throttle Agent incantation is ready! |
| `aura_mint` | aura | name | 薄荷初生星轨环 | Mint Genesis Ring |
| `aura_mint` | aura | description | 清新的双层翡翠薄荷悬浮法阵，伴随 6 颗呼吸星芒。 | A fresh double-layer jade mint array with six breathing sparks. |
| `aura_mint` | aura | specialQuote | 脚踩薄荷星环，连呼吸都是清爽的灵感味道~ | Standing on a mint starlit ring — even breathing tastes like ideas~ |
| `aura_sakura` | aura | name | 樱吹雪粉晶星阵 | Sakura Snow Crystal Array |
| `aura_sakura` | aura | description | 粉紫流光交织的落樱魔法阵，飞过之处尽是浪漫星尘。 | Pink-violet falling petals woven into a magic circle. Romantic stardust wherever it passes. |
| `aura_sakura` | aura | specialQuote | 樱花星阵转呀转，把好运和Offer全都转到你身边！ | Spinning sakura array — turning luck and offers your way! |
| `aura_gold` | aura | name | 熔金超频算力光环 | Molten-Gold Overdrive Halo |
| `aura_gold` | aura | description | 金色齿轮与高能粒子对撞环，象征永不停歇的 AI 算力。 | Golden gears colliding with high-energy particles — the symbol of never-stopping AI compute. |
| `aura_gold` | aura | specialQuote | 熔金光环全功率输出！AI Never Stops！ | Molten halo at full output! AI Never Stops! |
| `aura_aurora` | aura | name | 超新星量子星云环 | Supernova Quantum Nebula Ring |
| `aura_aurora` | aura | description | 极光蓝与星云紫双螺旋坍缩光环，先锋训龙师的终极排面。 | Aurora blue and nebula violet in a double-helix collapse halo — the ultimate flex for a vanguard trainer. |
| `aura_aurora` | aura | specialQuote | 脚踏超新星量子星云，陪你从 ANS 走向星辰大海！ | Riding a supernova nebula with you, from ANS to the stars! |

## 表 3：风格标签（5 条）

| 中文 | 建议英文 |
|---|---|
| 极客 | Geek |
| 甜酷 | Sweet-cool |
| 赛博 | Cyber |
| 学院 | Academic |
| 星神 | Star-God |

`rarity`（R / SR / SSR / UR）是代码化的档位，不翻译。

## 语气约定（供你判断我写得对不对）

- 保留小恐龙的"人设"：元气、嘴硬心软、高冷毒舌三条线在英文里要能听出区别（族群 `personality` 与 `whipLine` 是重点）；
- 不引入 AI 腔与黑话（对比 ANS 的禁用词表），不直译中文网络梗，但保留玩笑感；
- `mbti` 只翻译 MBTI 后面的中文描述（例如 `ENFP · 快乐小狗型` → `ENFP · Happy-puppy type`）；
- `specialQuote` 是换装时的台词，短、可朗读优先。

## 落地方式（批准后，纯机械）

1. 在 `DinoSpeciesDef` / `WardrobeItemDef` 增加可选 `*En` 字段（沿用 `BLIND_BOX_FOODS.nameZh/nameEn` 的既有约定）；
2. 界面按 `locale` 选择：`isZh ? item.name : item.nameEn ?? item.name`；
3. **不新增 i18n key** —— 与 `A-AGENT-03` 的口径一致：**界面文案**走 `messages/companion`，**目录数据**走双语字段；
4. 落地后加一条 parity 断言（`nameEn` 存在即非空、无残留中文），避免"部分翻译"回归。

## 未包含

- **工作模式（`display-name-editor.tsx`）的 162 行中文**：那是界面文案 + 示例产物，不是目录数据，另行开表；
- 示例产物里的中文（生成的 HTML 模板内容）属于"范例内容"，是否翻译另行决定。
