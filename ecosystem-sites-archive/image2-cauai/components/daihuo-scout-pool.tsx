"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  Award,
  BadgeCheck,
  Camera,
  ChevronRight,
  Clipboard,
  ClipboardCheck,
  ExternalLink,
  Link2,
  LucideIcon,
  Play,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type Platform = "抖音" | "快手" | "小红书";
type SampleType = "视频" | "账号" | "资料源";
type RiskLevel = "低" | "中" | "高";
type EvidenceGrade = "A" | "B" | "C" | "D";
type SortMode = "总分优先" | "购买意图" | "可模仿性" | "近期热度";
type ReviewStatus = "未看" | "已打开" | "已复盘" | "不跟";
type WorkbenchView = "总览" | "侦察入口" | "线索采样" | "样本池" | "拆解详情";

type ReviewRecord = {
  status: ReviewStatus;
  note: string;
  updatedAt: string;
};

type DouyinScoutEntry = {
  title: string;
  query?: string;
  url: string;
  purpose: string;
  keepWhen: string;
  tag: string;
};

type DouyinSamplingMission = {
  title: string;
  query: string;
  category: string;
  sampleKind: DouyinLeadKind;
  goal: string;
  passLine: string;
  mustCapture: string[];
  draft: Partial<DouyinLeadDraft>;
};

type DouyinLeadStatus = "待拆解" | "已复制" | "已入池" | "放弃";
type DouyinLeadKind = "视频" | "账号" | "直播" | "商品";

type DouyinLeadDraft = {
  sourceUrl: string;
  accountName: string;
  sampleKind: DouyinLeadKind;
  category: string;
  title: string;
  hook: string;
  commentIntent: string;
  productSignal: string;
  evidence: string;
  note: string;
};

type DouyinLead = DouyinLeadDraft & {
  id: string;
  status: DouyinLeadStatus;
  createdAt: string;
};

type DouyinLeadScore = {
  total: number;
  level: "优先拆解" | "补证据" | "暂不入池";
  items: Array<{
    label: string;
    value: number;
    max: number;
    reason: string;
  }>;
  missing: string[];
};

type Sample = {
  id: number;
  platform: Platform;
  sampleType: SampleType;
  accountName: string;
  category: string;
  subCategory: string;
  title: string;
  hook: string;
  visualPattern: string;
  whyValuable: string;
  nextAction: string;
  sourceLabel: string;
  sourceUrl: string;
  videoUrl: string;
  coverImage: string;
  coverAlt: string;
  followers: string;
  likes: string;
  comments: string;
  saves: string;
  shares: string;
  views: string;
  publicationWindow: string;
  commentIntent: string[];
  productOpportunity: string;
  scoreTotal: number;
  scorePurchase: number;
  scoreImitate: number;
  scoreContrast: number;
  scoreCommerce: number;
  risk: RiskLevel;
  evidence: EvidenceGrade;
  tags: string[];
  sourceStack: string[];
  playbook: string;
  promptSeed: string;
  researchVerdict?: string;
  transferableAssets?: string[];
  operatingSteps?: string[];
  avoidCopying?: string[];
  trackingTasks?: string[];
  relatedLeads?: Array<{
    title: string;
    url: string;
    note: string;
  }>;
};

const platforms: Array<Platform | "全部"> = ["全部", "抖音", "快手", "小红书"];
const sampleTypes: Array<SampleType | "全部"> = ["全部", "视频", "账号", "资料源"];
const categories = ["全部", "女装", "男装", "童装", "亲子穿搭", "家居穿搭", "拆解方法论"];
const riskLevels: Array<RiskLevel | "全部"> = ["全部", "低", "中", "高"];
const sortModes: SortMode[] = ["总分优先", "购买意图", "可模仿性", "近期热度"];
const reviewStatuses: Array<ReviewStatus | "全部"> = ["全部", "未看", "已打开", "已复盘", "不跟"];
const REVIEW_STORAGE_KEY = "daihuo-scout-review-v2";
const DOUYIN_LEAD_STORAGE_KEY = "daihuo-douyin-leads-v1";
const DEFAULT_REVIEW: ReviewRecord = { status: "未看", note: "", updatedAt: "" };
const douyinLeadStatuses: DouyinLeadStatus[] = ["待拆解", "已复制", "已入池", "放弃"];
const douyinLeadKinds: DouyinLeadKind[] = ["视频", "账号", "直播", "商品"];

const DEFAULT_DOUYIN_LEAD_DRAFT: DouyinLeadDraft = {
  sourceUrl: "",
  accountName: "",
  sampleKind: "视频",
  category: "童装",
  title: "",
  hook: "",
  commentIntent: "",
  productSignal: "",
  evidence: "",
  note: ""
};

const douyinScoutEntries: DouyinScoutEntry[] = [
  {
    title: "爆款拆解",
    query: "爆款拆解",
    url: douyinSearchUrl("爆款拆解"),
    purpose: "找运营拆解视频，提炼搜索词、筛选标准和账号拆解步骤。",
    keepWhen: "必须能反查到具体视频、账号名、商品词或评论购买意图。",
    tag: "方法入口"
  },
  {
    title: "带货视频拆解",
    query: "带货视频拆解",
    url: douyinSearchUrl("带货视频拆解"),
    purpose: "专门找商品露出、挂车、转化话术、评论需求明显的内容。",
    keepWhen: "保留有商品、挂车、评论问价/尺码/链接的真实带货样本。",
    tag: "带货结构"
  },
  {
    title: "童装带货",
    query: "童装带货",
    url: douyinSearchUrl("童装带货"),
    purpose: "验证童装账号、萌娃穿搭、演出裙和生日裙是否有持续需求。",
    keepWhen: "优先低粉高爆、评论问身高体重、尺码、面料、活动场景的样本。",
    tag: "童装"
  },
  {
    title: "萌娃跳舞童装",
    query: "萌娃跳舞童装",
    url: douyinSearchUrl("萌娃跳舞童装"),
    purpose: "验证你提到的萌娃跳舞穿漂亮小裙子的视觉钩子。",
    keepWhen: "只留衣服是主角、评论问同款/尺码/链接的内容，不留纯娱乐视频。",
    tag: "视觉钩子"
  },
  {
    title: "女装穿搭带货",
    query: "女装穿搭带货",
    url: douyinSearchUrl("女装穿搭带货"),
    purpose: "找显瘦、反差、换装、场景穿搭等可复制视频模板。",
    keepWhen: "保留前 3 秒有强反差、评论问同款/显瘦/尺码/面料的样本。",
    tag: "女装"
  },
  {
    title: "大码女装显瘦",
    query: "大码女装显瘦",
    url: douyinSearchUrl("大码女装显瘦"),
    purpose: "验证强痛点类女装，重点看身材顾虑和尺码争议。",
    keepWhen: "评论区必须出现藏肚子、显瘦、梨形、大码、多少斤穿等高意图词。",
    tag: "强需求"
  },
  {
    title: "舞蹈穿搭",
    query: "舞蹈穿搭",
    url: douyinSearchUrl("舞蹈穿搭"),
    purpose: "验证美女跳舞 + 好看衣服的视觉流量模型。",
    keepWhen: "谨慎筛：只留审美、服装、转化强的样本，跳过擦边和纯流量内容。",
    tag: "反差审美"
  },
  {
    title: "男装穿搭带货",
    query: "男装穿搭带货",
    url: douyinSearchUrl("男装穿搭带货"),
    purpose: "找通勤、显精神、大码、抗皱、免烫等实用型男装机会。",
    keepWhen: "评论问身高体重、版型、会不会皱、适合上班穿，才进池。",
    tag: "男装"
  },
  {
    title: "家居服带货",
    query: "家居服带货",
    url: douyinSearchUrl("家居服带货"),
    purpose: "验证低拍摄门槛、质感生活方式和面料舒适度转化。",
    keepWhen: "评论问不起球、厚薄、透不透、多少斤能穿，才继续补数据。",
    tag: "家居"
  },
  {
    title: "巨量百应",
    url: "https://buyin.jinritemai.com/",
    purpose: "后续看精选联盟、佣金、达人选品和商品供给，不把搜索热度当成交证据。",
    keepWhen: "只记录佣金、销量、退货/评价、供货稳定性等能支持测品的数据。",
    tag: "上货/供给"
  }
];

const douyinSamplingMissions: DouyinSamplingMission[] = [
  {
    title: "童装视觉钩子",
    query: "萌娃跳舞童装",
    category: "童装",
    sampleKind: "视频",
    goal: "找能直接反推童装商品的视觉钩子样本。",
    passLine: "评论区要有同款、尺码、几岁穿、链接、面料任一明确购买意图。",
    mustCapture: ["前 3 秒动作", "评论购买意图", "商品款式", "账号主页是否连续做童装"],
    draft: {
      category: "童装",
      sampleKind: "视频",
      title: "萌娃跳舞童装线索"
    }
  },
  {
    title: "女装显瘦反差",
    query: "大码女装显瘦",
    category: "女装",
    sampleKind: "视频",
    goal: "找显瘦、遮肉、版型争议强的女装样本。",
    passLine: "评论区必须出现显瘦、尺码、身高体重、面料、同款等词。",
    mustCapture: ["前 3 秒反差", "尺码/身高体重", "版型或面料", "评论问价或链接"],
    draft: {
      category: "女装",
      sampleKind: "视频",
      title: "女装显瘦线索"
    }
  },
  {
    title: "男装通勤实用",
    query: "男装穿搭带货",
    category: "男装",
    sampleKind: "账号",
    goal: "找能卖通勤、抗皱、免烫、版型稳定的男装账号。",
    passLine: "评论里要有身高体重、版型、适合上班、会不会皱等判断。",
    mustCapture: ["账号连续性", "商品重复出现", "评论问版型", "价格带或佣金"],
    draft: {
      category: "男装",
      sampleKind: "账号",
      title: "男装通勤线索"
    }
  }
];

