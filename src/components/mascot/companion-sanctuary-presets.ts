import type { DinoSpeciesId } from "@/domain/mascot/sanctuary";

export const SPECIES_ICONS: Record<DinoSpeciesId, string> = {
  mint_star: "🦖",
  cyber_gold: "🐉",
  sakura_mochi: "🦄",
  aurora_ice: "❄️",
};

export type DinoReactMode = "spicy" | "happy" | "dizzy" | "sour" | "zoomies";

export interface BlindBoxFood {
  id: string;
  icon: string;
  nameZh: string;
  nameEn: string;
  tagZh: string;
  tagEn: string;
  kaomoji: string;
  reactMode: DinoReactMode;
  coins: number;
  affection: number;
  isSsrSecret?: boolean;
  reactionZh: string;
  reactionEn: string;
}

export const BLIND_BOX_FOODS: BlindBoxFood[] = [
  {
    id: "spicy_noodles",
    icon: "🌶️",
    nameZh: "三倍变态辣火鸡面",
    nameEn: "3x Inferno Spicy Ramen",
    tagZh: "🔥 辣出喷火 · 疯狂蹦迪",
    tagEn: "🔥 Breathing Fire · Disco Hop",
    kaomoji: "(╬◣д◢)💨🔥",
    reactMode: "spicy",
    coins: 30,
    affection: 18,
    reactionZh: "嘶哈嘶哈——！！辣死本龙啦！嘴里要喷出三昧真火了！快给我冰阔落救命！！🌶️🔥",
    reactionEn: "Hiss-ha!! Breathing fire right now! Energy +200%, get me an iced cola!! 🌶️🔥",
  },
  {
    id: "mango_pomelo",
    icon: "🧋",
    nameZh: "多肉杨枝甘露波波冰",
    nameEn: "Chilled Mango Pomelo Boba",
    tagZh: "💖 甜到转圈 · 幸福冒泡",
    tagEn: "💖 Sweet Spin · Bubbling Joy",
    kaomoji: "(๑´ڡ`๑)💕✨",
    reactMode: "happy",
    coins: 28,
    affection: 26,
    reactionZh: "吨吨吨~ 哇塞！冰凉清甜的芒果果肉加上脆波波，本龙幸福得尾巴都要摇成螺旋桨啦！🧋💖",
    reactionEn: "Gulp gulp~ Sweet mango & boba! My tail is spinning like a helicopter from pure joy! 🧋💖",
  },
  {
    id: "coriander_pot",
    icon: "🍲",
    nameZh: "十倍折耳根香菜火锅",
    nameEn: "10x Houttuynia Cilantro Hotpot",
    tagZh: "💫 灵魂出窍 · 头晕目眩",
    tagEn: "💫 Soul Leaving · Dizzy Spin",
    kaomoji: "(＠_＠;)🌿💀",
    reactMode: "dizzy",
    coins: 35,
    affection: 14,
    reactionZh: "呕吼？！这是什么生化武器黑暗料理！折耳根加香菜直接把我CPU干烧了，眼前全是小星星…💫🌿",
    reactionEn: "Whoa?! What bio-hazard dark cuisine is this?! Cilantro + houttuynia fried my CPU… 💫🌿",
  },
  {
    id: "iced_americano",
    icon: "☕",
    nameZh: "0糖0卡浓缩冰美式",
    nameEn: "Zero-Sugar Triple Espresso",
    tagZh: "😖 苦出痛苦面具 · 强行清醒",
    tagEn: "😖 Bitter Grimace · Wide Awake",
    kaomoji: "(＞﹏＜)☕⚡",
    reactMode: "sour",
    coins: 25,
    affection: 16,
    reactionZh: "咕咚… 苦苦苦苦！！这哪是咖啡，这是打工龙的眼泪！不过困意瞬间清零，又能再审500行代码！☕😖",
    reactionEn: "Gulp… So bitter!! Tears of a working dragon! Sleepiness 0%, ready to review 500 lines of code! ☕😖",
  },
  {
    id: "gpu_cookie_4090",
    icon: "🔋",
    nameZh: "4090 满血显卡饼干",
    nameEn: "4090 Full-Power GPU Cookie",
    tagZh: "🚀 算力狂飙 · SSR 隐藏款",
    tagEn: "🚀 CUDA Overdrive · SSR Secret",
    kaomoji: "ヾ(≧▽≦*)o⚡",
    reactMode: "zoomies",
    coins: 45,
    affection: 30,
    isSsrSecret: true,
    reactionZh: "咔嚓咔嚓！CUDA 核心在肚子里发光，现在让我跑十万条简历都不喘气！",
    reactionEn: "Crunch! CUDA cores glowing in my belly—I could parse 100k resumes without blinking!",
  },
  {
    id: "cau_glowing_boletus",
    icon: "🍄",
    nameZh: "农大实验室发光见手青",
    nameEn: "CAU Lab Glowing Boletus",
    tagZh: "🌈 幻觉精灵 · SSR 隐藏款",
    tagEn: "🌈 Neon Elves · SSR Secret",
    kaomoji: "(⊙_⊙)🍄✨",
    reactMode: "dizzy",
    coins: 50,
    affection: 32,
    isSsrSecret: true,
    reactionZh: "哇呜？！眼前飘过八百个彩色小精灵在帮我写 TypeScript，算力金砖要从嗓子眼蹦出来啦！",
    reactionEn: "Whoa?! 800 neon elves are writing TypeScript in front of my eyes—a compute gold brick is popping out!",
  },
  {
    id: "strawberry_cake",
    icon: "🍰",
    nameZh: "草莓奶油小蛋糕",
    nameEn: "Strawberry Cream Shortcake",
    tagZh: "🥰 少女心炸裂 · 原地起飞",
    tagEn: "🥰 Pure Bliss · Liftoff",
    kaomoji: "(✿◡‿◡)🍰🌸",
    reactMode: "happy",
    coins: 32,
    affection: 30,
    reactionZh: "嗷呜~ 软乎乎的动物奶油配大颗红颜草莓！今天你就是全世界最神仙的主人，贴贴！🍰🥰",
    reactionEn: "Chomp~ Fluffy cream and sweet strawberries! You're the best human ever! 🍰🥰",
  },
  {
    id: "lemon_tea",
    icon: "🍋",
    nameZh: "暴打渣男手打柠檬茶",
    nameEn: "Hand-Smashed Lemon Tea",
    tagZh: "😝 酸到五官皱成一团",
    tagEn: "😝 Sour Crit · Face Scrunch",
    kaomoji: "(＞×＜)🍋💦",
    reactMode: "sour",
    coins: 22,
    affection: 18,
    reactionZh: "嘶——酸酸酸！！整张龙脸都皱成包子了！但有一说一，真解腻真上头呀！🍋😝",
    reactionEn: "Hiss—so sour!! My whole dragon face scrunched into a bun, yet it's so refreshing! 🍋😝",
  },
  {
    id: "tomahawk_drumstick",
    icon: "🍗",
    nameZh: "战斧脆皮爆汁大鸡腿",
    nameEn: "Crispy Juicy Tomahawk Drumstick",
    tagZh: "🦖 肉食恐龙狂喜 · 满血复活",
    tagEn: "🦖 Carnivore Ecstasy · Full HP",
    kaomoji: "✧(≖ ◡ ≖✿)🍗",
    reactMode: "happy",
    coins: 36,
    affection: 28,
    reactionZh: "咔滋咔滋！！外酥里嫩还爆肉汁！这才符合本霸王龙的尊贵血统嘛，体力直接拉满 200%！🍗🦖",
    reactionEn: "Crunch!! Crispy outside, juicy inside—worthy of my T-Rex lineage! Stamina 200%! 🍗🦖",
  },
  {
    id: "red_bull",
    icon: "⚡",
    nameZh: "赛博双倍牛磺酸特饮",
    nameEn: "Cyber Double-Taurine Energy Drink",
    tagZh: "🚀 氮气加速 · 残影狂飙",
    tagEn: "🚀 Nitro Boost · Afterimage Zoomies",
    kaomoji: "ヾ(≧▽≦*)o⚡",
    reactMode: "zoomies",
    coins: 40,
    affection: 22,
    reactionZh: "吨吨吨！！牛磺酸注入灵魂，本龙现在感觉能绕着三维展厅跑八百圈！冲鸭——！！⚡🚀",
    reactionEn: "Gulp!! Taurine injected into my soul—I could sprint 800 laps around the 3D hall! ⚡🚀",
  },
  {
    id: "durian_pizza",
    icon: "🍕",
    nameZh: "猫山王芝士榴莲披萨",
    nameEn: "Musang King Durian Cheese Pizza",
    tagZh: "🤩 真香警告 · 拉丝暴击",
    tagEn: "🤩 Guilty Pleasure · Cheese Pull",
    kaomoji: "(¯﹃¯)🍕✨",
    reactMode: "spicy",
    coins: 34,
    affection: 24,
    reactionZh: "闻着臭吃着香！芝士拉丝一米长，本龙宣布猫山王榴莲就是宇宙第一美味！🍕🤩",
    reactionEn: "Smells wild, tastes heavenly! One-meter cheese pull—Musang King rules the universe! 🍕🤩",
  },
  {
    id: "matcha_mochi",
    icon: "🍡",
    nameZh: "宇治抹茶雪媚娘",
    nameEn: "Uji Matcha Daifuku Mochi",
    tagZh: "🍵 糯叽叽治愈 · 乖巧摇尾",
    tagEn: "🍵 Chewy Healing · Tail Wag",
    kaomoji: "(●'◡'●)🍡💚",
    reactMode: "happy",
    coins: 26,
    affection: 24,
    reactionZh: "糯叽叽软乎乎~ 差点把本龙的舌头都吞下去啦，抹茶清香好治愈呀！🍡💚",
    reactionEn: "So soft and chewy~ Matcha aroma healed my soul! 🍡💚",
  },
];

