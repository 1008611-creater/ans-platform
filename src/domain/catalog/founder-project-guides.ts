import type { ProjectGuide } from "./project-guide-types";

export const FOUNDER_PROJECT_GUIDES: readonly ProjectGuide[] = [{
  slug: "ans-3d-showcase",
  sourceUrl: "https://ans.cauai.fun/showcase/ans-3d/index.html",
  checkedAt: "2026-10-15",
  evidence: [
    { label: "3D 双模型互动展示 / Live 3D Showcase", href: "https://ans.cauai.fun/showcase/ans-3d/index.html" },
    { label: "原版 3D 个人作品集 / Author 3D Portfolio", href: "https://resume.cauai.fun/" },
  ],
  zh: {
    audience: "想体验 ANS 产品全景导览，或希望在 3D 个人网站中加入吉祥物伴飞、微距贴脸表情与鼠标互动的创作者。",
    difficulty: "打开网页即可直接用鼠标滚轮、悬停与点击交互体验。",
    access: "ANS 站内原生托管展示页，直接同源复用站内 3D 吉祥物模型。",
    cost: "浏览与 3D 实时交互完全免费，不消耗算力积分。",
    result: "在一个 3D 舞台中同时呈现创作者建模与顺时针绕头飞行的小恐龙吉祥物，转到脸前时自动飞入摄像机超微距镜头前做表情并发碎碎念，支持鼠标摸头与点击互动。",
    steps: [
      { title: "滚动滚轮体验顺时针绕头伴飞", body: "向下滚动页面，观察小恐龙沿 9点→12点→3点→6点 顺时针围绕创作者头部飞行，并在章节切换时配合镜头呼吸拉远。", href: "https://ans.cauai.fun/showcase/ans-3d/index.html" },
      { title: "在脸前触发摄像机超微距贴脸杀", body: "当小恐龙顺时针绕到创作者脸前（如第 01 章节及章节过渡段），会靠近虚拟摄像机，正对镜头眨眼、脸红并发出碎碎念颜文字。" },
      { title: "鼠标移上去摸头 & 点击投喂互动", body: "把鼠标移到小恐龙或头顶气泡上即可触发摸头反应（转头盯鼠标、Q 弹放大与专属悬停碎碎念）；点击小恐龙可轮换触发蹦跳、转头和表情等六组互动反应。" },
      { title: "浏览 ANS 产品入口", body: "点击章节中的链接或底部项目卡片，可进入 ANS 主站、项目广场、Hub 和 3D 个人网站工作室。", href: "https://ans.cauai.fun/market/resume-website" },
    ],
    cautions: ["页面内创作者 3D 肖像与贴纸归原作者所有，复用工作流建站时请替换为自己的模型与作品素材。", "页面包含实时 3D 渲染，体验取决于设备性能；可使用暂停动效与静态入口，页面也会尊重系统的减弱动态效果偏好。"],
  },
  en: {
    audience: "Creators exploring the ANS product tour or looking to add an interactive 3D mascot companion to their personal site.",
    difficulty: "Open directly in the browser and interact via scroll wheel, mouse hover, and click.",
    access: "Hosted natively on ANS, sharing the same-origin 3D dinosaur mascot model.",
    cost: "Browsing and 3D interaction are completely free and use no compute credits.",
    result: "A dual-model 3D stage featuring the founder avatar and a clockwise-orbiting ANS dinosaur mascot that swoops into a camera super-macro close-up with live facial shaders and interactive kaomoji ramblings.",
    steps: [
      { title: "Scroll to fly the mascot clockwise around the head", body: "Scroll down to drive the dinosaur along a clockwise 3D orbit (9h -> 12h -> 3h -> 6h) around the avatar's head.", href: "https://ans.cauai.fun/showcase/ans-3d/index.html" },
      { title: "Trigger the Camera Super-Macro Close-Up", body: "When the orbit reaches the front of the face, the mascot swoops right up to the camera lens with auto-focus DoF, facing the camera dead-on with dynamic expressions." },
      { title: "Hover to pet & click to interact", body: "Move your cursor over the dinosaur to make it turn toward you, blush, and pop interactive hover ramblings; click to cycle through six gesture and expression presets." },
      { title: "Explore live ANS product links", body: "Use chapter links or the bottom project cards to visit ANS, Explore, Hubs and the 3D website studio.", href: "https://ans.cauai.fun/market/resume-website" },
    ],
    cautions: ["The founder's 3D likeness and decals belong to the author; replace them with your own assets when building your site.", "Real-time 3D performance depends on your device. Pause motion or use the static links; system reduced-motion preferences are respected."],
  },
}, {
  slug: "liu-resume",
  sourceUrl: "https://resume.cauai.fun/",
  checkedAt: "2026-10-14",
  evidence: [
    { label: "公开作品集 / Public portfolio", href: "https://resume.cauai.fun/" },
    { label: "ANS 3D 双模型互动版 / ANS 3D Duo Showcase", href: "https://ans.cauai.fun/showcase/ans-3d/index.html" },
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
