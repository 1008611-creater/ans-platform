export type Image2Language = "zh" | "en";

export type Image2LocalizedCaseInput = {
  title: string;
  promptPreview: string;
  categoryLabel: string;
  valueTier?: string;
  promptKind?: string;
  imageAlt?: string;
};

export type Image2LocalizedCaseCopy = {
  categoryLabel: string;
  categoryLabelSecondary: string;
  imageAlt: string;
  promptKind: string;
  promptKindSecondary: string;
  promptPreview: string;
  promptPreviewSecondary: string;
  title: string;
  titleSecondary: string;
  valueTier: string;
  valueTierSecondary: string;
};

const categoryLabelMap: Record<string, string> = {
  "商品与电商": "Products & E-commerce",
  "图表与信息图": "Charts & Infographics",
  "海报与排版": "Posters & Typography",
  "人物与角色": "Characters & People",
  "插画与艺术": "Illustration & Art",
  "场景与叙事": "Scenes & Storytelling",
  "国风与历史": "History & Classical Themes",
  "建筑与空间": "Architecture & Spaces",
  "品牌与 Logo": "Brand & Logo",
  "其他实验": "Other Experiments"
};

const valueTierMap: Record<string, string> = {
  精选: "Featured",
  高价值: "High Value",
  可参考: "Study"
};

const promptKindMap: Record<string, string> = {
  英文: "English",
  中文: "Chinese",
  "JSON/结构化": "JSON / Structured",
  中英混合: "Chinese + English"
};

const exactTitleMap: Record<string, string> = {
  "Profile / Avatar - Luxury Car Selfie Reflection Prompt": "豪华汽车镜面自拍人像",
  "Subtle Rose Nail Edit": "柔和玫瑰色美甲编辑",
  "Sketch Portrait Breaking Paper": "破纸而出的素描人像",
  "Urban fruit juice ad poster": "城市果汁广告海报",
  "Miniature City Knot Sculpture": "微缩城市环结雕塑",
  "Early 1990s Flash Portrait": "九十年代初闪光灯人像",
  "Chocolate wafer product render (JSON-style)": "巧克力威化产品渲染图（JSON 结构版）",
  "Salad-explosion food photography (JSON-style)": "沙拉爆炸悬浮美食摄影（JSON 结构版）",
  "E-commerce Main Image - Sustainable T-Shirt Plantable Tag Ad": "可种植吊牌 T 恤电商主图广告",
  "E-commerce Main Image - Pastel Blue Crocs Fashion Ad": "浅蓝洞洞鞋电商时尚主图广告",
  "E-commerce Main Image - 9-Panel Product TVC Storyboard": "九宫格产品 TVC 电商分镜主图",
  "4-Panel Japanese Digital Ad Banner Grid": "四宫格日式数字广告横幅",
  "Anime Character Brand Identity & Merch Board": "二次元角色品牌识别与周边展示板",
  "18-Panel Mascot Brand Identity Document": "十八宫格吉祥物品牌识别文档",
  "Neon Nike Lumina Ad Poster": "霓虹耐克运动广告海报",
  "Editorial Osaka Six Sweatshirt Ad": "大阪 Six 卫衣编辑风广告",
  "VR Headset Exploded View Poster": "VR 头显爆炸结构海报",
  "Watermelon Lime Beverage Ad Poster": "西瓜青柠饮品广告海报",
  "Berry Splash Cafe Campaign": "浆果飞溅咖啡馆活动广告",
  "Soft Serve Cozy Aesthetic": "温馨软冰淇淋氛围摄影",
  "Illustrated City Food Map": "插画城市美食地图",
  "Iced Coffee Product Infographic": "冰咖啡产品信息图",
  "Fashion Dress Collection Infographic": "时装连衣裙系列信息图",
  "Lavender Smartphone Hero Ad": "薰衣草色智能手机主视觉广告",
  "Empire Inferno Burger Poster": "帝国烈焰汉堡广告海报",
  "Istanbul Line-Art Travel Poster": "伊斯坦布尔线描旅行海报",
  "Bangkok Swiss Typography Poster": "曼谷瑞士排版旅行海报",
  "Viral Food Infographic Poster": "爆款食谱信息图海报",
  "Museum catalog disassembly infographic (唐代襦裙)": "博物馆图录式唐代襦裙拆解信息图",
  "Encyclopedia field guide (Giant Panda)": "大熊猫百科野外指南信息图",
  "Patient cohort and multimodal biomarker workflow": "患者队列与多模态生物标志物工作流图",
  "Multimodal medical-AI method figure": "多模态医疗 AI 方法图",
  "Therapeutic response bar and forest plot": "治疗反应柱状图与森林图",
  "Multi-agent LLM system architecture": "多智能体 LLM 系统架构图",
  "ReAct reasoning trace": "ReAct 推理轨迹图",
  "Indirect prompt-injection attack flow": "间接提示词注入攻击流程图"
};

