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
  type: "whip" | "feed" | "pat" | "pose" | "turntable";
  reactMode?: DinoReactMode;
  deltaYaw?: number;
  spin?: boolean;
};

function ensureDinoScreenFxStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("ans-dino-screen-fx-styles")) return;
  const style = document.createElement("style");
  style.id = "ans-dino-screen-fx-styles";
  style.textContent = `
    @keyframes ansDinoWhipPop {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45) rotate(-18deg); }
      25% { opacity: 1; transform: translate(-50%, -58%) scale(1.18) rotate(8deg); }
      70% { opacity: 1; transform: translate(-50%, -78%) scale(1.0) rotate(-4deg); }
      100% { opacity: 0; transform: translate(-50%, -105%) scale(0.85) rotate(0deg); }
    }
    @keyframes ansDinoFoodArc {
      0% { opacity: 0; transform: translate(-110px, 42px) scale(0.5) rotate(-25deg); }
      20% { opacity: 1; transform: translate(-65px, -38px) scale(1.22) rotate(12deg); }
      72% { opacity: 1; transform: translate(-8px, -12px) scale(1.08) rotate(-8deg); }
      100% { opacity: 0; transform: translate(0px, 0px) scale(0.25) rotate(28deg); }
    }
  `;
  document.head.appendChild(style);
}

function getDinoAnchorCoords(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const stageEl = document.querySelector<HTMLElement>(".ans-sanctuary-stage-frame");
  if (stageEl) {
    const r = stageEl.getBoundingClientRect();
    if (r.width > 20 && r.height > 20) {
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.52 };
    }
  }
  const triggerEl = document.querySelector<HTMLElement>(".ans-dino-trigger");
  if (triggerEl) {
    const r = triggerEl.getBoundingClientRect();
    if (r.width > 10 && r.height > 10) {
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.45 };
    }
  }
  return { x: window.innerWidth - 56, y: window.innerHeight - 64 };
}

export function spawnWhipScreenFx(labelText = "⚡ 啪！KPI +12% · 2.4x 超频干活") {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (typeof WebGLRenderingContext === "undefined") return;
  ensureDinoScreenFxStyles();
  const { x, y } = getDinoAnchorCoords();

  const fx = document.createElement("div");
  fx.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:2147483646;pointer-events:none;animation:ansDinoWhipPop 0.9s cubic-bezier(0.16,1,0.3,1) forwards;`;
  fx.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="font-size:28px;filter:drop-shadow(0 4px 12px rgba(244,63,94,0.55));">💥🪢</div>
      <span style="white-space:nowrap;border-radius:999px;background:rgba(225,29,72,0.95);color:#fff;padding:2px 9px;font-size:11px;font-weight:900;box-shadow:0 6px 18px rgba(225,29,72,0.4);">${labelText}</span>
      <span style="white-space:nowrap;border-radius:999px;background:rgba(15,23,42,0.92);border:1px solid rgba(56,189,248,0.65);color:#38bdf8;padding:1px 8px;font-size:10px;font-weight:800;">💻 正在光速敲代码中...</span>
    </div>
  `;
  document.body.appendChild(fx);
  window.setTimeout(() => fx.remove(), 920);
}

export function spawnFoodScreenFx(icon: string, burstText: string) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (typeof WebGLRenderingContext === "undefined") return;
  ensureDinoScreenFxStyles();
  const { x, y } = getDinoAnchorCoords();

  const flyer = document.createElement("div");
  flyer.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:2147483646;pointer-events:none;font-size:30px;filter:drop-shadow(0 6px 14px rgba(16,185,129,0.45));animation:ansDinoFoodArc 0.58s cubic-bezier(0.22,1,0.36,1) forwards;`;
  flyer.textContent = icon;
  document.body.appendChild(flyer);

  window.setTimeout(() => {
    flyer.remove();
    const pop = document.createElement("div");
    pop.style.cssText = `position:fixed;left:${x}px;top:${y - 14}px;z-index:2147483646;pointer-events:none;animation:ansDinoWhipPop 0.95s cubic-bezier(0.16,1,0.3,1) forwards;`;
    pop.innerHTML = `<span style="white-space:nowrap;border-radius:999px;background:rgba(5,150,105,0.95);color:#fff;padding:3px 10px;font-size:11px;font-weight:900;box-shadow:0 6px 18px rgba(5,150,105,0.4);">${icon} ${burstText}</span>`;
    document.body.appendChild(pop);
    window.setTimeout(() => pop.remove(), 960);
  }, 500);
}

export function dispatchDinoInteract(payload: DinoInteractPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ans:dino-activate"));
  window.dispatchEvent(new CustomEvent("ans:dino-interact", { detail: payload }));
  if (typeof document !== "undefined") {
    const frames = document.querySelectorAll<HTMLIFrameElement>(
      "iframe.ans-dino-3d-frame, iframe.ans-sanctuary-stage-frame",
    );
    frames.forEach(frame => {
      try {
        const child = frame.contentWindow as (Window & {
          __ANS_DINO__?: { interact?: (p: DinoInteractPayload) => void };
        }) | null;
        child?.__ANS_DINO__?.interact?.(payload);
      } catch {
        /* ignore cross-frame timing */
      }
    });
  }
}