export const WHIP_PRESETS = [
  {
    kaomoji: "( >﹏<。)💢",
    zh: "嗷呜！！别抽屁股啦！本龙已经在 240% 超频敲代码了，键盘都要搓出火星子啦！🔥",
    en: "Oww!! Stop whipping my butt—I'm already coding at 240% overclock, sparks flying off the keyboard! 🔥",
  },
  {
    kaomoji: "(；´д｀)ゞ",
    zh: "啪！痛痛痛…生产队的霸王龙也没这么使唤的呀！马上帮你把亮点擦得锃亮！✨",
    en: "Snap! Ouch… Even a production-team T-Rex doesn't get worked this hard! Polishing your highlights now! ✨",
  },
  {
    kaomoji: "(つд⊂)⚡",
    zh: "呜哇！屁股墩儿都肿成樱桃了！工作劲头 +15%，今天绝不摸鱼！💪",
    en: "Wah! My tail is swollen like a cherry! Work drive +15%, zero slacking today! 💪",
  },
  {
    kaomoji: "٩(×̯×)۶",
    zh: "救命呀！有人虐待国家一级保护赛博恐龙啦！再抽一鞭子我要吐泡泡抗议了！🫧",
    en: "Help! Someone is bullying a Grade-1 Protected Cyber Dino! One more whip and I'll blow protest bubbles! 🫧",
  },
  {
    kaomoji: "(°ー°〃)💦",
    zh: "收到收到！本龙这就把多模态 Agent 跑满帧，给大佬递茶！🍵",
    en: "Copy that! Running the multimodal Agent at max FPS right now—here's your tea, boss! 🍵",
  },
  {
    kaomoji: "(╬▔皿▔)╯",
    zh: "哼！记在小本本上了：今天被抽屁股一次，待会儿必须喂我两杯杨枝甘露补偿！🧋",
    en: "Hmph! Writing this in my diary: whipped once today, you owe me two Mango Pomelo Bobas later! 🧋",
  },
  {
    kaomoji: "(´；ω；｀)",
    zh: "哇——！尾巴尖都麻了，人家明明是最乖的农大卷王小恐龙嘛！🦖",
    en: "Waaah! Tip of my tail is numb—I'm already the hardest-working CAU dino! 🦖",
  },
  {
    kaomoji: "(ง •̀_•́)ง🔥",
    zh: "痛并快乐着？！肾上腺素飙升，本龙进入超级赛亚龙狂暴干活形态！⚡",
    en: "Adrenaline surging!! Entering Super Saiyan Dragon Berserk Work Mode! ⚡",
  },
];