const samples: Sample[] = [
  {
    id: 101,
    platform: "小红书",
    sampleType: "视频",
    accountName: "梨形身材穿搭实验室",
    category: "女装",
    subCategory: "显瘦连衣裙",
    title: "同一条裙子，普通人和会搭的人差 10 斤",
    hook: "先看前 3 秒的站姿对比，用户会本能想知道“为什么我穿就不一样”。",
    visualPattern: "一镜三换，近景试穿 + 镜前走动 + 侧身显腰线，所有镜头都围绕“显瘦反差”。",
    whyValuable: "强反差、强可视化、强评论意图，最容易反推到裙装版型、面料和尺码问题。",
    nextAction: "去补同类显瘦裙的价格带、退货率和尺码争议词，再决定是否进货测品。",
    sourceLabel: "小红书搜索结果",
    sourceUrl: "https://www.xiaohongshu.com/",
    videoUrl: "https://www.xiaohongshu.com/",
    coverImage:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "待替换：小红书具体视频页真实截图",
    followers: "3.8万",
    likes: "9.2万",
    comments: "1,860",
    saves: "1.4万",
    shares: "1,200",
    views: "82万",
    publicationWindow: "近 14 天",
    commentIntent: ["求链接", "什么尺码", "会不会显胯", "面料会不会闷"],
    productOpportunity: "高腰收腰连衣裙、A 字裙、垂坠感面料",
    scoreTotal: 92,
    scorePurchase: 26,
    scoreImitate: 22,
    scoreContrast: 20,
    scoreCommerce: 24,
    risk: "中",
    evidence: "B",
    tags: ["反差", "显瘦", "试穿", "评论求同款", "女装"],
    sourceStack: ["MediaCrawler", "小红书搜索", "评论意图观察"],
    playbook: "先做身材痛点拆解，再把裙型、领型、腰线、面料、尺码争议整理成选品卡。",
    promptSeed:
      "请作为带货选品数据员工，拆解这个小红书女装视频样本：关注前3秒反差、评论购买意图、版型和尺码争议，并反推可卖商品机会、风险和下一步补数任务。"
  },
  {
    id: 102,
    platform: "抖音",
    sampleType: "账号",
    accountName: "宝宝穿搭不踩坑",
    category: "童装",
    subCategory: "活动裙 / 演出服",
    title: "低粉高爆的童装账号，连续 7 条都在问同款",
    hook: "账号不是讲理论，而是每条都把‘上身效果’和‘尺码建议’说透。",
    visualPattern: "真人出镜 + 萌娃转圈 + 动作重复，视频结构稳定，极容易模仿。",
    whyValuable: "账号层面已经验证内容模型稳定，适合沉淀为童装选品池和测品池。",
    nextAction: "补这个账号近 30 条视频中的爆款占比、评论高频尺码词和发货/退换痕迹。",
    sourceLabel: "抖音搜索与主页",
    sourceUrl: "https://www.douyin.com/",
    videoUrl: "https://www.douyin.com/",
    coverImage:
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "待替换：抖音具体账号或视频页真实截图",
    followers: "1.2万",
    likes: "18.7万",
    comments: "4,500",
    saves: "6,200",
    shares: "2,300",
    views: "310万",
    publicationWindow: "近 30 天",
    commentIntent: ["几岁能穿", "身高多少", "有运费险吗", "面料舒服吗"],
    productOpportunity: "演出裙、生日裙、亲子活动裙、舞蹈服",
    scoreTotal: 95,
    scorePurchase: 29,
    scoreImitate: 21,
    scoreContrast: 22,
    scoreCommerce: 23,
    risk: "中",
    evidence: "B",
    tags: ["低粉高爆", "童装", "问尺码", "持续爆款", "账号样本"],
    sourceStack: ["MediaCrawler", "抖音主页", "评论关键词"],
    playbook: "先锁定尺码和场景，再拆出家长最关心的安全、舒适、上镜三件事。",
    promptSeed:
      "请作为带货选品数据员工，拆解这个抖音童装账号样本：判断它为什么持续爆、评论区为什么高意图、适合哪些童装品类，以及下一步应该补什么数据。"
  },
  {
    id: 103,
    platform: "快手",
    sampleType: "视频",
    accountName: "工地男士穿搭局",
    category: "男装",
    subCategory: "通勤衬衫 / 休闲裤",
    title: "不靠脸也能卖爆的男装，靠的是版型和场景",
    hook: "把‘上班穿什么’变成‘这一身能不能让人看着精神’。",
    visualPattern: "办公室、地铁、车内三场景切换，镜头稳定，不靠剧情。",
    whyValuable: "男装不是情绪种草，而是实用性和场景适配，选品标准非常清楚。",
    nextAction: "补大码、修身、抗皱、免烫、透气等关键词的销量和退货讨论。",
    sourceLabel: "快手搜索结果",
    sourceUrl: "https://www.kuaishou.com/",
    videoUrl: "https://www.kuaishou.com/",
    coverImage:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "男装视频封面",
    followers: "8.6万",
    likes: "12.4万",
    comments: "1,340",
    saves: "2,900",
    shares: "680",
    views: "145万",
    publicationWindow: "近 21 天",
    commentIntent: ["多高多重穿什么码", "会不会皱", "能不能当工装", "版型偏大吗"],
    productOpportunity: "通勤衬衫、直筒裤、免烫套装、休闲通勤外套",
    scoreTotal: 84,
    scorePurchase: 24,
    scoreImitate: 18,
    scoreContrast: 17,
    scoreCommerce: 25,
    risk: "低",
    evidence: "C",
    tags: ["男装", "通勤", "实用型", "快手", "场景化"],
    sourceStack: ["MediaCrawler", "快手搜索", "评论手工筛选"],
    playbook: "把版型说清楚，比把故事讲大更有效；男装先做可信度，再做利润。",
    promptSeed:
      "请作为带货选品数据员工，拆解这个快手男装视频样本：从场景、版型、穿着人群、购买意图和风险入手，输出可复刻的男装选品机会。"
  },
  {
    id: 104,
    platform: "小红书",
    sampleType: "账号",
    accountName: "亲子穿搭反差实验",
    category: "亲子穿搭",
    subCategory: "妈妈同款 / 姐妹装",
    title: "亲子同穿一套，点击率直接翻倍",
    hook: "同款、同色、同场景，天然把人群从孩子扩到妈妈。",
    visualPattern: "母女同框、镜头平移、站姿对比，重点一直放在‘反差与统一’。",
    whyValuable: "一个账号同时吃童装和女装的需求，适合沉淀复购和套装逻辑。",
    nextAction: "补该账号高互动视频里最常被问到的颜色、尺码和活动场景。",
    sourceLabel: "小红书主页",
    sourceUrl: "https://www.xiaohongshu.com/",
    videoUrl: "https://www.xiaohongshu.com/",
    coverImage:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "待替换：小红书具体账号或视频页真实截图",
    followers: "4.1万",
    likes: "7.8万",
    comments: "980",
    saves: "1.1万",
    shares: "1,400",
    views: "93万",
    publicationWindow: "近 18 天",
    commentIntent: ["有妈妈码吗", "孩子几岁能穿", "能不能做姐妹装", "同款链接"],
    productOpportunity: "亲子裙、妈妈同款、姐妹装、活动装",
    scoreTotal: 88,
    scorePurchase: 23,
    scoreImitate: 20,
    scoreContrast: 21,
    scoreCommerce: 24,
    risk: "中",
    evidence: "B",
    tags: ["亲子", "反差", "套装", "转化强", "复购"],
    sourceStack: ["MediaCrawler", "小红书搜索", "评论关键词"],
    playbook: "先做家长审美，再做孩子舒适度，最后补套装转化。",
    promptSeed:
      "请作为带货选品数据员工，拆解这个亲子穿搭账号：判断它的反差点、可复制动作、主要人群和适合卖的套装类目。"
  },
  {
    id: 105,
    platform: "抖音",
    sampleType: "视频",
    accountName: "轻居穿搭研究所",
    category: "家居穿搭",
    subCategory: "家居服 / 睡衣",
    title: "把家居服拍得像高级品牌广告，收藏率很高",
    hook: "不是单纯展示衣服，而是把‘居家舒服’拍成‘质感生活方式’。",
    visualPattern: "晨光、卧室、客厅移动镜头，动作慢，画面干净，适合反复模仿。",
    whyValuable: "低拍摄门槛、低模特要求、订单转化往往比想象中稳定。",
    nextAction: "补家居服类目的面料、厚薄、起球和价格区间数据。",
    sourceLabel: "抖音搜索结果",
    sourceUrl: "https://www.douyin.com/",
    videoUrl: "https://www.douyin.com/",
    coverImage:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "待替换：抖音具体视频页真实截图",
    followers: "2.6万",
    likes: "6.4万",
    comments: "740",
    saves: "1.5万",
    shares: "510",
    views: "67万",
    publicationWindow: "近 12 天",
    commentIntent: ["有睡衣链接吗", "不起球吗", "透不透", "多少斤能穿"],
    productOpportunity: "家居套装、睡衣、法兰绒家居服、轻奢家居服",
    scoreTotal: 81,
    scorePurchase: 22,
    scoreImitate: 19,
    scoreContrast: 18,
    scoreCommerce: 22,
    risk: "低",
    evidence: "C",
    tags: ["家居", "收藏率", "低门槛", "内容稳定", "可复制"],
    sourceStack: ["MediaCrawler", "抖音搜索", "人工观察"],
    playbook: "先抓视觉气质，再回推材质和价格带，不要只盯模特。",
    promptSeed:
      "请作为带货选品数据员工，拆解这个家居穿搭视频：看它为什么收藏高、适合什么价格带、适合哪些居家服产品，并给出下一步补数任务。"
  },
  {
    id: 106,
    platform: "抖音",
    sampleType: "视频",
    accountName: "大码显瘦穿搭库",
    category: "女装",
    subCategory: "大码连衣裙",
    title: "胖女孩穿得好看，转化不是一点点",
    hook: "直接击中‘我能不能穿好看’这个购买前问题。",
    visualPattern: "全身前后侧展示、站姿转身、镜头停顿给观察时间。",
    whyValuable: "低粉也能靠强需求爆，评论区会自动给出尺码和顾虑。",
    nextAction: "补大码女装的退货风险、尺寸争议和复购关键词。",
    sourceLabel: "抖音搜索结果",
    sourceUrl: "https://www.douyin.com/",
    videoUrl: "https://www.douyin.com/",
    coverImage:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
    coverAlt: "待替换：抖音具体视频页真实截图",
    followers: "5.4万",
    likes: "11.6万",
    comments: "2,210",
    saves: "8,700",
    shares: "1,030",
    views: "156万",
    publicationWindow: "近 9 天",
    commentIntent: ["显胖吗", "藏肚子吗", "有大码吗", "适合梨形吗"],
    productOpportunity: "大码裙装、藏肉上衣、显瘦套装、通勤大码",
    scoreTotal: 89,
    scorePurchase: 25,
    scoreImitate: 19,
    scoreContrast: 19,
    scoreCommerce: 26,
    risk: "中",
    evidence: "B",
    tags: ["大码", "显瘦", "强需求", "低粉高爆", "女装"],
    sourceStack: ["MediaCrawler", "抖音搜索", "评论意图观察"],
    playbook: "把身材顾虑转成产品规格，优先看尺码口碑和视觉反差。",
    promptSeed:
      "请作为带货选品数据员工，拆解这个大码女装视频样本：分析需求点、评论购买意图、反差感和适合卖的商品机会。"
  },
  {
    id: 201,
    platform: "抖音",
    sampleType: "资料源",
    accountName: "抖音搜索：爆款拆解",
    category: "拆解方法论",
    subCategory: "对标账号 / 爆款视频流程",
    title: "内部拆解爆款视频和对标账号的完整流程",
    hook: "搜索结果里出现“爆款视频和对标账号完整流程”类内容，适合作为拆解 SOP 的外部参照。",
    visualPattern: "短视频口播 + 流程拆分，重点通常放在选题、标题、封面、结构和账号对标。",
    whyValuable: "适合用来补充拆解方法，但必须二次核验账号名、发布时间、评论区和是否真实带货。",
    nextAction: "在抖音内搜索“爆款拆解”“爆款视频拆解从头到尾”，人工挑选近 30 天、互动高、案例明确的视频入池。",
    sourceLabel: "抖音搜索",
    sourceUrl: "https://www.douyin.com/search/%E7%88%86%E6%AC%BE%E6%8B%86%E8%A7%A3",
    videoUrl: "https://www.douyin.com/search/%E7%88%86%E6%AC%BE%E6%8B%86%E8%A7%A3",
    coverImage: "/daihuo-scout/covers/douyin-viral-search.png",
    coverAlt: "抖音爆款拆解搜索页真实截图，已登录无弹窗遮挡",
    followers: "待核验",
    likes: "待核验",
    comments: "待核验",
    saves: "待核验",
    shares: "待核验",
    views: "搜索源",
    publicationWindow: "2026 搜索结果",
    commentIntent: ["爆款拆解", "对标账号", "短视频运营", "个人 IP"],
    productOpportunity: "不是商品机会，适合作为拆解 SOP 和样本发现入口",
    scoreTotal: 80,
    scorePurchase: 12,
    scoreImitate: 24,
    scoreContrast: 16,
    scoreCommerce: 28,
    risk: "中",
    evidence: "C",
    tags: ["抖音", "爆款拆解", "对标账号", "方法论", "待核验"],
    sourceStack: ["Jina 搜索", "抖音搜索页", "人工复核"],
    playbook: "先把视频中的流程拆出来，再反向找它引用的真实爆款案例，不要直接照搬方法论。",
    promptSeed:
      "请作为带货选品数据员工，把这个抖音“爆款拆解”搜索结果当作资料源：提炼其中可复用的账号/视频拆解步骤，并列出需要人工核验的真实案例。",
    researchVerdict: "抖音搜索页适合作为实时发现入口，但页面本身不给稳定数据；它的价值是沉淀搜索词、筛选口径和人工核验动作。",
    transferableAssets: ["搜索词池", "人工核验标准", "对标账号追踪入口"],
    operatingSteps: [
      "每天搜索“爆款拆解、对标账号、爆款视频拆解、带货视频结构拆解”。",
      "只保留近 30 天发布、案例明确、能反查真实账号或商品的视频。",
      "把方法论视频里提到的真实账号、标题、商品词拆出来，再进入带货样本池。"
    ],
    avoidCopying: [
      "不要把搜索页当作数据证据，搜索页只能说明入口存在。",
      "不要只收“运营大词”，必须落到账号名、视频链接、商品词和评论意图。"
    ],
    trackingTasks: [
      "补 20 条抖音拆解类视频的真实链接，并标注是否指向真实带货账号。",
      "把可复用的拆解步骤合并成内部《爆款账号/视频拆解 SOP》。"
    ]
  },
  {
    id: 202,
    platform: "小红书",
    sampleType: "资料源",
    accountName: "小弟姚安",
    category: "拆解方法论",
    subCategory: "小红书爆款采集 / AI拆解",
    title: "零代码采集小红书爆款笔记 + AI拆解仿写",
    hook: "用飞书多维表格、DeepSeek 和插件做爆款笔记采集与拆解，适合搭建内部样本库。",
    visualPattern: "工具演示型教程，流程清晰，适合拆成“采集-入库-拆解-仿写”的员工 SOP。",
    whyValuable: "它不是带货样本本身，但对建立小红书爆款样本采集流程很有价值。",
    nextAction: "打开 B站主页，筛选它发布的采集、飞书、多维表格、AI拆解相关视频，记录可复用流程。",
    sourceLabel: "B站视频",
    sourceUrl: "https://space.bilibili.com/125954782/",
    videoUrl: "https://www.bilibili.com/video/BV1UBQkYBEf9/",
    coverImage: "/daihuo-scout/covers/xiaodi-yaoan-bili.png",
    coverAlt: "小弟姚安 B站视频页真实截图",
    followers: "2.2万",
    likes: "待核验",
    comments: "2",
    saves: "待核验",
    shares: "待核验",
    views: "1.8万",
    publicationWindow: "2025-03-14",
    commentIntent: ["飞书", "小红书爆款", "AI拆解", "仿写", "采集"],
    productOpportunity: "不是商品机会，适合沉淀为样本采集工具链",
    scoreTotal: 86,
    scorePurchase: 10,
    scoreImitate: 30,
    scoreContrast: 18,
    scoreCommerce: 28,
    risk: "低",
    evidence: "B",
    tags: ["B站", "小红书", "飞书", "AI拆解", "样本库"],
    sourceStack: ["Jina 搜索", "B站结果页", "视频页"],
    playbook: "把它拆成内部工具流：关键词采集、爆款入表、AI拆解、提示词生成、人工复核。",
    promptSeed:
      "请作为带货样本池运营员工，拆解“小弟姚安”的小红书爆款采集/AI拆解视频：提炼可落地 SOP、字段、工具节点和风险点。",
    researchVerdict: "这是“样本池底座”资料源，真正有价值的是把小红书爆款笔记采集、飞书多维表格、DeepSeek/AI 拆解和仿写串成固定流水线。",
    transferableAssets: ["关键词采集链路", "飞书多维表格字段", "AI 拆解/仿写 prompt", "人工复核节点"],
    operatingSteps: [
      "先建字段：平台、关键词、账号、标题、链接、互动、封面、评论意图、商品机会、证据等级。",
      "用关键词或对标账号批量采集小红书笔记，统一写入飞书或本地表格。",
      "让 Codex 逐条输出：爆点、可模仿画面、商业线索、风险、下一步补数任务。"
    ],
    avoidCopying: [
      "不要把 AI 仿写结果直接发布，必须转成自己的商品场景和合规表达。",
      "不要只追求日产数量，带货样本池优先要购买意图和商品线索。"
    ],
    trackingTasks: [
      "复刻一个最小表结构：先手工录入 30 条小红书服装/童装样本。",
      "从它的推荐链里继续追“Coze 一键采集小红书高赞爆款笔记”和“对标账号一键采集仿写”。"
    ],
    relatedLeads: [
      {
        title: "小弟姚安 B站主页",
        url: "https://space.bilibili.com/125954782/",
        note: "进入主页看他其他 AI 工作流和小红书采集相关视频。"
      },
      {
        title: "AI 工作流合集",
        url: "https://space.bilibili.com/125954782/channel/collectiondetail?sid=4975680",
        note: "包含多条采集、飞书、自动化、仿写链路视频。"
      },
      {
        title: "Coze 一键采集小红书高赞爆款笔记",
        url: "https://www.bilibili.com/video/BV1zSM6zSE4L/",
        note: "适合补采集节点和飞书字段设计。"
      },
      {
        title: "小红书对标账号一键采集仿写",
        url: "https://www.bilibili.com/video/BV1ZN5rzcE8x/",
        note: "适合补“对标账号 -> 样本池”的流程。"
      },
      {
        title: "MCP+n8n 零成本爆款笔记采集",
        url: "https://www.bilibili.com/video/BV1gB4EzWEea/",
        note: "适合后续评估本地自动化和定时任务。"
      }
    ]
  },
  {
    id: 203,
    platform: "小红书",
    sampleType: "资料源",
    accountName: "阿青AI智能体",
    category: "拆解方法论",
    subCategory: "小红书数据入库 / 自动化",
    title: "自动提取小红书爆款数据并写入飞书",
    hook: "核心价值在自动化数据入库：能减少人工复制，把爆款笔记变成可复盘资产。",
    visualPattern: "自动化教程，展示从小红书数据到飞书表格的链路。",
    whyValuable: "适合补样本池的数据采集环节，尤其是标题、互动数据、链接、评论字段。",
    nextAction: "拆出字段清单和采集限制，确认哪些步骤能用 MediaCrawler 或 RPA 替代。",
    sourceLabel: "B站视频",
    sourceUrl: "https://www.bilibili.com/video/BV1zMbLzPEm1/",
    videoUrl: "https://www.bilibili.com/video/BV1zMbLzPEm1/",
    coverImage: "/daihuo-scout/covers/aqing-ai-bili.png",
    coverAlt: "阿青AI智能体 B站视频页真实截图",
    followers: "3059",
    likes: "待核验",
    comments: "16",
    saves: "待核验",
    shares: "待核验",
    views: "1.6万",
    publicationWindow: "2025-08-11",
    commentIntent: ["自动提取", "小红书数据", "飞书", "扣子工作流"],
    productOpportunity: "不是商品机会，适合沉淀为数据采集员工流程",
    scoreTotal: 84,
    scorePurchase: 8,
    scoreImitate: 30,
    scoreContrast: 17,
    scoreCommerce: 29,
    risk: "中",
    evidence: "B",
    tags: ["B站", "自动化", "小红书数据", "飞书", "扣子"],
    sourceStack: ["Jina 搜索", "B站结果页", "视频页"],
    playbook: "用它补“字段怎么进表”，但真实平台采集要注意登录、频率、版权和平台规则。",
    promptSeed:
      "请作为带货样本池数据工程员工，拆解“阿青AI智能体”的小红书数据入库视频：输出字段表、流程图、可替代工具和合规风险。",
    researchVerdict: "这是“数据入库员工”的资料源，价值比普通运营课更高：它解决的是如何把爆款笔记从散落链接变成可筛选、可复盘的数据资产。",
    transferableAssets: ["Coze 工作流", "飞书自动写入", "字段去重", "采集失败回补"],
    operatingSteps: [
      "定义唯一键：平台 + 原始链接，避免重复入库。",
      "字段分成三层：原始数据、AI 拆解、人工判定，避免 AI 覆盖证据。",
      "每次采集后自动生成“待补证据”列表，让员工只处理高潜样本。"
    ],
    avoidCopying: [
      "不要默认自动采集一定稳定，登录、频率和平台规则都可能影响结果。",
      "不要让工具直接判断卖不卖，自动化只负责入库和初筛，最终仍要人工复核。"
    ],
    trackingTasks: [
      "把小红书样本池字段拆成原始字段、拆解字段、人工评分字段三张表。",
      "验证同类工具能否抓标题、互动、链接、封面、评论意图这五个关键字段。"
    ],
    relatedLeads: [
      {
        title: "Coze 工作流小红书数据入飞书",
        url: "https://www.bilibili.com/video/BV1zMbLzPEm1/",
        note: "当前样本原始页，用于复盘字段入库逻辑。"
      },
      {
        title: "Coze + 飞书多维表格智能体",
        url: "https://www.bilibili.com/video/BV1K1EYziE3F/",
        note: "推荐链里出现的智能体分析方向，可补 AI 拆解节点。"
      },
      {
        title: "自动抓取小红书关键热门笔记",
        url: "https://www.bilibili.com/video/BV1NoSWBKEsy/",
        note: "可作为采集稳定性和字段覆盖的对照样本。"
      }
    ]
  },
  {
    id: 204,
    platform: "小红书",
    sampleType: "资料源",
    accountName: "方老师运营小站",
    category: "拆解方法论",
    subCategory: "小红书爆款笔记公式",
    title: "小红书爆款笔记的万能公式",
    hook: "偏方法论，不重数据采集，但适合拆标题、封面、开头和内容结构。",
    visualPattern: "运营课口播 + 爆款笔记公式，适合作为新人学习资料。",
    whyValuable: "可用于培训员工理解小红书爆款结构，但不能直接作为选品证据。",
    nextAction: "核验该账号是否持续更新、是否有真实案例拆解，再决定是否长期追踪。",
    sourceLabel: "B站视频",
    sourceUrl: "https://www.bilibili.com/video/BV1TEwLzVEtN/",
    videoUrl: "https://www.bilibili.com/video/BV1TEwLzVEtN/",
    coverImage: "/daihuo-scout/covers/fanglaoshi-bili.png",
    coverAlt: "方老师运营小站 B站视频页真实截图",
    followers: "1034",
    likes: "待核验",
    comments: "1",
    saves: "待核验",
    shares: "待核验",
    views: "2012",
    publicationWindow: "2026-03-16",
    commentIntent: ["爆款公式", "小红书笔记", "套用", "运营"],
    productOpportunity: "不是商品机会，适合作为内容结构训练资料",
    scoreTotal: 72,
    scorePurchase: 8,
    scoreImitate: 26,
    scoreContrast: 14,
    scoreCommerce: 24,
    risk: "中",
    evidence: "C",
    tags: ["小红书", "公式", "方法论", "培训资料"],
    sourceStack: ["Jina 搜索", "B站结果页"],
    playbook: "只吸收框架，不照搬话术；每条方法必须落回真实类目样本验证。",
    promptSeed:
      "请作为内容拆解教练，拆解“方老师运营小站”的小红书爆款公式视频：提炼适合带货样本池的字段和判定标准。",
    researchVerdict: "这是新人训练型资料源，价值在于标题、封面、开头、内容结构的通用公式；但缺少商品、评论和成交证据，不能进入选品评分。",
    transferableAssets: ["标题公式", "封面检查项", "开头钩子模板", "新人培训素材"],
    operatingSteps: [
      "把“公式”拆成可勾选字段：人群、痛点、结果承诺、反差、场景、行动提示。",
      "让员工用 10 条真实女装/童装笔记套表检查，而不是直接复制标题。",
      "只把通过评论意图验证的公式放入脚本模板库。"
    ],
    avoidCopying: [
      "不要相信“套用就火”的绝对表述，必须用真实类目样本验证。",
      "不要把泛运营资料当选品证据，它最多是内容结构训练材料。"
    ],
    trackingTasks: [
      "抽取 20 个标题/封面公式，测试在女装、男装、童装三个类目是否都能成立。",
      "给每个公式补一个反例：什么场景下用了也不会卖。"
    ],
    relatedLeads: [
      {
        title: "小红书爆款底层逻辑是什么",
        url: "https://www.bilibili.com/video/BV13wHseKE1a/",
        note: "推荐链里更偏底层逻辑，可作为公式质量校验。"
      },
      {
        title: "快速打造千赞爆款笔记",
        url: "https://www.bilibili.com/video/BV1ft421T7Mn/",
        note: "同类方法论资料，适合对比标题/封面字段。"
      }
    ]
  },
  {
    id: 205,
    platform: "小红书",
    sampleType: "资料源",
    accountName: "大咖私域运营",
    category: "拆解方法论",
    subCategory: "小红书运营教程 / 爆款拆解",
    title: "小红书运营教程：爆款笔记公式与拆解方法",
    hook: "长教程多，适合系统学习小红书账号、SEO、封面、爆款笔记拆解。",
    visualPattern: "课程型内容，信息密度较高，适合拆成内部培训清单。",
    whyValuable: "适合当员工培训资料源，但需要二次筛掉泛运营和引流内容。",
    nextAction: "只抓“爆款笔记拆解、SEO、封面、账号诊断”相关视频，忽略泛引流教程。",
    sourceLabel: "B站空间",
    sourceUrl: "https://space.bilibili.com/2094083072",
    videoUrl: "https://www.bilibili.com/video/BV1CiWGzSEaB/",
    coverImage: "/daihuo-scout/covers/daka-private-bili.png",
    coverAlt: "大咖私域运营 B站视频页真实截图",
    followers: "1.2万",
    likes: "待核验",
    comments: "0",
    saves: "待核验",
    shares: "待核验",
    views: "909",
    publicationWindow: "2025-09-19",
    commentIntent: ["小红书运营", "爆款笔记", "账号诊断", "SEO"],
    productOpportunity: "不是商品机会，适合沉淀为小红书运营训练资料",
    scoreTotal: 70,
    scorePurchase: 8,
    scoreImitate: 24,
    scoreContrast: 12,
    scoreCommerce: 26,
    risk: "中",
    evidence: "C",
    tags: ["B站", "小红书运营", "教程", "爆款拆解"],
    sourceStack: ["Jina 搜索", "B站结果页", "B站空间"],
    playbook: "从它的系统课里抽标准字段，再用真实服装/童装/男装样本做验证。",
    promptSeed:
      "请作为带货培训员工，筛选“大咖私域运营”账号里适合爆款视频/笔记拆解的内容，输出值得学习、应该跳过、需要验证的清单。",
    researchVerdict: "这是系统课型资料源，账号粉丝和课程长度更适合做员工训练素材库；真正要留下的是 SEO、封面、账号诊断、爆款拆解四类能力。",
    transferableAssets: ["小红书 SEO", "账号诊断表", "封面/标题训练", "爆款笔记拆解课件"],
    operatingSteps: [
      "只筛“爆款笔记拆解、SEO、封面、账号诊断”四类内容。",
      "把每节课改写成内部检查表，不保存泛泛的运营口号。",
      "用真实带货账号跑一遍检查表，能发现问题的才留。"
    ],
    avoidCopying: [
      "不要收录泛引流、就业课、矩阵课等和当前带货选品无关的内容。",
      "不要让员工长时间刷系统课，必须边看边产出账号诊断表。"
    ],
    trackingTasks: [
      "从该账号推荐链里抓 5 条小红书 SEO/封面/账号诊断视频做二次筛选。",
      "沉淀一张《小红书带货账号诊断表》，用于判断账号是否值得跟踪。"
    ],
    relatedLeads: [
      {
        title: "小红书关键词搜索排名 SEO",
        url: "https://www.bilibili.com/video/BV1Kw4m1X7cm/",
        note: "推荐链出现的 SEO 长课，适合补搜索流量字段。"
      },
      {
        title: "小红书运营完整教学课程",
        url: "https://www.bilibili.com/video/BV1pkhqzMEnC/",
        note: "同账号长课，适合只截取账号诊断和爆款拆解章节。"
      }
    ]
  },
  {
    id: 206,
    platform: "抖音",
    sampleType: "资料源",
    accountName: "ProBoost产品创新",
    category: "拆解方法论",
    subCategory: "TikTok 带货视频结构拆解",
    title: "TikTok爆款短视频结构拆解",
    hook: "明确围绕 TikTok 带货视频结构、热销榜单、达人带货 GMV 等内容。",
    visualPattern: "短视频结构解析 + 热销榜单 + 达人建联，偏跨境电商资料源。",
    whyValuable: "虽然播放不高，但主题和带货强相关，适合作为“结构拆解字段”的参考。",
    nextAction: "把它的“视频解构”合集逐条看完，抽出适合国内抖音/快手的可迁移字段。",
    sourceLabel: "B站视频",
    sourceUrl: "https://www.bilibili.com/video/BV1Ene9eZEpR/",
    videoUrl: "https://www.bilibili.com/video/BV1Ene9eZEpR/",
    coverImage: "/daihuo-scout/covers/proboost-bili.png",
    coverAlt: "ProBoost产品创新 B站视频页真实截图",
    followers: "77",
    likes: "0",
    comments: "0",
    saves: "1",
    shares: "0",
    views: "63",
    publicationWindow: "待核验",
    commentIntent: ["TikTok", "带货视频", "结构拆解", "热销榜单", "达人GMV"],
    productOpportunity: "跨境热销榜单、达人建联、视频结构字段",
    scoreTotal: 76,
    scorePurchase: 14,
    scoreImitate: 24,
    scoreContrast: 14,
    scoreCommerce: 24,
    risk: "中",
    evidence: "B",
    tags: ["TikTok", "带货", "视频结构", "榜单", "跨境"],
    sourceStack: ["Jina 搜索", "B站视频页", "视频解构合集"],
    playbook: "低播放不代表无价值，它更像工具商的案例库；重点看字段，不看账号热度。",
    promptSeed:
      "请作为带货视频结构拆解员工，拆解 ProBoost 的 TikTok 爆款短视频结构内容：提炼视频结构、榜单字段、达人带货判断和可迁移到抖音/快手的部分。",
    researchVerdict: "这是跨境带货结构资料源，账号热度低但主题很准：视频结构、热销榜单、达人 GMV 和达人建联，可以迁移成国内带货样本的商业字段。",
    transferableAssets: ["视频结构字段", "热销榜单字段", "达人 GMV/粉丝比", "达人建联逻辑"],
    operatingSteps: [
      "把每条视频拆成：前 3 秒钩子、商品露出、痛点证明、使用场景、信任背书、行动提示。",
      "热销榜单只当选品方向，必须再回到国内抖音/快手/小红书验证。",
      "达人数据看 GMV 与粉丝关系，不只看粉丝量。"
    ],
    avoidCopying: [
      "不要因为播放低就丢掉，它更像字段参考库，不是爆款账号样本。",
      "不要直接照搬 TikTok 商品，国内平台还要补供应、合规和内容适配。"
    ],
    trackingTasks: [
      "把“视频解构”合集 6 条逐条转成短视频结构字段。",
      "建立达人判断字段：粉丝量、GMV、单品重复出现、内容稳定性、建联价值。"
    ],
    relatedLeads: [
      {
        title: "视频解构合集",
        url: "https://space.bilibili.com/3546578816076316/channel/collectiondetail?sid=3284085",
        note: "6 条短视频结构拆解，适合批量提炼字段。"
      },
      {
        title: "TikTok 美区小店热销排行榜",
        url: "https://www.bilibili.com/video/BV1pZ42147Gp/",
        note: "适合补热销榜单字段，但不能直接当国内选品证据。"
      },
      {
        title: "达人带货 GMV 与粉丝数关系",
        url: "https://www.bilibili.com/video/BV1pEvrevEvd/",
        note: "适合补达人商业价值判断字段。"
      }
    ]
  }
];