const titleRules = buildRules([
  ["Chocolate Wafer", "巧克力威化"],
  ["Chocolate wafer", "巧克力威化"],
  ["Hazelnut", "榛子"],
  ["JSON-style", "JSON 结构版"],
  ["Salad-explosion", "沙拉爆炸悬浮"],
  ["Pastel Blue Crocs", "浅蓝洞洞鞋"],
  ["Sustainable T-Shirt", "可持续 T 恤"],
  ["Plantable Tag", "可种植吊牌"],
  ["Japanese Digital Ad", "日式数字广告"],
  ["VR Headset", "VR 头显"],
  ["Watermelon Lime", "西瓜青柠"],
  ["Berry Splash", "浆果飞溅"],
  ["Iced Coffee", "冰咖啡"],
  ["Giant Panda", "大熊猫"],
  ["Medical-AI", "医疗 AI"],
  ["Multi-agent LLM", "多智能体 LLM"],
  ["E-commerce Main Image", "电商主图"],
  ["Product Infographic", "产品信息图"],
  ["Product Diagram", "产品示意图"],
  ["Product Render", "产品渲染"],
  ["Product Photography", "产品摄影"],
  ["Food Photography", "美食摄影"],
  ["Fashion Ad", "时尚广告"],
  ["Ad Poster", "广告海报"],
  ["Travel Poster", "旅行海报"],
  ["Typography Poster", "排版海报"],
  ["Hero Ad", "主视觉广告"],
  ["Main Image", "主图"],
  ["Exploded View", "爆炸图"],
  ["Storyboard", "分镜板"],
  ["Brand Identity", "品牌识别"],
  ["Merchandise", "周边"],
  ["Merch", "周边"],
  ["Collection", "系列"],
  ["Campaign", "活动"],
  ["Poster", "海报"],
  ["Banner", "横幅"],
  ["Infographic", "信息图"],
  ["Document", "文档"],
  ["Board", "图板"],
  ["Sheet", "图稿"],
  ["Catalog", "图录"],
  ["Guide", "指南"],
  ["Workflow", "工作流"],
  ["Reference", "参考"],
  ["Template", "模板"],
  ["Prompt", "提示词"],
  ["Aesthetic", "美学"],
  ["Editorial", "编辑感"],
  ["Luxury", "奢华"],
  ["Minimalist", "极简"],
  ["Cinematic", "电影感"],
  ["Modernist", "现代主义"],
  ["Premium", "高级"],
  ["High-End", "高端"],
  ["High-end", "高端"],
  ["Ultra-Realistic", "超写实"],
  ["Ultra-realistic", "超写实"],
  ["High-Resolution", "高分辨率"],
  ["High-resolution", "高分辨率"],
  ["Ultra High Definition", "超高清"],
  ["Soft Serve", "软冰淇淋"],
  ["Cozy", "温馨"],
  ["Watercolor", "水彩"],
  ["Illustrated", "插画式"],
  ["Illustration", "插画"],
  ["Line-Art", "线描"],
  ["Line Art", "线描"],
  ["Portrait", "肖像"],
  ["Character", "角色"],
  ["Mascot", "吉祥物"],
  ["Anime", "二次元"],
  ["Smartphone", "智能手机"],
  ["Beverage", "饮品"],
  ["Burger", "汉堡"],
  ["Salad", "沙拉"],
  ["Coffee", "咖啡"],
  ["Dress", "连衣裙"],
  ["T-Shirt", "T恤"],
  ["T-shirt", "T恤"],
  ["Sweatshirt", "卫衣"],
  ["Travel", "旅行"],
  ["City", "城市"],
  ["Architecture", "建筑"],
  ["Space", "空间"],
  ["Photo", "照片"],
  ["Photography", "摄影"],
  ["Render", "渲染"],
  ["Design", "设计"],
  ["Art", "艺术"],
  ["Style", "风格"],
  ["Grid", "网格"],
  ["Panel", "面板"],
  ["View", "视图"],
  ["YouTube Thumbnail", "YouTube 缩略图"],
  ["Profile / Avatar", "头像 / 个人资料"],
  ["Comic / Storyboard", "漫画 / 分镜"],
  ["Product Marketing", "产品营销"],
  ["Infographic / Edu Visual", "信息图 / 教育视觉"],
  ["Social Media Post", "社媒帖子"],
  ["Game Asset", "游戏素材"],
  ["Contact Sheet", "选片表"],
  ["Hand-Drawn", "手绘"],
  ["Hand Drawn", "手绘"],
  ["-Panel", " 格"],
  ["Thumbnail", "缩略图"],
  ["Image", "图"],
  ["Product", "产品"],
  ["Avatar", "头像"],
  ["Profile", "个人资料"],
  ["Visual", "视觉"],
  ["Marketing", "营销"],
  ["Comic", "漫画"],
  ["Edu", "教育"],
  ["Fashion", "时尚"],
  ["Game", "游戏"],
  ["Asset", "素材"],
  ["Girl", "少女"],
  ["Social", "社交"],
  ["Media", "媒体"],
  ["Post", "帖子"],
  ["Japanese", "日式"],
  ["Collage", "拼贴"],
  ["Vintage", "复古"],
  ["Fantasy", "奇幻"],
  ["World", "世界"],
  ["Identity", "识别"],
  ["Selfie", "自拍"],
  ["Woman", "女性"],
  ["Female", "女性"],
  ["Male", "男性"],
  ["Pose", "姿势"],
  ["Pink", "粉色"],
  ["Transformation", "变身"],
  ["Scene", "场景"],
  ["Giant", "巨型"],
  ["Robot", "机器人"],
  ["Dance", "舞蹈"],
  ["Brand", "品牌"],
  ["Neon", "霓虹"],
  ["Dark", "暗色"],
  ["Shot", "镜头"],
  ["Comparison", "对比"],
  ["World Cup", "世界杯"],
  ["Generator", "生成器"],
  ["Presentation", "提案"],
  ["Industrial", "工业"],
  ["Pastel", "粉彩"],
  ["Paper", "纸张"],
  ["Room", "房间"],
  ["Goods", "周边"],
  ["Sketch", "速写"],
  ["Retro", "复古"],
  ["System", "系统"],
  ["Zodiac", "星座"],
  ["Car", "汽车"],
  ["Set", "套装"],
  ["Cup", "杯"],
]);