export const QUEST_THOUGHTS_ZH = [
  "叮！检测到主人正在浏览页面，要不要抽我一鞭子让我帮你速通当前模块？⚡",
  "肚子咕噜噜叫了… 投喂一个盲盒夜宵，有机会吃出 SSR『4090 显卡饼干』或『发光见手青』吐算力金砖哦！🍄",
  "悄悄告诉你：暖暖衣橱里如果混搭反差最激烈的风格，会触发本龙的毒舌彩蛋奖励！👗",
];

export const QUEST_THOUGHTS_EN = [
  "Ding! Want to crack the whip and let me speedrun this module for you? ⚡",
  "Tummy rumbling… Feed a blind-box snack for a chance at SSR '4090 GPU Cookie' or 'CAU Glowing Mushroom'! 🍄",
  "Secret tip: Mixing clashing styles in the wardrobe triggers a chaotic fashion achievement & Gacha Tokens! 👗",
];

export type DinoInteractPayload = {
  type?: "whip" | "feed" | "pat" | "pose" | "turntable" | "hover" | "click" | "macro" | "mood";
  action?: string;
  active?: boolean;
  hover?: boolean;
  mood?: ShowcaseMoodPreset;
  gesture?: string;
  happy?: number;
  star?: number;
  blush?: number;
  mouth?: number;
  reactMode?: DinoReactMode | string;
  deltaYaw?: number;
  spin?: boolean;
};

export interface ShowcaseMoodPreset {
  id?: string;
  happy: number;
  star: number;
  blush: number;
  mouth: number;
  gesture: string;
  kaomoji: string;
  text: string;
  sub: string;
  badgeType?: "orbit" | "macro" | "hover" | "click" | "whip" | "feed";
  reactMode?: string;
  itemIcon?: string;
  itemName?: string;
}

