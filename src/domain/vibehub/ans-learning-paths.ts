import type { Localized } from "./ans-practices";
const text = (zh: string, en: string): Localized => ({ zh, en });
export interface AnsPathStep {
  id: string;
  title: Localized;
  action: Localized;
  evidence: Localized;
  links: { href: string; label: Localized }[];
}
export interface AnsLearningPath {
  id: string;
  number: string;
  title: Localized;
  summary: Localized;
  outcome: Localized;
  steps: AnsPathStep[];
}
export const ANS_LEARNING_PATHS: AnsLearningPath[] = [
  {
    id: "ans-first-website", number: "01",
    title: text("做自己的网站", "Build your own website"),
    summary: text("从一份清楚的需求开始，整理真实资料，再完成页面、交互和交付。", "Start with a clear brief, collect real material, then work through layout, interaction and delivery."),
    outcome: text("写需求 → 整理内容 → 做页面 → 交付", "Brief → Content → Interface → Delivery"),
    steps: [
      { id: "brief", title: text("先写清楚，这个网站帮谁做什么", "Define who the website helps and how"),
        action: text("选定一种主要用途：介绍自己、展示作品或说明产品。写下访客最需要知道的事实，以及你希望他们完成的一件事。把缺失资料单独列出，再把需求交给 Agent。", "Choose a primary purpose: introducing yourself, showing work or explaining a product. List the facts visitors need and one action they should take. Identify missing material before handing the brief to an Agent."),
        evidence: text("留下一份需求：目标用户、真实资料、必须保留的内容、交付形式、验收标准。", "Keep a brief with audience, real inputs, required content, deliverables and acceptance criteria."),
        links: [{href:"/vibe-hub/ans/clear-brief",label:text("把需求说清楚", "Write a clear brief")}] },
      { id: "content", title: text("整理自己的内容，再决定版式", "Collect your content before choosing a layout"),
        action: text("从真实简历、作品或产品资料中挑选内容。先决定首页重点，再给每个项目写出问题、自己的贡献与证据。图片和联系方式使用你已确认的素材与目标。", "Select content from your real resume, projects or product material. Set the homepage priority, then describe each project's problem, your contribution and evidence. Use confirmed images and contact destinations."),
        evidence: text("一份页面清单；每个区块都有已确认文字、素材或明确的缺项。", "A page inventory with confirmed copy and assets, or explicitly missing inputs, for every section."),
        links: [{href:"/vibe-hub/ans/portfolio",label:text("个人网站实践", "Portfolio practice")},{href:"/vibe-hub/courses/product-website/01-page-structure",label:text("理解页面结构", "Understand page structure")}] },
      { id: "interface", title: text("让手机、按钮和表单都能工作", "Make mobile layouts and controls work"),
        action: text("先完成一个页面，再把字体、间距和颜色统一到其他页面。逐一打开链接、操作表单、使用键盘导航；在窄屏检查文字、菜单和图片。登录与数据保存要单独核对。", "Finish one page before extending its typography, spacing and colors. Open links, submit forms and navigate by keyboard. Check text, menus and images on narrow screens. Verify authentication and persistence separately."),
        evidence: text("记录检查结果与仍未接通的功能。演示效果、真实保存和正式发布分别确认。", "Record checked behavior and outstanding integrations. Confirm demonstrations, actual persistence and publication separately."),
        links: [{href:"/vibe-hub/courses/product-website/08-responsive",label:text("手机适配", "Responsive layouts")},{href:"/vibe-hub/lab",label:text("试着调整视觉重点", "Try visual hierarchy")}] },
      { id: "delivery", title: text("把作品交付成下次还能改的文件", "Deliver something you can edit again"),
        action: text("保留可编辑源码、使用说明和实际检查结果。明确本地预览、文件导出与正式上线分别完成到哪一步；发布到 GitHub 前核对素材来源和敏感配置。", "Keep editable source, usage notes and actual review results. Distinguish local preview, export and publication. Check asset provenance and sensitive configuration before publishing to GitHub."),
        evidence: text("源码与说明可以打开，关键按钮有真实目标，未完成项有准确记录。", "Source and instructions are accessible, key actions have real destinations and outstanding work is documented."),
        links: [{href:"/vibe-hub/ans/github-to-project",label:text("从源码到自己的项目", "Make the source your own")},{href:"/explore",label:text("发现 ANS 项目", "Explore ANS projects")}] }
    ]
  },
  {
    id: "ans-creative-delivery", number: "02",
    title: text("完成一次创作", "Complete a creative project"),
    summary: text("先锁定故事与素材职责，再拆镜头、检查连续性，最后确认真实导出。", "Lock story facts and reference roles, split the shots, review continuity and confirm the actual export."),
    outcome: text("定故事 → 整理素材 → 做镜头 → 导出", "Story → Assets → Shots → Export"),
    steps: [
      {id:"facts",title:text("确认故事，也确认不能改的事实", "Confirm the story and its fixed facts"),action:text("写下作品类型、观众与交付规格。把已确认的剧本、角色、地点、时间顺序和必须保留的台词整理在一起，尚未决定的部分明确留空。", "Specify format, audience and delivery requirements. Collect approved script, characters, locations, chronology and required dialogue. Leave undecided details explicit."),evidence:text("可交接的创作简报；事实、设想和缺失信息清楚分开。", "A handoff brief that distinguishes facts, ideas and missing inputs."),links:[{href:"/vibe-hub/ans/clear-brief",label:text("创作前的需求整理", "Prepare the brief")}]},
      {id:"assets",title:text("每张参考，都有自己的职责", "Give each reference a specific role"),action:text("标明每份素材用于角色外观、场景、道具、镜头还是风格。核对使用权限和上传目标，避免把风格参考误当成故事事实。", "Label each reference as appearance, location, prop, framing or style. Check usage rights and upload destinations so a style reference does not silently alter the story."),evidence:text("素材清单包含来源、用途、保留特征与不可变更的约束。", "An asset list with source, role, required features and fixed constraints."),links:[{href:"/vibe-hub/ans/creative-production",label:text("素材与制作实践", "Asset and production practice")}]},
      {id:"shots",title:text("拆成镜头，再启动制作", "Split the work into shots before production"),action:text("为每段镜头写清输入、动作、输出与检查方法。执行前确认工作流、实际模型渠道、费用和授权；发现缺配置就补配置，不用假进度替代。", "Describe each shot's inputs, action, output and review method. Confirm workflow, provider, cost and authorization before execution. Resolve missing setup rather than inventing progress."),evidence:text("镜头任务表与执行条件；提交成功、生成结果和画面检查分开记录。", "A shot list and execution requirements, with submission, generation and visual review recorded separately."),links:[{href:"/vibe-hub/ans/account-and-cost",label:text("资料与费用边界", "Material and cost boundaries")},{href:"/workflows",label:text("查看 ANS 工作流", "View ANS workflows")}]},
      {id:"export",title:text("检查作品，确认最终文件", "Review the work and confirm the final file"),action:text("核对角色与场景连续性、声音、字幕和文件规格。打开最终文件实际播放；保留生成失败与重做记录，交接时写明可编辑素材和仍未解决的问题。", "Check character and scene continuity, sound, subtitles and file specifications. Play the final file. Keep failure and revision records; hand off editable material and unresolved issues."),evidence:text("真实可打开的交付文件，以及来源与质量检查记录。", "An accessible final artifact, its provenance and quality review record."),links:[{href:"/workspace",label:text("进入自己的工作台", "Open your workspace")}]}
    ]
  },
  {
    id: "ans-open-source", number: "03",
    title: text("接入开源项目", "Integrate an open-source project"),
    summary: text("分清应用与 Skill，固定来源版本，在独立改动中接入，再留下可维护的交付。", "Distinguish apps from skills, pin the source, integrate in isolation and leave a maintainable handoff."),
    outcome: text("选项目 → 定范围 → 接功能 → 交付", "Choose → Scope → Integrate → Deliver"),
    steps: [
      {id:"source",title:text("先看仓库实际交付什么", "Identify what the repository actually delivers"),action:text("读 README、核心源码与许可证。确认它是应用、Skill 还是在线服务；记录版本与运行条件，分别核对代码、素材和内容的许可。", "Read the README, core source and license. Determine whether this is an app, skill or hosted service. Record version and requirements, and check code, asset and content licenses separately."),evidence:text("保存上游链接、版本、许可证与复用范围。", "Keep the upstream URL, revision, license and reuse scope."),links:[{href:"/vibe-hub/ans/github-to-project",label:text("开源复用实践", "Open-source reuse practice")}]},
      {id:"roles",title:text("让方法服从自己的产品", "Make the methods serve your product"),action:text("给设计、资料检索和动效方法分配明确职责。沿用现有品牌、组件与数据事实，再决定需要保留哪些上游功能，不把原作者的产品历史写成自己的。", "Assign clear roles to design, research and motion methods. Retain your brand, components and factual data. Decide which upstream features to keep without presenting its product history as your own."),evidence:text("一份改造范围与职责说明；保留来源，写清自己的新增内容。", "A scope and responsibility brief that preserves provenance and identifies original additions."),links:[{href:"/vibe-hub/vibehub-skill",label:text("与 Agent 协作", "Work with an Agent")}]},
      {id:"integrate",title:text("隔离改动，看清每一次变化", "Isolate the work and inspect each change"),action:text("在独立分支完成适配。先看差异，再核对现有路由、界面与配置是否受影响。账号、数据库和真实费用接入分别确认，不因页面能打开就推断全部完成。", "Adapt the project on a separate branch. Inspect changes and check existing routes, UI and configuration. Verify accounts, databases and actual costs separately instead of inferring completeness from a page loading."),evidence:text("可追踪的改动、实际运行结果与仍待配置的事项。", "Traceable changes, observed runtime results and outstanding setup."),links:[{href:"/vibe-hub/courses/git-workflow/03-branch-and-head",label:text("分支隔离", "Branch isolation")},{href:"/vibe-hub/courses/git-workflow/02-diff-and-gitignore",label:text("查看差异", "Inspect diffs")}]},
      {id:"handoff",title:text("留下可恢复、可继续的项目", "Leave a project others can continue"),action:text("保留可编辑源码、启动说明、必要署名和真实验收结果。提交、推送与上线分别记录；发布前确认目标与授权，避免覆盖其他人的并行成果。", "Keep editable source, setup notes, required attribution and actual acceptance results. Record commit, push and deployment separately. Confirm release target and authorization without overwriting concurrent work."),evidence:text("下一次修改有版本可查，下一位接手者知道如何运行。", "The next edit has a traceable version, and the next collaborator knows how to run the project."),links:[{href:"/vibe-hub/courses/git-workflow/05-remote-and-collaboration",label:text("远程协作", "Remote collaboration")},{href:"/vibe-hub/updates",label:text("ANS 改进记录", "ANS change notes")}]}
    ]
  }
];
export function getAnsLearningPath(id: string) { return ANS_LEARNING_PATHS.find(path => path.id === id); }