const promptRules = buildRules([
  ["global_settings", "全局设置"],
  ["aspect_ratio", "宽高比"],
  ["aspect ratio", "宽高比"],
  ["resolution", "分辨率"],
  ["style", "风格"],
  ["clarity", "清晰度"],
  ["motion", "动态"],
  ["background", "背景"],
  ["subject", "主体"],
  ["lighting", "光线"],
  ["composition", "构图"],
  ["materials", "材质"],
  ["material", "材质"],
  ["texture", "纹理"],
  ["color", "颜色"],
  ["palette", "配色"],
  ["camera", "镜头"],
  ["angle", "角度"],
  ["shadow", "阴影"],
  ["depth blur", "景深虚化"],
  ["floating particles", "漂浮粒子"],
  ["studio lighting", "棚拍光"],
  ["soft natural light", "柔和自然光"],
  ["glossy reflective floor", "光亮反射地面"],
  ["clean studio background", "干净棚拍背景"],
  ["premium commercial", "高级商业"],
  ["commercial", "商业"],
  ["editorial", "编辑感"],
  ["food photography", "美食摄影"],
  ["product photography", "产品摄影"],
  ["fashion advertising", "时尚广告"],
  ["fashion ad", "时尚广告"],
  ["product photo", "产品照片"],
  ["product render", "产品渲染"],
  ["photorealistic", "写实"],
  ["hyper-realistic", "超写实"],
  ["hyper realistic", "超写实"],
  ["ultra-realistic", "超写实"],
  ["ultra realistic", "超写实"],
  ["high resolution", "高分辨率"],
  ["ultra high definition", "超高清"],
  ["frozen action", "冻结动作"],
  ["suspended", "悬浮"],
  ["micro-texture", "微纹理"],
  ["sharpness", "锐度"],
  ["vertical", "竖向"],
  ["horizontal", "横向"],
  ["poster", "海报"],
  ["infographic", "信息图"],
  ["diagram", "示意图"],
  ["workflow", "工作流"],
  ["prompt", "提示词"],
  ["brand identity", "品牌识别"],
  ["logo", "Logo"],
  ["banner", "横幅"],
  ["storyboard", "分镜"],
  ["reference", "参考"],
  ["template", "模板"],
  ["campaign", "活动"],
  ["ad", "广告"],
  ["hero", "主视觉"],
  ["minimalist", "极简"],
  ["cinematic", "电影感"],
  ["luxury", "奢华"],
  ["cozy", "温馨"],
  ["vibrant", "鲜明"],
  ["modern", "现代"],
  ["soft", "柔和"]
]);

export function getImage2LanguageLabel(language: Image2Language) {
  return language === "zh" ? "中文" : "EN";
}

export function getImage2LanguageToggleLabel(language: Image2Language) {
  return language === "zh" ? "切换到 English" : "切换到 中文";
}