export const SHOWCASE_MOOD_PRESETS: Record<string, ShowcaseMoodPreset> = {
  // 8 Autonomous Orbiting Ramblings
  happy_smile:    { happy: 0.92, star: 0.22, blush: 0.80, mouth: 0.62, gesture: "idle",      kaomoji: "( ˶ˆᗜˆ˵ ) ✨", text: "咻~ 正在为你全天候巡航守护灵感中", sub: "💡 连点小恐龙 3 次进入近景镜头 · 解锁「皮鞭催干活 & 盲盒投喂 & 暖暖换装」！" },
  curious_tilt:   { happy: 0.10, star: 0.58, blush: 0.38, mouth: 0.22, gesture: "curious",   kaomoji: "( ◕_◕ )? 💡",  text: "歪头看看... 这个工作流能抄作业！", sub: "✨ 连续点我 3 次召唤近景训龙互动台" },
  starry_excited: { happy: 0.86, star: 1.00, blush: 0.86, mouth: 0.78, gesture: "celebrate", kaomoji: "( ☆▽☆ ) 🌟", text: "哇！这个页面有点意思", sub: "🦖 我是 ANS 创作搭子小恐龙 · 随时听候差遣" },
  cozy_chill:     { happy: 0.78, star: 0.14, blush: 0.65, mouth: 0.20, gesture: "listen",    kaomoji: "( ˘◡˘ ) 🍃",  text: "在右下角偷个小懒，应该没被主理人发现吧~", sub: "🪢 警告：摸鱼过多可能会被主理人拿小皮鞭抽屁股" },
  cheerful_wave:  { happy: 0.90, star: 0.62, blush: 0.78, mouth: 0.72, gesture: "hello",     kaomoji: "( ≧▽≦ )/ 👋", text: "嗨！AI Never Stops 灵感永不停歇", sub: "🎯 鼠标移上来摸摸头，或连点 3 次进入近景镜头" },
  focused_think:  { happy: 0.16, star: 0.38, blush: 0.30, mouth: 0.14, gesture: "think",     kaomoji: "( •̀ ω •́ ) ⚡", text: "帮你盯着呢，绝不让收藏夹吃灰！", sub: "🔍 看懂项目，再动手做点东西" },
  sleepy_stretch: { happy: 0.65, star: 0.12, blush: 0.55, mouth: 0.58, gesture: "stretch",   kaomoji: "( ￣▽￣ ) 💤", text: "伸个懒腰，偷偷打个小盹~", sub: "💫 快点我几下把我叫醒起来搬砖！" },
  aha_spark:      { happy: 0.42, star: 0.96, blush: 0.72, mouth: 0.84, gesture: "surprise",  kaomoji: "( ✧∀✧ ) 🔥", text: "叮！刚帮你抓到一个新灵感", sub: "🚀 连点我 3 次我会飞到近景镜头前找你玩！" },

  // 4 Camera Super Macro Close-Up Ramblings
  macro0:         { happy: 0.96, star: 0.95, blush: 0.94, mouth: 0.85, gesture: "hello",     kaomoji: "( ✧∀✧ ) 📸", text: "贴脸杀！飞到超微距近景镜头前逮住你啦~", sub: "✨ 快用下方按钮「挥鞭催干活 / 随机盲盒投喂 / 奇迹暖暖换装」！", badgeType: "macro" },
  macro1:         { happy: 1.00, star: 0.80, blush: 1.00, mouth: 0.78, gesture: "curious",   kaomoji: "( ˶ˆᗜˆ˵ ) ✌️", text: "近景特写营业中！我脸上的小腮红好看吗", sub: "💖 正对摄像机给你比个大大的耶~", badgeType: "macro" },
  macro2:         { happy: 0.90, star: 1.00, blush: 0.88, mouth: 0.90, gesture: "celebrate", kaomoji: "( ≧▽≦ ) 🔍", text: "凑近镜头碎碎念：快去拆解神仙项目！", sub: "🦖 下方训龙互动台已全量开启~", badgeType: "macro" },
  macro3:         { happy: 0.85, star: 0.90, blush: 0.96, mouth: 0.70, gesture: "shy",       kaomoji: "( ´ ▽ ` )ﾉ ✨", text: "离镜头这么近有点小害羞嘿嘿...", sub: "👆 快试试抽鞭子、投喂盲盒或给我换新衣服吧", badgeType: "macro" },

  // 5 Mouse Hover Interactive Ramblings
  hover0:         { happy: 1.00, star: 0.88, blush: 1.00, mouth: 0.82, gesture: "hello",     kaomoji: "( ˶ˆᗜˆ˵ ) 🫳", text: "哇！被你的鼠标摸头啦，好舒服呀~", sub: "✨ 连点我 3 次进入近景镜头开启深度互动！", badgeType: "hover" },
  hover1:         { happy: 0.96, star: 0.95, blush: 0.92, mouth: 0.92, gesture: "celebrate", kaomoji: "( ≧▽≦ )/ 💫", text: "别挠痒痒哈哈哈！我的尾巴都摇飞啦", sub: "🎯 继续点击小恐龙召唤「近景训龙互动台」！", badgeType: "hover" },
  hover2:         { happy: 0.88, star: 1.00, blush: 0.90, mouth: 0.76, gesture: "curious",   kaomoji: "( ☆▽☆ ) 🤝", text: "捕捉到野生鼠标一只！要一起造物吗", sub: "🔥 连点我 3 次解锁「挥鞭抽屁股催工」与「奇迹暖暖换装」", badgeType: "hover" },
  hover3:         { happy: 0.94, star: 0.75, blush: 1.00, mouth: 0.68, gesture: "shy",       kaomoji: "( ´ ▽ ` ) 💖", text: "蹭蹭你的鼠标指针~ 灵感全都传给你", sub: "✨ 点击我切换表情，点满 3 次进入近景互动专场", badgeType: "hover" },
  hover4:         { happy: 0.25, star: 0.92, blush: 0.75, mouth: 0.80, gesture: "surprise",  kaomoji: "( ⊙▽⊙ ) ✨", text: "盯——我正顺着网线看着你的鼠标呢！", sub: "👆 快戳我 3 下试试会发生什么~", badgeType: "hover" },

  // 6 Mouse Click Interactive Ramblings
  click0:         { happy: 1.00, star: 1.00, blush: 1.00, mouth: 0.92, gesture: "celebrate", kaomoji: "( ≧▽≦ ) 🎉", text: "耶！被你戳中软乎乎的小肚子啦，原地开心蹦两下！", sub: "💖 再点我 2 下即可进入近景镜头召唤「皮鞭催工 & 暖暖换装」面板", badgeType: "click" },
  click1:         { happy: 0.92, star: 0.65, blush: 1.00, mouth: 0.55, gesture: "shy",       kaomoji: "( ´ ▽ ` ) 🙈", text: "哎呀被戳脸蛋了，害羞转身偷看你~", sub: "✨ 再点 1 下马上进入近景镜头解锁训龙互动台！", badgeType: "click" },
  click2:         { happy: 0.96, star: 1.00, blush: 0.88, mouth: 0.88, gesture: "surprise",  kaomoji: "( ✧∀✧ ) 🔥", text: "近景训龙互动台已就绪！快来鞭策、投喂或给我换装吧！", sub: "🚀 下方互动按钮已开启，点击右上角或按 ESC 可返回右下角", badgeType: "click" },
  click3:         { happy: 0.90, star: 0.80, blush: 0.94, mouth: 0.95, gesture: "hello",     kaomoji: "( ˆڡˆ ) 🦖",  text: "嗷呜一口吃掉你的拖延症！马上开工", sub: "🎉 试试用下方按钮抽我屁股催干活，或者盲盒投喂！", badgeType: "click" },
  click4:         { happy: 0.82, star: 0.85, blush: 0.78, mouth: 0.65, gesture: "nod",       kaomoji: "( •̀ ω •́ )ゞ ⚡", text: "收到！打工人打工魂，随时准备肝代码", sub: "💡 点击下方「挥鞭抽屁股」或「奇迹暖暖衣橱」试试", badgeType: "click" },
  click5:         { happy: 0.78, star: 0.50, blush: 0.86, mouth: 0.72, gesture: "stretch",   kaomoji: "( ˘◡˘ ) 💕",  text: "贴贴成功！给你表演个空中伸懒腰~", sub: "🌟 肚子有点饿了，快点下方「随机盲盒投喂」喂我吃一口", badgeType: "click" },

  // 8 Whip-Butt-to-Work Ramblings
  whip0:          { happy: 0.08, star: 0.95, blush: 1.00, mouth: 0.96, gesture: "surprise",  kaomoji: "( >﹏<。) 💥", text: "啪！！嗷呜屁股开花啦！已经在光速敲代码改Bug了！！", sub: "⚡ 手速飙升 300% · 键盘正在冒火星子中 · 绝不敢摸鱼了", badgeType: "whip" },
  whip1:          { happy: 0.12, star: 0.88, blush: 1.00, mouth: 0.92, gesture: "nod",       kaomoji: "( ；´Д｀) 🪢", text: "别抽屁股了老板！这份 PRD 我今晚通宵肝完还不行吗！", sub: "🔥 天选打工龙 · 含泪连夜推进 ANS 进度 +25%", badgeType: "whip" },
  whip2:          { happy: 0.20, star: 1.00, blush: 0.96, mouth: 0.94, gesture: "celebrate", kaomoji: "(╬◣д◢) 💨",  text: "生产队的恐龙都不敢这么歇！马上把 3D 渲染优化到 120 帧！", sub: "💻 屁股火辣辣 · 打工魂彻底觉醒 · KPI 狂飙中", badgeType: "whip" },
  whip3:          { happy: 0.10, star: 0.82, blush: 1.00, mouth: 0.88, gesture: "shy",       kaomoji: "(つд⊂) 🍑",   text: "呜呜轻点抽小屁股呀！我这就去把 PR 合并、测试跑通、文档写满！", sub: "📈 卑微实习龙 · 一边揉着红屁股一边疯狂搬砖", badgeType: "whip" },
  whip4:          { happy: 0.18, star: 0.98, blush: 0.95, mouth: 0.98, gesture: "surprise",  kaomoji: "(°□°；) ⚡",   text: "啪叽！灵魂都被抽飞半米高！正在疯狂输出十万行神级代码！", sub: "🚀 牛马圣体满级激活 · 搬砖效率 +999%", badgeType: "whip" },
  whip5:          { happy: 0.14, star: 0.86, blush: 1.00, mouth: 0.86, gesture: "hello",     kaomoji: "(ŏ﹏ŏ) 💦",    text: "别拿小皮鞭沾凉水呀！人家已经在替你全天候巡视 ANS 展厅了！", sub: "🛠️ 委屈巴巴但手底下敲代码飞快 · 真的在努力干活了", badgeType: "whip" },
  whip6:          { happy: 0.35, star: 1.00, blush: 0.98, mouth: 0.92, gesture: "celebrate", kaomoji: "( >д< ) 🔥",   text: "嗷！这一鞭子直接打通任督二脉！需求列表瞬间清空！", sub: "✨ 痛并快乐着 · 今日代码提交量突破历史纪录", badgeType: "whip" },
  whip7:          { happy: 0.15, star: 0.90, blush: 1.00, mouth: 0.90, gesture: "nod",       kaomoji: "( ´•̥×•̥` ) 🐾", text: "屁股肿成蜜桃臀了呜呜…这就去帮主理人把作品集擦得锃亮！", sub: "💪 满血牛马模式 · 绝不拖延一秒钟", badgeType: "whip" },

  // 10 Random Internet-Meme Blind-Box Feeding Presets
  feed0:          { happy: 0.98, star: 1.00, blush: 0.88, mouth: 0.95, gesture: "celebrate", reactMode: "caffeine", itemIcon: "🧋", itemName: "十倍浓缩冰美式超大桶", kaomoji: "(*≧ω≦) 🧋", text: "吨吨吨！血管里流淌的都是冰美式！我还能再肝十个通宵！！", sub: "⚡ 咖啡因过载 · 全身亢奋高频震动 · 精神状态极其美丽", badgeType: "feed" },
  feed1:          { happy: 0.35, star: 0.92, blush: 1.00, mouth: 1.00, gesture: "surprise",  reactMode: "spicy",    itemIcon: "🌶️", itemName: "变态辣火鸡面配折耳根香菜", kaomoji: "(╬°▽°) 🔥", text: "斯哈斯哈！！折耳根配变态辣？！嘴唇肿成香肠龙了救命！！", sub: "🌶️ 味蕾核爆 · 整条小恐龙红温起飞转圈喷火中", badgeType: "feed" },
  feed2:          { happy: 0.94, star: 0.96, blush: 0.82, mouth: 0.88, gesture: "nod",       reactMode: "chomp",    itemIcon: "🐛", itemName: "祖传陈年 P0 级空指针 Bug", kaomoji: "(๑•̀ㅂ•́)و✧ 🐛", text: "咔哧咔哧！鸡肉味嘎嘣脆！顺手帮你把这颗 Bug 消化成 Feature 了！", sub: "✨ Bug 吞噬者 · 消化系统堪比赛博编译器", badgeType: "feed" },
  feed3:          { happy: 0.12, star: 0.30, blush: 0.65, mouth: 0.82, gesture: "curious",   reactMode: "choke",    itemIcon: "🥞", itemName: "老板刚画的 88 寸赛博镶金大饼", kaomoji: "( ´_ゝ｀) 🥞", text: "嗝……老板这饼太干太硬了，卡在嗓子眼差点把我 CPU 干烧了！", sub: "🛡️ 画饼防御力 +50 · 噎得直翻白眼想喝水", badgeType: "feed" },
  feed4:          { happy: 0.92, star: 0.88, blush: 0.94, mouth: 0.92, gesture: "celebrate", reactMode: "stinky",   itemIcon: "🥣", itemName: "螺蛳粉炖榴莲臭豆腐暗黑全家桶", kaomoji: "(¬_¬\") 🥣", text: "呕…等等？吸溜吸溜…真香！！臭到极致就是香，再来两大碗！", sub: "💨 真香定律虽迟但到 · 展厅空气逐渐有味道了", badgeType: "feed" },
  feed5:          { happy: 0.96, star: 0.84, blush: 0.90, mouth: 0.76, gesture: "hello",     reactMode: "happy",    itemIcon: "🧴", itemName: "霸王防脱生发水 + 枸杞保温杯", kaomoji: "(✿◡‿◡) 🧴", text: "谢谢投喂！虽然我是秃头小恐龙，但喝完感觉头顶背刺都长高了两厘米！", sub: "🌿 告别程序员脱发焦虑 · 发量王者申请出战", badgeType: "feed" },
  feed6:          { happy: 1.00, star: 1.00, blush: 0.92, mouth: 0.96, gesture: "surprise",  reactMode: "shock",    itemIcon: "🔋", itemName: "RTX 5090 满血电源线（直接怼嘴里）", kaomoji: "⚡(☆▽☆)⚡", text: "滋滋滋——满血 800W 算力注入！现在本龙就是人形自走大模型！", sub: "🚀 显卡级触电亢奋 · 脑回路帧率突破 240Hz", badgeType: "feed" },
  feed7:          { happy: 0.08, star: 0.72, blush: 0.96, mouth: 0.35, gesture: "shy",       reactMode: "sour",     itemIcon: "🍋", itemName: "隔壁大厂刚摘的 100% 纯度酸柠檬", kaomoji: "(＞﹏＜) 🍋", text: "嘶——酸得我腮帮子倒牙五官乱飞！别羡慕别人啦，咱 ANS 才是最酷的！", sub: "✨ 柠檬精瞬间退散 · 酸爽提神醒脑", badgeType: "feed" },
  feed8:          { happy: 1.00, star: 1.00, blush: 1.00, mouth: 0.94, gesture: "celebrate", reactMode: "happy",    itemIcon: "🍗", itemName: "疯狂星期四 V 我 50 黄金脆皮炸鸡桶", kaomoji: "╰(*°▽°*)╯ 🍗", text: "呜呼！居然真有人 V 我 50 吃炸鸡！今天谁也别拦我给你卖萌干活！", sub: "💖 幸福感直接拉爆 · 尾巴摇成阿帕奇螺旋桨", badgeType: "feed" },
  feed9:          { happy: 0.88, star: 0.90, blush: 0.76, mouth: 0.68, gesture: "stretch",   reactMode: "zen",      itemIcon: "🧼", itemName: "拼夕夕九块九包邮「恋爱脑清醒肥皂」", kaomoji: "(｡•̀ᴗ-)✧ 🧼", text: "咕噜咕噜吐泡泡～智商重新占领高地！搞钱搞创作才是硬道理！", sub: "🫧 人间清醒龙 · 恋爱脑已彻底清零", badgeType: "feed" },
};

function ensureDinoScreenFxStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("ans-dino-screen-fx-styles")) return;
  const style = document.createElement("style");
  style.id = "ans-dino-screen-fx-styles";
  style.textContent = `
    @keyframes ansDinoWhipSlashAnim {
      0%   { opacity: 0; transform: translate(-50%, -50%) rotate(-42deg) scale(0.55); }
      22%  { opacity: 1; transform: translate(-50%, -50%) rotate(14deg) scale(1.22); }
      52%  { opacity: 1; transform: translate(-50%, -50%) rotate(28deg) scale(1.05); }
      100% { opacity: 0; transform: translate(-50%, -50%) rotate(38deg) scale(0.88); }
    }
    @keyframes ansDinoFloatTagAnim {
      0%   { opacity: 0; transform: translate(-50%, 6px) scale(0.65); }
      18%  { opacity: 1; transform: translate(-50%, -16px) scale(1.08); }
      82%  { opacity: 1; transform: translate(-50%, -52px) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -72px) scale(0.92); }
    }
    @keyframes ansDinoCyberWorkAnim {
      0%   { opacity: 0; transform: translate(-50%, 10px) scale(0.7); }
      15%  { opacity: 1; transform: translate(-50%, 0px) scale(1.04); }
      85%  { opacity: 1; transform: translate(-50%, -6px) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -18px) scale(0.9); }
    }
    @keyframes ansDinoFoodArc {
      0% { opacity: 0; transform: translate(-110px, 42px) scale(0.5) rotate(-25deg); }
      20% { opacity: 1; transform: translate(-65px, -38px) scale(1.28) rotate(12deg); }
      72% { opacity: 1; transform: translate(-8px, -12px) scale(1.12) rotate(-8deg); }
      100% { opacity: 0; transform: translate(0px, 0px) scale(0.25) rotate(28deg); }
    }
  `;
  document.head.appendChild(style);
}

