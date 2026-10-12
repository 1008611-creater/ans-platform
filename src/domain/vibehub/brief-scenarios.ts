import type { Localized } from "./ans-practices";
const text = (zh: string, en: string): Localized => ({ zh, en });
export const BRIEF_FIELDS = ["goal", "material", "delivery", "acceptance"] as const;
export type BriefField = typeof BRIEF_FIELDS[number];
export interface BriefScenario {
  id: "website" | "creative" | "github" | "custom";
  label: string;
  path?: string;
  guide: string;
  hints: Record<BriefField, Localized>;
  starter?: Partial<Record<BriefField, Localized>>;
}
export const BRIEF_SCENARIOS: BriefScenario[] = [
  {
    id: "website", label: "briefScenarioWebsite", path: "ans-first-website", guide: "portfolio",
    hints: {
      goal: text("网站给谁看？访客看完后要做什么？", "Who will visit? What should they do after viewing?"),
      material: text("放入真实简介、作品链接和可公开的联系方式；还缺什么也写明。", "Add your real introduction, project links and public contact details. List anything missing."),
      delivery: text("需要哪些页面？源码、可编辑内容和上线地址分别要什么？", "Which pages, source files, editable content and published URL do you need?"),
      acceptance: text("手机上是否易读？按钮、联系入口和保存功能怎样才算可用？", "How should mobile layout, buttons, contact links and saved data behave?"),
    },
    starter: {
      goal: text("做一个个人作品网站，让访客了解我的作品并找到联系方式。", "Build a personal website where visitors can understand my work and find my contact details."),
      delivery: text("交付首页、作品详情、可编辑源码和启动说明。是否上线及使用什么域名，先与我确认。", "Deliver a homepage, project details, editable source and setup instructions. Confirm publishing and domain choices with me."),
      acceptance: text("使用我的真实资料，不编造经历；手机和电脑均可阅读；每个按钮有实际用途；联系入口可用。", "Use my real material without inventing experience. Keep mobile and desktop layouts readable, all buttons purposeful and contact links usable."),
    },
  },
  {
    id: "creative", label: "briefScenarioCreative", path: "ans-creative-delivery", guide: "creative-production",
    hints: {
      goal: text("要做什么类型的作品？给谁看？时长或篇幅是多少？", "What format, audience and length should the work have?"),
      material: text("列出已确认的故事、角色和参考素材；每份素材的用途是什么？", "List the confirmed story, characters and references, with each reference’s role."),
      delivery: text("成品格式、分辨率、字幕、音轨和可编辑文件有什么要求？", "Specify final format, resolution, subtitles, audio tracks and editable files."),
      acceptance: text("哪些事实不能改？角色连续性、声音和最终文件如何检查？", "Which facts are fixed? How will you review continuity, sound and the final file?"),
    },
    starter: {
      goal: text("根据我确认的故事和素材，完成一份可观看、可继续修改的创作作品。", "Use my approved story and material to deliver a creative work I can watch and continue editing."),
      delivery: text("先交付创作简报、素材职责和分镜，再确认制作。最终保留成品与可编辑素材；具体格式、时长和费用先确认。", "Start with a brief, asset roles and shot plan before production. Retain the final work and editable material. Confirm format, duration and cost first."),
      acceptance: text("不改写已确认的事实；角色和场景连续；声音、字幕与画面对应；最终文件能实际打开播放。", "Preserve approved facts, character and scene continuity. Align sound and subtitles with visuals, and confirm the final file opens and plays."),
    },
  },
  {
    id: "github", label: "briefScenarioGithub", path: "ans-open-source", guide: "github-to-project",
    hints: {
      goal: text("哪个项目的哪项能力要接到你的什么产品里？", "Which repository feature should be integrated into which product?"),
      material: text("仓库链接、选定版本、现有项目位置和已有配置；不要填密钥。", "Repository URL, selected revision, existing project location and setup. Do not include secrets."),
      delivery: text("要接入哪些功能？哪些不在本次范围？如何启动和继续维护？", "Which features are in scope, which are excluded, and how should the result be run and maintained?"),
      acceptance: text("现有功能如何保留？真实登录、数据库和部署分别如何验收？", "How should existing behavior be preserved, and login, database and deployment verified?"),
    },
    starter: {
      goal: text("把选定开源项目的能力接入我的现有产品，并与现有品牌、导航和数据保持一致。", "Integrate the selected open-source capability into my product, retaining its brand, navigation and data."),
      delivery: text("先核对仓库版本、许可证和接入范围，再交付可编辑源码、启动说明与配置缺项。提交和上线前确认目标。", "Confirm revision, license and scope, then deliver editable source, setup instructions and missing configuration. Confirm targets before pushing or publishing."),
      acceptance: text("保留必要许可证；不影响现有功能和用户数据；区分已运行、待配置和未验证的部分；不把页面可见当成全功能完成。", "Retain required licenses and preserve existing behavior and user data. Distinguish running, unconfigured and unverified parts rather than equating a visible page with a complete product."),
    },
  },
  {
    id: "custom", label: "briefScenarioCustom", guide: "clear-brief",
    hints: {
      goal: text("为谁做？要解决什么问题？", "Who is it for, and which problem should it solve?"),
      material: text("已有文字、图片、链接或文件；没有资料也请写明。", "Existing text, images, links or files. State if you have none."),
      delivery: text("要拿到哪些页面、文件或可编辑成果？", "Which pages, files or editable artifacts do you need?"),
      acceptance: text("写出能实际检查的完成条件。", "List completion criteria you can actually check."),
    },
  },
];
export function getBriefScenario(id: string | null | undefined) {
  return BRIEF_SCENARIOS.find(item => item.id === id) || BRIEF_SCENARIOS[0];
}
export function briefScenarioForPath(id: string) { return BRIEF_SCENARIOS.find(item => item.path === id); }
export function briefScenarioForGuide(slug: string) { return BRIEF_SCENARIOS.find(item => item.guide === slug); }
