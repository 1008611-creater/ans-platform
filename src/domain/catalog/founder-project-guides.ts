import type { ProjectGuide } from "./project-guide-types";

export const FOUNDER_PROJECT_GUIDES: readonly ProjectGuide[] = [{
  slug: "liu-resume",
  sourceUrl: "https://resume.cauai.fun/",
  checkedAt: "2026-10-14",
  evidence: [
    { label: "公开作品集 / Public portfolio", href: "https://resume.cauai.fun/" },
    { label: "视频作品档案 / Video archive", href: "https://resume.cauai.fun/portfolio/" },
  ],
  zh: {
    audience: "有真实作品，想把经历、项目和作品链接整合成个人主页的人。",
    difficulty: "看案例可直接开始；制作自己的站点需要基础页面编辑或开发协助。",
    access: "公开站点，可直接浏览。这是作者作品案例，不是可下载的通用模板。",
    cost: "浏览不消耗 ANS 算力。自己建站的域名、托管及 AI 辅助费用由所选服务决定。",
    result: "参考它如何用个人介绍、项目叙事和独立作品档案组织一个个人展示网站。自己的版本应让访问者能看到作品、理解职责并找到真实项目入口。",
    steps: [
      { title: "先看作品如何被组织", body: "从封面向下浏览，比较品牌与产品、AIGC 作品、全栈开发和 Agent 实践几段的标题、职责描述与链接安排。", href: "https://resume.cauai.fun/" },
      { title: "给自己的作品建立素材清单", body: "每项写清项目名称、你负责的部分、成果截图或视频、公开访问地址。没有公开授权的客户内容先移除。" },
      { title: "把主页与作品详情分开", body: "主页讲你是谁、擅长什么、有哪些代表作品；每项作品单独讲问题、你的做法与最终成果。视频案例可参考独立作品档案的组织方式。", href: "https://resume.cauai.fun/portfolio/" },
      { title: "发布前让别人找一个作品", body: "请一位不了解你的人从手机打开，找到你的代表项目并理解你的贡献。修复打不开的链接、过长文案和模糊职责，再公开分享。" },
    ],
    cautions: ["公开网站的作者经历与业绩属于作者本人，不能复制进自己的简历。", "页面可浏览不意味着源码或素材开放授权；复用代码、视频、品牌和图片前需要确认许可。", "ANS 此页提供参考与制作建议，不会自动复制或交付这个站点。"],
  },
  en: {
    audience: "People with real work who want a personal site connecting their background, projects and portfolio links.",
    difficulty: "The reference is open to browse. Building your version needs basic page editing or development help.",
    access: "A public author portfolio, not a downloadable general-purpose template.",
    cost: "Browsing uses no ANS compute. Domain, hosting and optional AI costs depend on the services you choose.",
    result: "Study how a personal introduction, project narratives and a separate work archive form a portfolio. Your version should show real work, explain your role and link to accessible projects.",
    steps: [
      { title: "Read the structure", body: "Scroll through the introduction, brand and product work, AIGC portfolio, full-stack development and Agent practice. Compare the responsibilities and links in each section.", href: "https://resume.cauai.fun/" },
      { title: "Inventory your real work", body: "For each project, collect its name, your responsibilities, screenshots or video and a public link. Remove client material you are not authorized to publish." },
      { title: "Separate the overview from case studies", body: "The home page introduces you and your strongest work. Individual case studies explain the problem, your decisions and the outcome. The video archive shows one way to organize separate examples.", href: "https://resume.cauai.fun/portfolio/" },
      { title: "Ask someone to find a project", body: "Have someone unfamiliar with your work open the site on a phone and locate a representative project. Fix broken links, vague responsibilities and long copy before publishing." },
    ],
    cautions: ["The author's background and performance claims are their own; do not copy them into your résumé.", "Public access does not grant a source-code or media license. Confirm permission before reusing code, video, branding or images.", "This ANS page is a reference and guide; it does not automatically clone or deliver the author's site."],
  },
}];