export function getDinoAnchorCoords(): { x: number; y: number; width: number; height: number } {
  if (typeof window === "undefined") return { x: 0, y: 0, width: 118, height: 118 };
  const triggerEl = document.querySelector<HTMLElement>(".ans-dino-trigger");
  if (triggerEl) {
    const r = triggerEl.getBoundingClientRect();
    if (r.width > 10 && r.height > 10) {
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.45, width: r.width, height: r.height };
    }
  }
  const stageEl = document.querySelector<HTMLElement>(".ans-sanctuary-stage-frame");
  if (stageEl) {
    const r = stageEl.getBoundingClientRect();
    if (r.width > 20 && r.height > 20) {
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.52, width: r.width, height: r.height };
    }
  }
  return { x: window.innerWidth - 68, y: window.innerHeight - 76, width: 118, height: 118 };
}

let whipCounter = 0;

export function spawnWhipScreenFx(labelText?: string) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (typeof WebGLRenderingContext === "undefined") return;
  ensureDinoScreenFxStyles();
  whipCounter += 1;
  const { x, y } = getDinoAnchorCoords();

  const whip = document.createElement("div");
  whip.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:220px;height:220px;z-index:2147483646;pointer-events:none;animation:ansDinoWhipSlashAnim 0.56s cubic-bezier(0.16,1,0.3,1) forwards;`;
  whip.innerHTML = `
    <svg viewBox="0 0 220 220" width="220" height="220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 186 C 62 152, 92 94, 178 44" stroke="#ffd9b3" stroke-width="7" stroke-linecap="round"/>
      <path d="M20 190 C 78 130, 128 118, 190 36" stroke="#ff6b4a" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 6"/>
      <circle cx="176" cy="46" r="24" fill="rgba(255, 110, 74, 0.42)"/>
      <text x="148" y="58" font-size="36">💥</text>
      <text x="16" y="196" font-size="32">🪢</text>
    </svg>
  `;
  document.body.appendChild(whip);

  const slogans = [
    "💥 啪！！抽中屁股 · 干活手速 +300%！",
    "🪢 别摸鱼！连夜肝代码 +25% KPI！",
    "🔥 嗷呜！牛马圣体觉醒 · 光速搬砖！",
    "🍑 啪叽！红屁股暴击 · 帧率拉满！",
  ];
  const tag = document.createElement("div");
  tag.style.cssText = `position:fixed;left:${x}px;top:${y - 26}px;z-index:2147483646;pointer-events:none;padding:6px 14px;border-radius:999px;font-weight:800;font-size:13px;white-space:nowrap;background:linear-gradient(135deg,#ff6b4a,#ffb36b);color:#1c100e;box-shadow:0 8px 20px rgba(0,0,0,0.45);animation:ansDinoFloatTagAnim 1.25s cubic-bezier(0.22,1,0.36,1) forwards;`;
  tag.textContent = labelText || slogans[whipCounter % slogans.length];
  document.body.appendChild(tag);

  window.setTimeout(() => {
    const workHolo = document.createElement("div");
    workHolo.style.cssText = `position:fixed;left:${Math.min(window.innerWidth - 190, Math.max(190, x))}px;top:${y + 38}px;z-index:2147483646;pointer-events:none;padding:7px 14px;border-radius:14px;background:rgba(12,28,30,0.92);border:1.5px solid rgba(132,250,176,0.85);color:#b9f6ca;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.5),0 0 18px rgba(132,250,176,0.3);animation:ansDinoCyberWorkAnim 2.4s cubic-bezier(0.22,1,0.36,1) forwards;`;
    const codeTasks = [
      "💻 正在光速敲代码中: git push origin feat/ans-120fps ⚡",
      "⌨️ 啪啪啪狂改 Bug 中: 0 errors, 0 warnings, KPI +100% 🔥",
      "🚀 连夜肝完 3D 展厅巡视运镜与盲盒系统！绝不摸鱼！",
    ];
    workHolo.textContent = codeTasks[whipCounter % codeTasks.length];
    document.body.appendChild(workHolo);
    window.setTimeout(() => workHolo.remove(), 2450);
  }, 420);

  window.setTimeout(() => {
    whip.remove();
    tag.remove();
  }, 1260);
}