export function localizedCategoryLabel(label: string, language: Image2Language) {
  const en = categoryLabelMap[label] ?? label;
  return language === "zh" ? label : en;
}

export function localizedValueTier(label: string, language: Image2Language) {
  const en = valueTierMap[label] ?? label;
  return language === "zh" ? label : en;
}

export function localizedPromptKind(label: string | undefined, language: Image2Language) {
  if (!label) return "";
  const en = promptKindMap[label] ?? label;
  return language === "zh" ? label : en;
}

export function localizedCaseText(input: Image2LocalizedCaseInput, language: Image2Language): Image2LocalizedCaseCopy {
  const chineseTitle = translateTitle(input.title);
  const chinesePromptPreview = buildChinesePromptPreview(input, chineseTitle);
  const titleSecondary = language === "zh" ? input.title : chineseTitle;
  const promptPreviewSecondary = language === "zh" ? input.promptPreview : chinesePromptPreview;
  const categoryLabelSecondary = language === "zh" ? localizedCategoryLabel(input.categoryLabel, "en") : input.categoryLabel;
  const valueTierPrimary = input.valueTier ? localizedValueTier(input.valueTier, language) : "";
  const valueTierSecondary = input.valueTier ? localizedValueTier(input.valueTier, language === "zh" ? "en" : "zh") : "";
  const promptKindPrimary = localizedPromptKind(input.promptKind, language);
  const promptKindSecondary = localizedPromptKind(input.promptKind, language === "zh" ? "en" : "zh");
  const title = language === "zh" ? chineseTitle : input.title;
  const promptPreview = language === "zh" ? chinesePromptPreview : input.promptPreview;
  const categoryLabel = localizedCategoryLabel(input.categoryLabel, language);

  return {
    categoryLabel,
    categoryLabelSecondary,
    imageAlt: language === "zh" ? translateTitle(input.imageAlt ?? input.title) : input.imageAlt ?? input.title,
    promptKind: promptKindPrimary,
    promptKindSecondary,
    promptPreview,
    promptPreviewSecondary,
    title,
    titleSecondary,
    valueTier: valueTierPrimary,
    valueTierSecondary
  };
}

function translateTitle(title: string) {
  const exact = exactTitleMap[title];
  if (exact) return exact;
  return translateText(title, titleRules)
    .replace(/\bAd\b/gi, "广告")
    .replace(/\bAI\b/g, "AI")
    .replace(/\b3D\b/g, "3D")
    .replace(/\s*-\s*/g, " - ")
    .replace(/([A-Za-z])\s*-\s*([A-Za-z])/g, "$1-$2")
    .replace(/([0-9])\s*-\s*(?=[\u4e00-\u9fff])/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildChinesePromptPreview(input: Image2LocalizedCaseInput, chineseTitle: string) {
  const raw = `${input.title} ${input.promptPreview}`.toLowerCase();
  const promptAnchors: Array<[RegExp, string]> = [
    [/food|salad|burger|coffee|beverage|berry|chocolate|wafer|oats|cafe/, "食物质感与商业食欲感"],
    [/fashion|dress|shirt|crocs|sweatshirt|nike|apparel/, "服装版型、材质和品牌广告感"],
    [/poster|typography|banner|headline|logo|text/, "海报排版、标题层级和文字准确性"],
    [/infographic|diagram|workflow|figure|chart|panel|grid|field guide/, "信息结构、模块分区和标注清晰度"],
    [/studio|lighting|shadow|reflective|background/, "棚拍光线、背景和阴影层次"],
    [/cinematic|editorial|premium|luxury|modern|minimalist/, "高级视觉风格和构图气质"],
    [/exploded|disassembly|assembly|components/, "结构拆解和零件关系"],
    [/portrait|character|mascot|anime|girl|woman|man/, "人物识别、角色气质和姿态稳定"]
  ];
  const anchors = promptAnchors
    .filter(([pattern]) => pattern.test(raw))
    .map(([, label]) => label)
    .slice(0, 4);
  const focus = anchors.length ? anchors.join("、") : "主体、构图、光线、材质和画面风格";
  return `中文提示词速读：围绕“${chineseTitle}”生成${input.categoryLabel}案例，重点控制${focus}；英文原文已保留，可继续用于复制、改写和复刻。`;
}

function buildRules(entries: Array<readonly [string, string]>) {
  return entries
    .map(([source, target]) => ({
      source,
      target,
      pattern: new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi")
    }))
    .sort((a, b) => b.source.length - a.source.length);
}

function translateText(text: string, rules: Array<{ pattern: RegExp; target: string }>) {
  let value = String(text ?? "");
  for (const rule of rules) {
    value = value.replace(rule.pattern, rule.target);
  }
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