const iconMap: Record<string, LucideIcon> = {
  total: Sparkles,
  intent: ShoppingBag,
  imitate: Camera,
  contrast: BadgeCheck,
  commerce: TrendingUp
};

const platformToneClass: Record<Platform, string> = {
  抖音: "douyin",
  快手: "kuaishou",
  小红书: "xiaohongshu"
};

const reviewToneClass: Record<ReviewStatus, string> = {
  未看: "pending",
  已打开: "opened",
  已复盘: "reviewed",
  不跟: "dropped"
};

export function DaihuoScoutPool() {
  const [platform, setPlatform] = useState<Platform | "全部">("抖音");
  const [sampleType, setSampleType] = useState<SampleType | "全部">("全部");
  const [category, setCategory] = useState("全部");
  const [risk, setRisk] = useState<RiskLevel | "全部">("全部");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatus | "全部">("全部");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("总分优先");
  const [selectedId, setSelectedId] = useState<number>(201);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);
  const [reviewRecords, setReviewRecords] = useState<Record<number, ReviewRecord>>({});
  const [reviewLoaded, setReviewLoaded] = useState(false);
  const [douyinLeads, setDouyinLeads] = useState<DouyinLead[]>([]);
  const [douyinLeadDraft, setDouyinLeadDraft] = useState<DouyinLeadDraft>(DEFAULT_DOUYIN_LEAD_DRAFT);
  const [activeView, setActiveView] = useState<WorkbenchView>("总览");
  const draftScore = scoreDouyinLead(douyinLeadDraft);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REVIEW_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Partial<ReviewRecord>>;
        const normalized = Object.entries(parsed).reduce<Record<number, ReviewRecord>>((acc, [id, record]) => {
          if (!record || !isReviewStatus(record.status)) return acc;
          acc[Number(id)] = {
            status: record.status,
            note: typeof record.note === "string" ? record.note : "",
            updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : ""
          };
          return acc;
        }, {});
        setReviewRecords(normalized);
      }
    } catch {
      setReviewRecords({});
    } finally {
      setReviewLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!reviewLoaded) return;
    persistReviewRecords(reviewRecords);
  }, [reviewLoaded, reviewRecords]);

  useEffect(() => {
    let cancelled = false;

    async function loadDouyinLeads() {
      let loadedLeads: DouyinLead[] | null = null;

      try {
        const response = await fetch("/api/daihuo-scout/leads", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json() as { leads?: unknown };
          if (Array.isArray(payload.leads)) {
            loadedLeads = payload.leads.map(normalizeDouyinLead).filter((lead): lead is DouyinLead => Boolean(lead));
          }
        }
      } catch {
        loadedLeads = null;
      }

      if (!loadedLeads) loadedLeads = readDouyinLeadsFromBrowserStorage();
      if (cancelled) return;

      setDouyinLeads(loadedLeads ?? []);
    }

    void loadDouyinLeads();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return samples
      .filter((item) => {
        const itemReview = getReviewRecord(reviewRecords, item.id);
        const matchesPlatform = platform === "全部" || item.platform === platform;
        const matchesType = sampleType === "全部" || item.sampleType === sampleType;
        const matchesCategory = category === "全部" || item.category === category;
        const matchesRisk = risk === "全部" || item.risk === risk;
        const matchesReviewStatus = reviewStatusFilter === "全部" || itemReview.status === reviewStatusFilter;
        const haystack = [
          item.accountName,
          item.title,
          item.hook,
          item.visualPattern,
          item.whyValuable,
          item.nextAction,
          item.category,
          item.subCategory,
          item.tags.join(" "),
          item.commentIntent.join(" "),
          item.productOpportunity,
          item.playbook,
          item.researchVerdict ?? "",
          item.transferableAssets?.join(" ") ?? "",
          item.operatingSteps?.join(" ") ?? "",
          item.avoidCopying?.join(" ") ?? "",
          item.trackingTasks?.join(" ") ?? "",
          item.relatedLeads?.map((lead) => `${lead.title} ${lead.note}`).join(" ") ?? "",
          itemReview.status,
          itemReview.note
        ]
          .join(" ")
          .toLowerCase();
        return (
          matchesPlatform &&
          matchesType &&
          matchesCategory &&
          matchesRisk &&
          matchesReviewStatus &&
          (!q || haystack.includes(q))
        );
      })
      .sort((a, b) => {
        if (sortMode === "购买意图") return b.scorePurchase - a.scorePurchase || b.scoreTotal - a.scoreTotal;
        if (sortMode === "可模仿性") return b.scoreImitate - a.scoreImitate || b.scoreTotal - a.scoreTotal;
        if (sortMode === "近期热度") return parseWindow(b.publicationWindow) - parseWindow(a.publicationWindow) || b.scoreTotal - a.scoreTotal;
        return b.scoreTotal - a.scoreTotal;
      });
  }, [category, platform, query, reviewRecords, reviewStatusFilter, risk, sampleType, sortMode]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? samples[0];
  const selectedReview = getReviewRecord(reviewRecords, selected.id);
  const viewCards: Array<{
    view: Exclude<WorkbenchView, "总览">;
    label: string;
    description: string;
    signal: string;
    action: string;
    index: string;
    accent: string;
  }> = [
    {
      view: "侦察入口",
      label: "找方向",
      description: "把抖音搜索入口、采样任务和入池口径放在同一个入口里，先找值得看的方向。",
      signal: `${douyinSamplingMissions.length} 个任务`,
      action: "进入侦察",
      index: "01",
      accent: "入口"
    },
    {
      view: "线索采样",
      label: "录线索",
      description: "看到具体视频或账号后，快速记录链接、爆点、评论购买意图和商品线索。",
      signal: `${douyinLeads.length} 条线索`,
      action: "开始采样",
      index: "02",
      accent: "采样"
    },
    {
      view: "样本池",
      label: "筛样本",
      description: "把已沉淀的账号和视频按平台、类目、风险、复盘状态筛选，挑出可复刻样本。",
      signal: `${filtered.length} 个匹配`,
      action: "打开样本池",
      index: "03",
      accent: "样本"
    },
    {
      view: "拆解详情",
      label: "出 prompt",
      description: "进入当前样本详情页，补本地复盘，并复制给 Codex 继续做深度拆解。",
      signal: selected.accountName,
      action: "进入拆解",
      index: "04",
      accent: "拆解"
    }
  ];
  const activeCard = viewCards.find((card) => card.view === activeView);

  const summaryPrompt = useMemo(() => {
    if (!selected) return "";
    const reviewNote = selectedReview.note.trim();
    return [
      "你是带货选品数据员工。请只基于以下样本做拆解，不要泛泛而谈。",
      `平台：${selected.platform}`,
      `账号/样本：${selected.accountName} / ${selected.sampleType}`,
      `类目：${selected.category} / ${selected.subCategory}`,
      `标题：${selected.title}`,
      `爆点：${selected.hook}`,
      `画面模式：${selected.visualPattern}`,
      `购买意图：${selected.commentIntent.join("、")}`,
      `商品机会：${selected.productOpportunity}`,
      `下一步补数：${selected.nextAction}`,
      ...(selected.researchVerdict ? [`深研结论：${selected.researchVerdict}`] : []),
      ...(selected.transferableAssets?.length ? [`可迁移资产：${selected.transferableAssets.join("、")}`] : []),
      ...(selected.operatingSteps?.length ? [`落地步骤：${selected.operatingSteps.join("；")}`] : []),
      ...(selected.avoidCopying?.length ? [`不要照搬：${selected.avoidCopying.join("；")}`] : []),
      ...(selected.trackingTasks?.length ? [`追踪任务：${selected.trackingTasks.join("；")}`] : []),
      ...(selected.platform === "抖音"
        ? [
            "抖音专项要求：先判断它是真实带货样本、账号样本、方法入口还是纯流量内容；必须检查是否有挂车/商品词/评论购买意图/账号连续爆款；不要把搜索页本身当成交证据。"
          ]
        : []),
      `本地复盘状态：${selectedReview.status}`,
      ...(reviewNote ? [`我的复盘笔记：${reviewNote}`] : []),
      "请输出：1. 是否值得继续；2. 爆点结构；3. 可复刻动作；4. 风险表；5. 下一步补数任务；6. 适合的商品池。"
    ].join("\n");
  }, [selected, selectedReview.note, selectedReview.status]);

  function updateReview(id: number, patch: Partial<Omit<ReviewRecord, "updatedAt">>) {
    setReviewRecords((current) => {
      const next = {
        ...current,
        [id]: {
          ...getReviewRecord(current, id),
          ...patch,
          updatedAt: new Date().toISOString()
        }
      };
      persistReviewRecords(next);
      return next;
    });
  }

  function markOpened(id: number) {
    setReviewRecords((current) => {
      const currentReview = getReviewRecord(current, id);
      if (currentReview.status === "已复盘" || currentReview.status === "不跟") return current;
      const next = {
        ...current,
        [id]: {
          ...currentReview,
          status: "已打开" as ReviewStatus,
          updatedAt: new Date().toISOString()
        }
      };
      persistReviewRecords(next);
      return next;
    });
  }

  function activateDouyinMode(mode: "all" | "source" | "apparel") {
    setPlatform("抖音");
    setRisk("全部");
    setReviewStatusFilter("全部");
    setQuery("");
    setActiveView("样本池");
    if (mode === "source") {
      setSampleType("资料源");
      setCategory("拆解方法论");
      setSelectedId(201);
      return;
    }
    if (mode === "apparel") {
      setSampleType("全部");
      setCategory("女装");
      setSelectedId(106);
      return;
    }
    setSampleType("全部");
    setCategory("全部");
    setSelectedId(201);
  }

  function updateDouyinLeadDraft(patch: Partial<DouyinLeadDraft>) {
    setDouyinLeadDraft((current) => ({ ...current, ...patch }));
  }

  function applySamplingMission(mission: DouyinSamplingMission) {
    setPlatform("抖音");
    setSampleType(mission.sampleKind === "账号" ? "账号" : "视频");
    setCategory(mission.category);
    setQuery(mission.query);
    setActiveView("线索采样");
    setDouyinLeadDraft((current) => ({
      ...current,
      ...mission.draft,
      category: mission.category,
      sampleKind: mission.sampleKind,
      note: [
        `采样任务：${mission.title}`,
        `合格线：${mission.passLine}`,
        `必填：${mission.mustCapture.join("、")}`
      ].join("；")
    }));
  }

  function saveDouyinLead() {
    const sourceUrl = douyinLeadDraft.sourceUrl.trim();
    if (!sourceUrl) return;
    const nextLead: DouyinLead = {
      ...douyinLeadDraft,
      sourceUrl,
      accountName: douyinLeadDraft.accountName.trim(),
      title: douyinLeadDraft.title.trim(),
      hook: douyinLeadDraft.hook.trim(),
      commentIntent: douyinLeadDraft.commentIntent.trim(),
      productSignal: douyinLeadDraft.productSignal.trim(),
      evidence: douyinLeadDraft.evidence.trim(),
      note: douyinLeadDraft.note.trim(),
      id: createLeadId(),
      status: "待拆解",
      createdAt: new Date().toISOString()
    };
    const next = [nextLead, ...douyinLeads];
    setDouyinLeads(next);
    void persistDouyinLeads(next);
    setActiveView("线索采样");
    setDouyinLeadDraft({
      ...DEFAULT_DOUYIN_LEAD_DRAFT,
      category: douyinLeadDraft.category,
      sampleKind: douyinLeadDraft.sampleKind
    });
  }

  function updateDouyinLead(id: string, patch: Partial<DouyinLead>) {
    const next = douyinLeads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead));
    setDouyinLeads(next);
    void persistDouyinLeads(next);
  }

  function deleteDouyinLead(id: string) {
    const next = douyinLeads.filter((lead) => lead.id !== id);
    setDouyinLeads(next);
    void persistDouyinLeads(next);
  }

  async function copyPrompt(text: string, id: number) {
    await copyText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1300);
  }

  async function copyLeadPrompt(lead: DouyinLead) {
    await copyText(buildDouyinLeadPrompt(lead));
    setCopiedLeadId(lead.id);
    updateDouyinLead(lead.id, { status: "已复制" });
    window.setTimeout(() => setCopiedLeadId(null), 1300);
  }

  return (
    <main className="scout-workbench">
      <header className="scout-hero">
        <div className="scout-hero-copy">
          <p className="scout-kicker">Daihuo scout desk</p>
          <h1>先把样本看准，再让 AI 员工动手</h1>
          <p>
            主界面只负责划清流程边界。侦察、采样、筛选、拆解分别进入独立工作区，避免所有信息从上到下铺开。
          </p>
        </div>

        <div className="scout-hero-note">
          <Sparkles />
          <span>当前优先吃透抖音。搜索入口只负责发现线索，真正入池必须落到具体视频、账号主页、评论购买意图和商品/供给证据。</span>
        </div>
      </header>

      {activeView === "总览" ? (
        <section className="scout-home" aria-label="带货侦察模块总览">
          <div className="scout-home-head">
            <div>
              <p>四个平行页面</p>
              <h2>今天只需要进入一个工作区</h2>
            </div>
            <div className="scout-home-stats" aria-label="当前状态">
              <span>{douyinLeads.length} 条抖音线索</span>
              <span>{filtered.length} 个匹配样本</span>
              <span>{selected.accountName}</span>
            </div>
          </div>

          <div className="scout-module-grid">
            {viewCards.map((card) => (
              <button
                key={card.view}
                type="button"
                className="scout-module-card"
                aria-label={`${card.action}：${card.description}`}
                onClick={() => setActiveView(card.view)}
              >
                <span className="scout-module-index">{card.index}</span>
                <span className="scout-module-accent">{card.accent}</span>
                <strong>{card.view}</strong>
                <small>{card.label}</small>
                <p>{card.description}</p>
                <b>
                  {card.signal}
                  <ChevronRight />
                </b>
              </button>
            ))}
          </div>

          <div className="scout-home-links">
            <button type="button" onClick={() => activateDouyinMode("all")}>
              <Search />
              直接看抖音样本
            </button>
            <a href="/image2-cases">
              <Link2 />
              场景配方库
            </a>
            <a href="https://github.com/NanmiCoder/MediaCrawler" target="_blank" rel="noreferrer">
              <ExternalLink />
              MediaCrawler
            </a>
          </div>
        </section>
      ) : (
        <section className="scout-stage-shell" aria-label={`${activeView}嵌入工作区`}>
          <div className="scout-stage-toolbar">
            <button type="button" className="scout-back-button" onClick={() => setActiveView("总览")}>
              <ArrowLeft />
              主界面
            </button>
            <div>
              <p>{activeCard?.label}</p>
              <h2>{activeView}</h2>
            </div>
            <nav className="scout-module-strip" aria-label="切换平行页面">
              {viewCards.map((card) => (
                <button
                  key={card.view}
                  type="button"
                  className={activeView === card.view ? "active" : ""}
                  title={card.action}
                  onClick={() => setActiveView(card.view)}
                >
                  <span>{card.index}</span>
                  {card.view}
                </button>
              ))}
            </nav>
          </div>

          {activeView === "侦察入口" ? (
      <section className="douyin-command embedded" aria-label="抖音侦察资源">
        <div className="douyin-command-head">
          <div>
            <p>Douyin First · 已登录可用</p>
            <h2>抖音侦察台</h2>
            <span>先用搜索页发现样本，再人工点开视频/主页复盘。入口图只作导航，具体视频截图才算高质量封面。</span>
          </div>
          <div className="douyin-command-actions">
            <button type="button" onClick={() => activateDouyinMode("source")}>只看抖音入口</button>
            <button type="button" onClick={() => activateDouyinMode("apparel")}>先看女装</button>
            <button type="button" onClick={() => activateDouyinMode("all")}>全部抖音</button>
          </div>
        </div>

        <div className="douyin-entry-grid">
          {douyinScoutEntries.map((entry) => (
            <a key={entry.title} href={entry.url} onClick={() => entry.query ? setQuery(entry.query) : undefined}>
              <span>{entry.tag}</span>
              <strong>{entry.title}</strong>
              <p>{entry.purpose}</p>
              <small>{entry.keepWhen}</small>
            </a>
          ))}
        </div>

        <div className="douyin-mission-board" aria-label="抖音采样任务板">
          <div className="douyin-mission-head">
            <strong>本轮采样任务</strong>
            <span>每轮先按一个任务采 3 条候选，低于合格线不录入。</span>
          </div>
          <div className="douyin-mission-grid">
            {douyinSamplingMissions.map((mission) => (
              <article key={mission.title}>
                <div>
                  <span>{mission.category}</span>
                  <strong>{mission.title}</strong>
                  <p>{mission.goal}</p>
                </div>
                <small>{mission.passLine}</small>
                <ul>
                  {mission.mustCapture.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="douyin-mission-actions">
                  <a href={douyinSearchUrl(mission.query)} onClick={() => applySamplingMission(mission)}>
                    <ExternalLink />
                    打开搜索
                  </a>
                  <button type="button" onClick={() => applySamplingMission(mission)}>
                    预填采样
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="douyin-checkline">
          <strong>入池口径</strong>
          <span>具体链接</span>
          <span>账号连续性</span>
          <span>评论购买意图</span>
          <span>商品/挂车线索</span>
          <span>可模仿画面</span>
          <span>供给/佣金待补</span>
        </div>
      </section>
          ) : null}

          {activeView === "线索采样" ? (
      <section className="douyin-capture embedded" aria-label="抖音采样工作台">
        <div className="douyin-capture-head">
          <div>
            <p>Sample Intake · 手工录入</p>
            <h2>抖音采样工作台</h2>
            <span>看到值得拆的视频或账号，就把链接和判断先落到这里。保存后复制 prompt，让 Codex 按选品员工标准拆解。</span>
          </div>
          <strong>{douyinLeads.length} 条本地线索</strong>
        </div>

        <div className="douyin-capture-grid">
          <label className="wide">
            抖音视频/账号链接
            <input
              value={douyinLeadDraft.sourceUrl}
              onChange={(event) => updateDouyinLeadDraft({ sourceUrl: event.target.value })}
              placeholder="粘贴 https://www.douyin.com/... 或账号主页链接"
            />
          </label>
          <label>
            账号名
            <input
              value={douyinLeadDraft.accountName}
              onChange={(event) => updateDouyinLeadDraft({ accountName: event.target.value })}
              placeholder="例如：宝宝穿搭不踩坑"
            />
          </label>
          <label>
            样本类型
            <select
              value={douyinLeadDraft.sampleKind}
              onChange={(event) => updateDouyinLeadDraft({ sampleKind: event.target.value as DouyinLeadKind })}
            >
              {douyinLeadKinds.map((kind) => (
                <option key={kind} value={kind}>{kind}</option>
              ))}
            </select>
          </label>
          <label>
            类目
            <select
              value={douyinLeadDraft.category}
              onChange={(event) => updateDouyinLeadDraft({ category: event.target.value })}
            >
              {categories.filter((item) => item !== "全部").map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="wide">
            标题/一句话描述
            <input
              value={douyinLeadDraft.title}
              onChange={(event) => updateDouyinLeadDraft({ title: event.target.value })}
              placeholder="例如：萌娃跳舞穿小裙子，评论区一直问同款"
            />
          </label>
          <label>
            前 3 秒爆点
            <textarea
              value={douyinLeadDraft.hook}
              onChange={(event) => updateDouyinLeadDraft({ hook: event.target.value })}
              placeholder="反差、动作、画面、痛点..."
            />
          </label>
          <label>
            评论购买意图
            <textarea
              value={douyinLeadDraft.commentIntent}
              onChange={(event) => updateDouyinLeadDraft({ commentIntent: event.target.value })}
              placeholder="同款、链接、尺码、面料、多少钱、哪里买..."
            />
          </label>
          <label>
            商品/挂车线索
            <textarea
              value={douyinLeadDraft.productSignal}
              onChange={(event) => updateDouyinLeadDraft({ productSignal: event.target.value })}
              placeholder="挂车商品、品类、价格带、品牌、达人橱窗..."
            />
          </label>
          <label>
            证据和风险
            <textarea
              value={douyinLeadDraft.evidence}
              onChange={(event) => updateDouyinLeadDraft({ evidence: event.target.value })}
              placeholder="播放/赞评收藏、账号连续性、擦边风险、退货风险..."
            />
          </label>
          <label className="wide">
            人工备注
            <input
              value={douyinLeadDraft.note}
              onChange={(event) => updateDouyinLeadDraft({ note: event.target.value })}
              placeholder="下一步要补什么数据，或者为什么值得拆"
            />
          </label>
        </div>

        <div className="douyin-capture-actions">
          <div className={`douyin-lead-score ${getDouyinLeadScoreTone(draftScore.level)}`}>
            <strong>{draftScore.total}</strong>
            <span>{draftScore.level}</span>
            <small>{draftScore.missing.length ? `缺：${draftScore.missing.join("、")}` : "证据完整，可以进入人工拆解。"}</small>
          </div>
          <div className="douyin-score-breakdown" aria-label="抖音线索初筛分">
            {draftScore.items.map((item) => (
              <span key={item.label} title={item.reason}>
                {item.label} {item.value}/{item.max}
              </span>
            ))}
          </div>
          <div className="douyin-evidence-tasks">
            <strong>下一步补证据</strong>
            <ul>
              {buildDouyinEvidenceTasks(douyinLeadDraft).map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </div>
          <button type="button" onClick={saveDouyinLead} disabled={!douyinLeadDraft.sourceUrl.trim()}>
            <ClipboardCheck />
            保存为待拆解线索
          </button>
          <button type="button" onClick={() => setDouyinLeadDraft(DEFAULT_DOUYIN_LEAD_DRAFT)}>
            清空
          </button>
        </div>

        <div className="douyin-lead-list">
          {douyinLeads.length ? (
            douyinLeads.map((lead) => {
              const leadScore = scoreDouyinLead(lead);
              return (
                <article key={lead.id}>
                  <div className="douyin-lead-main">
                    <span>{lead.status}</span>
                    <span className={`douyin-lead-score-chip ${getDouyinLeadScoreTone(leadScore.level)}`}>
                      {leadScore.total} · {leadScore.level}
                    </span>
                    <strong>{lead.title || lead.accountName || lead.sourceUrl}</strong>
                    <p>{lead.hook || lead.note || "待补爆点和人工判断。"}</p>
                    <small>{lead.category} · {lead.sampleKind} · {formatReviewTime(lead.createdAt)}</small>
                  </div>
                  <div className="douyin-lead-actions">
                    <a href={lead.sourceUrl} onClick={() => updateDouyinLead(lead.id, { status: "待拆解" })}>
                      <ExternalLink />
                      打开
                    </a>
                    <button type="button" onClick={() => void copyLeadPrompt(lead)}>
                      {copiedLeadId === lead.id ? <ClipboardCheck /> : <Clipboard />}
                      {copiedLeadId === lead.id ? "已复制" : "复制 prompt"}
                    </button>
                    <select value={lead.status} onChange={(event) => updateDouyinLead(lead.id, { status: event.target.value as DouyinLeadStatus })}>
                      {douyinLeadStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <button type="button" className="danger" onClick={() => deleteDouyinLead(lead.id)}>
                      删除
                    </button>
                  </div>
                  <div className="douyin-lead-tasks">
                    {buildDouyinEvidenceTasks(lead).map((task) => (
                      <span key={task}>{task}</span>
                    ))}
                  </div>
                  <textarea
                    className="douyin-lead-prompt"
                    readOnly
                    value={buildDouyinLeadPrompt(lead)}
                    aria-label={`${lead.title || lead.accountName || "抖音线索"}的 Codex 拆解 prompt`}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                </article>
              );
            })
          ) : (
            <div className="douyin-lead-empty">还没有抖音线索。先从上面的入口打开抖音，看到具体视频或账号后再回来录入。</div>
          )}
        </div>
      </section>
          ) : null}

          {activeView === "样本池" ? (
      <section className="scout-layout embedded sample-pool-view">
        <aside className="scout-sidebar" aria-label="样本筛选">
          <div className="scout-search">
            <Search />
            <input
              aria-label="搜索样本"
              placeholder="搜账号、标题、爆点、评论意图、商品机会..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <FilterGroup
            label="平台"
            value={platform}
            options={platforms}
            onChange={(value) => setPlatform(value as Platform | "全部")}
          />
          <FilterGroup
            label="样本类型"
            value={sampleType}
            options={sampleTypes}
            onChange={(value) => setSampleType(value as SampleType | "全部")}
          />
          <FilterGroup label="类目" value={category} options={categories} onChange={setCategory} wide />
          <FilterGroup label="风险" value={risk} options={riskLevels} onChange={(value) => setRisk(value as RiskLevel | "全部")} />
          <FilterGroup
            label="复盘状态"
            value={reviewStatusFilter}
            options={reviewStatuses}
            onChange={(value) => setReviewStatusFilter(value as ReviewStatus | "全部")}
          />
          <FilterGroup label="排序" value={sortMode} options={sortModes} onChange={(value) => setSortMode(value as SortMode)} />

          <section className="scout-playbook">
            <h2>样本池规则</h2>
            <ul>
              <li>抖音搜索页只算入口，不算成交证据。</li>
              <li>先点具体视频和账号主页，再写本地复盘。</li>
              <li>评论区里有“链接、同款、尺码、哪里买”才算高价值。</li>
              <li>能被团队复刻、且商品线索清楚的样本，优先进入选品卡。</li>
            </ul>
          </section>
        </aside>

        <section className="scout-gallery" aria-label="高价值样本列表">
          <div className="scout-gallery-head">
            <div>
              <p>{filtered.length} 个匹配样本</p>
              <h2>高价值账号 / 视频样本池</h2>
            </div>
            <button type="button" className="scout-ghost-button">
              <ArrowUpDown />
              <span>按分值查看</span>
            </button>
          </div>

          <div className="scout-grid">
            {filtered.map((item) => {
              const itemReview = getReviewRecord(reviewRecords, item.id);
              return (
                <article
                  key={item.id}
                  className={selected?.id === item.id ? "scout-card active" : "scout-card"}
                >
                  <button
                    type="button"
                    className="scout-card-select"
                    onClick={() => {
                      setSelectedId(item.id);
                      setActiveView("拆解详情");
                    }}
                  >
                    <div className="scout-cover">
                      <img src={item.coverImage} alt={item.coverAlt} />
                      <span className={`platform-chip ${platformToneClass[item.platform]}`}>{item.platform}</span>
                      <span className="sample-chip">{item.sampleType}</span>
                      <span className={`scout-card-status ${reviewToneClass[itemReview.status]}`}>{itemReview.status}</span>
                      <span className="score-chip">
                        <Award />
                        {item.scoreTotal}
                      </span>
                    </div>

                    <div className="scout-card-body">
                      <div className="scout-card-meta">
                        <small>{item.accountName}</small>
                        <span>{item.category}</span>
                      </div>
                      <strong>{item.title}</strong>
                      <p>{item.hook}</p>
                      <div className="scout-mini-tags">
                        {item.tags.slice(0, 4).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                      {itemReview.note.trim() ? <p className="scout-card-note">{itemReview.note}</p> : null}
                      <footer>
                        <div>
                          <b>{item.views}</b>
                          <span>播放</span>
                        </div>
                        <div>
                          <b>{item.comments}</b>
                          <span>评论</span>
                        </div>
                        <div>
                          <b>{item.scoreCommerce}</b>
                          <span>商业</span>
                        </div>
                      </footer>
                    </div>
                  </button>

                  <div className="scout-card-linkbar">
                    <a
                      href={item.videoUrl}
                      aria-label={`打开${item.accountName}的${getPrimaryLinkLabel(item)}`}
                      onClick={() => markOpened(item.id)}
                    >
                      <Play />
                      {getPrimaryLinkLabel(item)}
                    </a>
                    {item.sourceUrl !== item.videoUrl ? (
                      <a
                        href={item.sourceUrl}
                        aria-label={`打开${item.accountName}的来源页`}
                        onClick={() => markOpened(item.id)}
                      >
                        <ExternalLink />
                        {getSecondaryLinkLabel(item)}
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
          ) : null}

          {activeView === "拆解详情" ? (
      <section className="scout-layout embedded detail-only-view">
        <aside className="scout-detail" aria-label="样本详情">
          <img src={selected.coverImage} alt={selected.coverAlt} className="scout-detail-cover" />
          <div className="scout-detail-body">
            <p className="scout-detail-kicker">
              {selected.platform} · {selected.sampleType} · {selected.evidence} 级证据
            </p>
            <h2>{selected.accountName}</h2>
            <p className="scout-detail-title">{selected.title}</p>

            <div className="scout-source-actions" aria-label="外部样本入口">
              <a className="primary" href={selected.videoUrl} onClick={() => markOpened(selected.id)}>
                <Play />
                {getPrimaryLinkLabel(selected)}
              </a>
              {selected.sourceUrl !== selected.videoUrl ? (
                <a href={selected.sourceUrl} onClick={() => markOpened(selected.id)}>
                  <ExternalLink />
                  {getSecondaryLinkLabel(selected)}
                </a>
              ) : null}
            </div>

            <div className="scout-score-grid">
              <ScoreBadge label="总分" value={selected.scoreTotal} tone="total" />
              <ScoreBadge label="购买意图" value={selected.scorePurchase} tone="intent" />
              <ScoreBadge label="可模仿性" value={selected.scoreImitate} tone="imitate" />
              <ScoreBadge label="反差力" value={selected.scoreContrast} tone="contrast" />
              <ScoreBadge label="商业性" value={selected.scoreCommerce} tone="commerce" />
            </div>

            <div className="scout-review-panel">
              <div className="scout-review-head">
                <h3>本地复盘</h3>
                <span>{selectedReview.updatedAt ? `更新 ${formatReviewTime(selectedReview.updatedAt)}` : "保存于本地浏览器"}</span>
              </div>
              <div className="scout-review-status-row" aria-label="复盘状态">
                {reviewStatuses
                  .filter((status): status is ReviewStatus => status !== "全部")
                  .map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={selectedReview.status === status ? "scout-review-status-button active" : "scout-review-status-button"}
                      onClick={() => updateReview(selected.id, { status })}
                    >
                      {status}
                    </button>
                  ))}
              </div>
              <textarea
                className="scout-note-textarea"
                value={selectedReview.note}
                onChange={(event) => updateReview(selected.id, { note: event.target.value })}
                placeholder="看完视频后记录：爆点、可模仿动作、商品线索、风险、下一步..."
              />
            </div>

            <div className="scout-detail-block">
              <h3>为什么值得拆</h3>
              <p>{selected.whyValuable}</p>
            </div>

            {selected.researchVerdict ? (
              <div className="scout-research-callout">
                <span>深研结论</span>
                <strong>{selected.researchVerdict}</strong>
              </div>
            ) : null}

            {selected.transferableAssets?.length ? (
              <div className="scout-detail-block">
                <h3>可迁移资产</h3>
                <div className="scout-chip-row scout-chip-row-accent">
                  {selected.transferableAssets.map((asset) => (
                    <span key={asset}>{asset}</span>
                  ))}
                </div>
              </div>
            ) : null}

            <DetailList title="落地步骤" items={selected.operatingSteps} />
            <DetailList title="不要照搬" items={selected.avoidCopying} tone="warning" />
            <DetailList title="追踪任务" items={selected.trackingTasks} />

            {selected.relatedLeads?.length ? (
              <div className="scout-detail-block">
                <h3>关联线索</h3>
                <div className="scout-related-list">
                  {selected.relatedLeads.map((lead) => (
                    <a key={lead.url} href={lead.url}>
                      <strong>
                        {lead.title}
                        <ExternalLink />
                      </strong>
                      <span>{lead.note}</span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="scout-detail-block">
              <h3>爆点结构</h3>
              <ul>
                <li>
                  <strong>钩子：</strong>
                  {selected.hook}
                </li>
                <li>
                  <strong>画面：</strong>
                  {selected.visualPattern}
                </li>
                <li>
                  <strong>评论意图：</strong>
                  {selected.commentIntent.join("、")}
                </li>
                <li>
                  <strong>商品机会：</strong>
                  {selected.productOpportunity}
                </li>
              </ul>
            </div>

            <div className="scout-detail-grid">
              <div>
                <span>粉丝</span>
                <b>{selected.followers}</b>
              </div>
              <div>
                <span>近况</span>
                <b>{selected.publicationWindow}</b>
              </div>
              <div>
                <span>风险</span>
                <b>{selected.risk}</b>
              </div>
              <div>
                <span>证据</span>
                <b>{selected.evidence}</b>
              </div>
            </div>

            <div className="scout-detail-block">
              <h3>下一步</h3>
              <p>{selected.nextAction}</p>
            </div>

            <div className="scout-detail-block">
              <h3>可直接复制给 Codex 的 prompt</h3>
              <pre>{summaryPrompt}</pre>
              <div className="scout-actions">
                <button type="button" onClick={() => void copyPrompt(summaryPrompt, selected.id)}>
                  {copiedId === selected.id ? <ClipboardCheck /> : <Clipboard />}
                  {copiedId === selected.id ? "已复制" : "复制给 Codex"}
                </button>
                <a href={selected.videoUrl} onClick={() => markOpened(selected.id)}>
                  <Play />
                  原始样本
                </a>
              </div>
            </div>

            <div className="scout-detail-block">
              <h3>侦察来源</h3>
              <div className="scout-chip-row">
                {selected.sourceStack.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>

            <div className="scout-detail-block">
              <h3>样本线索</h3>
              <p>{selected.playbook}</p>
            </div>
          </div>
        </aside>
      </section>
          ) : null}
        </section>
      )}
    </main>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
  wide = false
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <section className={`scout-filter ${wide ? "wide" : ""}`}>
      <h2>{label}</h2>
      <div className="scout-filter-grid">
        {options.map((option) => (
          <button key={option} type="button" className={value === option ? "active" : ""} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}

function ScoreBadge({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: keyof typeof iconMap;
}) {
  const Icon = iconMap[tone];
  return (
    <div className={`score-badge ${tone}`}>
      <Icon />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailList({ title, items, tone }: { title: string; items?: string[]; tone?: "warning" }) {
  if (!items?.length) return null;

  return (
    <div className={`scout-detail-block ${tone === "warning" ? "scout-detail-block-warning" : ""}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function getPrimaryLinkLabel(sample: Sample) {
  if (sample.videoUrl.includes("/search/")) return "看搜索页";
  if (sample.sampleType === "账号") return "看主页";
  return "看视频";
}

function getSecondaryLinkLabel(sample: Sample) {
  if (sample.sourceUrl.includes("space.bilibili.com")) return "看账号主页";
  if (sample.sourceUrl.includes("/search/")) return "看搜索页";
  return "看来源";
}

function douyinSearchUrl(query: string) {
  return `https://www.douyin.com/search/${encodeURIComponent(query)}`;
}

async function copyText(text: string) {
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch {
    copied = false;
  }

  if (!copied) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.inset = "0 auto auto 0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function buildDouyinLeadPrompt(lead: DouyinLead) {
  const leadScore = scoreDouyinLead(lead);
  const evidenceTasks = buildDouyinEvidenceTasks(lead);
  return [
    "你是带货选品数据员工。请只基于下面这个抖音线索做拆解，不能泛泛而谈。",
    `抖音链接：${lead.sourceUrl}`,
    `账号名：${lead.accountName || "待补"}`,
    `样本类型：${lead.sampleKind}`,
    `类目：${lead.category}`,
    `初筛评分：${leadScore.total}/100（${leadScore.level}）`,
    `评分拆分：${leadScore.items.map((item) => `${item.label}${item.value}/${item.max}`).join("；")}`,
    `证据缺口：${leadScore.missing.length ? leadScore.missing.join("、") : "暂无明显缺口"}`,
    `补证据任务：${evidenceTasks.join("；")}`,
    `标题/描述：${lead.title || "待补"}`,
    `前3秒爆点：${lead.hook || "待补"}`,
    `评论购买意图：${lead.commentIntent || "待补"}`,
    `商品/挂车线索：${lead.productSignal || "待补"}`,
    `证据和风险：${lead.evidence || "待补"}`,
    `人工备注：${lead.note || "无"}`,
    "请输出：1. 它是真实带货样本、账号样本、方法入口还是纯流量内容；2. 是否值得继续跟；3. 爆点结构；4. 可模仿动作；5. 商品机会；6. 需要去巨量百应/橱窗/评论区补哪些数据；7. 风险和不跟理由。"
  ].join("\n");
}

function buildDouyinEvidenceTasks(lead: DouyinLeadDraft) {
  const score = scoreDouyinLead(lead);
  const tasks: string[] = [];

  if (!lead.sourceUrl.trim()) tasks.push("先补具体抖音视频/账号链接，不保留泛搜索印象。");
  if (score.missing.includes("评论购买意图")) tasks.push("打开评论区，记录至少 3 个购买意图词：链接、同款、尺码、价格、哪里买。");
  if (score.missing.includes("商品/品类线索")) tasks.push("确认商品品类、款式、价格带和使用场景，避免只记录内容灵感。");
  if (score.missing.includes("前3秒爆点")) tasks.push("补前 3 秒画面：人物、动作、反差点、商品露出位置。");
  if (score.missing.includes("挂车/橱窗/成交链路")) tasks.push("检查小黄车、橱窗、直播入口或巨量百应同类商品，确认是否有成交链路。");
  if (score.missing.includes("播放赞评收藏或风险证据")) tasks.push("记录播放、赞评藏转、发布时间、账号连续爆发，以及退货/擦边/资质风险。");
  if (lead.category === "童装") tasks.push("童装额外补身高体重、年龄段、面料安全、演出/生日/上学场景。");
  if (lead.category === "女装" || lead.category === "男装") tasks.push("服装额外补版型、尺码、面料、是否显瘦/通勤/场景化。");
  if (tasks.length === 0) tasks.push("证据基本完整，下一步交给 Codex 做爆点拆解和商品机会反推。");

  return tasks.slice(0, 5);
}

function scoreDouyinLead(lead: DouyinLeadDraft): DouyinLeadScore {
  const purchaseText = `${lead.commentIntent} ${lead.note}`;
  const productText = `${lead.productSignal} ${lead.title} ${lead.category}`;
  const hookText = `${lead.hook} ${lead.title}`;
  const commerceText = `${lead.productSignal} ${lead.evidence}`;
  const evidenceText = `${lead.evidence} ${lead.note}`;

  const purchase = scoreByKeywords(purchaseText, [
    "链接",
    "同款",
    "哪里买",
    "怎么买",
    "店铺",
    "购物车",
    "价格",
    "多少钱",
    "尺码",
    "身高",
    "体重",
    "面料",
    "质量"
  ], 25);
  const product = Math.min(15, scoreByKeywords(productText, [
    "裙",
    "裤",
    "外套",
    "套装",
    "穿搭",
    "家居服",
    "舞蹈服",
    "演出服",
    "价格",
    "品牌",
    "类目"
  ], 15) + (lead.category && lead.category !== "拆解方法论" ? 3 : 0));
  const hook = scoreByKeywords(hookText, [
    "前3秒",
    "前 3 秒",
    "反差",
    "显瘦",
    "萌娃",
    "跳舞",
    "转圈",
    "对比",
    "痛点",
    "上身",
    "效果"
  ], 15);
  const commerce = scoreByKeywords(commerceText, [
    "挂车",
    "橱窗",
    "小黄车",
    "巨量百应",
    "精选联盟",
    "直播",
    "店铺",
    "佣金",
    "销量",
    "成交"
  ], 10);
  const evidence = scoreByKeywords(evidenceText, [
    "播放",
    "点赞",
    "评论",
    "收藏",
    "转发",
    "低粉",
    "连续",
    "近期",
    "数据",
    "风险",
    "退货",
    "资质"
  ], 20);
  const link = lead.sourceUrl.trim() ? 15 : 0;
  const total = purchase + product + hook + commerce + evidence + link;
  const missing = [
    lead.sourceUrl.trim() ? "" : "具体链接",
    purchase >= 12 ? "" : "评论购买意图",
    product >= 8 ? "" : "商品/品类线索",
    hook >= 8 ? "" : "前3秒爆点",
    commerce >= 5 ? "" : "挂车/橱窗/成交链路",
    evidence >= 10 ? "" : "播放赞评收藏或风险证据"
  ].filter(Boolean);

  return {
    total,
    level: total >= 70 ? "优先拆解" : total >= 45 ? "补证据" : "暂不入池",
    missing,
    items: [
      { label: "购买意图", value: purchase, max: 25, reason: "评论区是否出现链接、同款、尺码、价格、哪里买等词。" },
      { label: "商品清晰", value: product, max: 15, reason: "是否能明确反推出品类、价格带、场景或款式。" },
      { label: "反差爆点", value: hook, max: 15, reason: "前 3 秒是否有视觉差、身份差、效果差或痛点。" },
      { label: "商业链路", value: commerce, max: 10, reason: "是否有挂车、橱窗、直播、佣金、销量等成交链路。" },
      { label: "数据证据", value: evidence, max: 20, reason: "是否记录播放、赞评收藏、近期连续爆或风险信息。" },
      { label: "具体链接", value: link, max: 15, reason: "是否已经落到具体抖音视频、账号或搜索线索链接。" }
    ]
  };
}

function scoreByKeywords(text: string, keywords: string[], max: number) {
  const normalized = text.toLowerCase();
  const hits = keywords.reduce((count, keyword) => count + (normalized.includes(keyword.toLowerCase()) ? 1 : 0), 0);
  return Math.min(max, Math.round((hits / Math.min(keywords.length, 6)) * max));
}

function getDouyinLeadScoreTone(level: DouyinLeadScore["level"]) {
  if (level === "优先拆解") return "strong";
  if (level === "补证据") return "medium";
  return "weak";
}

function normalizeDouyinLead(value: unknown): DouyinLead | null {
  if (!value || typeof value !== "object") return null;
  const lead = value as Partial<DouyinLead>;
  if (typeof lead.sourceUrl !== "string" || !lead.sourceUrl.trim()) return null;
  const sampleKind = isDouyinLeadKind(lead.sampleKind) ? lead.sampleKind : "视频";
  const status = isDouyinLeadStatus(lead.status) ? lead.status : "待拆解";
  return {
    id: typeof lead.id === "string" && lead.id ? lead.id : createLeadId(),
    sourceUrl: lead.sourceUrl,
    accountName: typeof lead.accountName === "string" ? lead.accountName : "",
    sampleKind,
    category: typeof lead.category === "string" && lead.category ? lead.category : "童装",
    title: typeof lead.title === "string" ? lead.title : "",
    hook: typeof lead.hook === "string" ? lead.hook : "",
    commentIntent: typeof lead.commentIntent === "string" ? lead.commentIntent : "",
    productSignal: typeof lead.productSignal === "string" ? lead.productSignal : "",
    evidence: typeof lead.evidence === "string" ? lead.evidence : "",
    note: typeof lead.note === "string" ? lead.note : "",
    status,
    createdAt: typeof lead.createdAt === "string" ? lead.createdAt : new Date().toISOString()
  };
}

function isDouyinLeadKind(value: unknown): value is DouyinLeadKind {
  return value === "视频" || value === "账号" || value === "直播" || value === "商品";
}

function isDouyinLeadStatus(value: unknown): value is DouyinLeadStatus {
  return value === "待拆解" || value === "已复制" || value === "已入池" || value === "放弃";
}

async function persistDouyinLeads(leads: DouyinLead[]) {
  try {
    window.localStorage?.setItem(DOUYIN_LEAD_STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // 本地存储不可用时，线索仍可在当前页面临时使用。
  }

  try {
    await fetch("/api/daihuo-scout/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads })
    });
  } catch {
    // 本地 API 不可用时，页面仍保持当前线索，避免打断人工采样。
  }
}

function readDouyinLeadsFromBrowserStorage() {
  try {
    const raw = window.localStorage?.getItem(DOUYIN_LEAD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeDouyinLead).filter((lead): lead is DouyinLead => Boolean(lead));
  } catch {
    return [];
  }
}

function createLeadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseWindow(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function getReviewRecord(records: Record<number, ReviewRecord>, id: number): ReviewRecord {
  return records[id] ?? DEFAULT_REVIEW;
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === "未看" || value === "已打开" || value === "已复盘" || value === "不跟";
}

function persistReviewRecords(records: Record<number, ReviewRecord>) {
  try {
    window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 本地浏览器禁用存储时，页面仍然可以继续人工复盘，只是不持久化。
  }
}

function formatReviewTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