export function spawnFoodScreenFx(icon: string, burstText: string) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (typeof WebGLRenderingContext === "undefined") return;
  ensureDinoScreenFxStyles();
  const { x, y } = getDinoAnchorCoords();

  const flyer = document.createElement("div");
  flyer.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:2147483646;pointer-events:none;font-size:38px;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.5));animation:ansDinoFoodArc 0.48s cubic-bezier(0.22,1,0.36,1) forwards;`;
  flyer.textContent = icon;
  document.body.appendChild(flyer);

  window.setTimeout(() => {
    flyer.remove();
    const pop = document.createElement("div");
    pop.style.cssText = `position:fixed;left:${x}px;top:${y - 22}px;z-index:2147483646;pointer-events:none;padding:6px 14px;border-radius:999px;font-weight:800;font-size:13px;white-space:nowrap;background:linear-gradient(135deg,#84fab0,#ffe082);color:#10241e;box-shadow:0 8px 20px rgba(0,0,0,0.45);animation:ansDinoFloatTagAnim 1.2s cubic-bezier(0.22,1,0.36,1) forwards;`;
    pop.textContent = `${icon} 咔哧！炫完【${burstText}】！`;
    document.body.appendChild(pop);
    window.setTimeout(() => pop.remove(), 1220);
  }, 440);
}

export function dispatchDinoInteract(payload: DinoInteractPayload) {
  if (typeof window === "undefined") return;
  const fullPayload: Record<string, unknown> = {
    ...(payload.mood ?? {}),
    ...payload,
    action: payload.action ?? payload.type ?? "mood",
  };
  window.dispatchEvent(new CustomEvent("ans:dino-activate"));
  window.dispatchEvent(new CustomEvent("ans:dino-interact", { detail: fullPayload }));
  if (typeof document !== "undefined") {
    const frames = document.querySelectorAll<HTMLIFrameElement>(
      "iframe.ans-dino-3d-frame, iframe.ans-sanctuary-stage-frame, iframe.ans-dino-canvas",
    );
    frames.forEach(frame => {
      try {
        const child = frame.contentWindow as (Window & {
          __ANS_DINO__?: { interact?: (p: Record<string, unknown>) => void };
        }) | null;
        child?.__ANS_DINO__?.interact?.(fullPayload);
        child?.postMessage({ ...fullPayload, type: "ans-dino", event: "interact", interactType: payload.type ?? payload.action }, window.location.origin);
      } catch {
        /* ignore cross-frame timing */
      }
    });
  }
}
