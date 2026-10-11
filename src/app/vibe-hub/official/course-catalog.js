// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as r from "./course-metadata.js";
let s = {
  "01-page-structure": () => import("./chapter-product-website-01-page-structure.js").then(e => e.default),
  "02-visual-direction": () => import("./chapter-product-website-02-visual-direction.js").then(e => e.default),
  "03-hero-cta": () => import("./chapter-product-website-03-hero-cta.js").then(e => e.default),
  "04-content-structure": () => import("./chapter-product-website-04-content-structure.js").then(e => e.default),
  "05-evidence-pricing-faq": () => import("./chapter-product-website-05-evidence-pricing-faq.js").then(e => e.default),
  "06-layout-surface": () => import("./chapter-product-website-06-layout-surface.js").then(e => e.default),
  "07-form-and-interaction": () => import("./chapter-product-website-07-form-and-interaction.js").then(e => e.default),
  "08-responsive": () => import("./chapter-product-website-08-responsive.js").then(e => e.default),
  "09-delivery-and-agent": () => import("./chapter-product-website-09-delivery-and-agent.js").then(e => e.default)
};
async function a(e) {
  var t, i;
  return null != (i = await (null == (t = s[e]) ? void 0 : t.call(s))) ? i : null;
}
let n = {
  "01-working-tree-and-commit": () => import("./chapter-git-workflow-01-working-tree-and-commit.js").then(e => e.default),
  "02-diff-and-gitignore": () => import("./chapter-git-workflow-02-diff-and-gitignore.js").then(e => e.default),
  "03-branch-and-head": () => import("./chapter-git-workflow-03-branch-and-head.js").then(e => e.default),
  "04-merge-and-conflicts": () => import("./chapter-git-workflow-04-merge-and-conflicts.js").then(e => e.default),
  "05-remote-and-collaboration": () => import("./chapter-git-workflow-05-remote-and-collaboration.js").then(e => e.default),
  "06-restore-and-stash": () => import("./chapter-git-workflow-06-restore-and-stash.js").then(e => e.default)
};
async function o(e) {
  var t, i;
  return null != (i = await (null == (t = n[e]) ? void 0 : t.call(n))) ? i : null;
}
let l = [{
  id: "01-page-structure",
  order: 1,
  title: "页面结构与区块分工",
  shortTitle: "页面结构",
  intro: "制作产品官网的第一步，是确定页面包含哪些区块，以及每个区块负责展示什么内容。分清页头、导航栏、首屏和内容区块的标准职责后，我们可以按模块向 AI 说明修改要求，避免整页频繁重写。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-02-page-structure-v2.webp",
      alt: "小人和猫把页头、功能和完整示例排成清晰的阅读顺序",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-02-list-v3.webp",
      alt: "小人和猫把三张网页页面按阅读顺序排列",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["frontend", "component", "single-page-layout", "mvp"]
}, {
  id: "02-visual-direction",
  order: 2,
  title: "视觉风格与设计变量",
  shortTitle: "视觉风格",
  intro: "官网的视觉秩序主要依靠清晰的文字层级和统一的样式变量。本章介绍如何根据产品类型确定风格，梳理字阶层级，并使用设计令牌管理颜色、间距与圆角，让全站样式保持一致。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-03-visual-direction-v2.webp",
      alt: "小人和猫把文字层级、颜色和间距整理成视觉规则",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-03-list-v2.webp",
      alt: "小人和猫一起整理视觉规则、颜色和间距",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["style-saas", "style-enterprise", "typography", "design-token"]
}, {
  id: "03-hero-cta",
  order: 3,
  title: "首屏文案与行动按钮",
  shortTitle: "首屏与按钮",
  intro: "首屏（Hero）是访客打开网页后首先看到的区域。本章介绍如何提炼清晰的产品价值主张、撰写简洁有力的辅助文案，并设计指引明确的主行动按钮（CTA）。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-04-hero-cta-v2.webp",
      alt: "小人和猫在首屏中把产品价值指向唯一的下一步",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-04-list-v3.webp",
      alt: "小人和猫一起确认首屏价值与主要行动按钮",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["cta", "button", "link", "hero"]
}, {
  id: "04-content-structure",
  order: 4,
  title: "功能展示与排版布局",
  shortTitle: "功能与排版",
  intro: "官网的中段内容主要负责展示产品功能和实际使用流程。本章介绍如何按用户任务组织功能内容，以及如何配合使用卡片、列表、Grid 网格与 Flex 弹性布局。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-05-content-structure-v2.webp",
      alt: "小人和猫把功能、示例和补充信息排成连续页面",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-05-list-v2.webp",
      alt: "小人和猫把功能、示例和补充信息分成三个页面区块",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["card", "list", "grid", "flex"]
}, {
  id: "05-evidence-pricing-faq",
  order: 5,
  title: "真实证据、定价与常见问题",
  shortTitle: "证据与定价",
  intro: "了解了产品功能后，访客通常需要进一步确认可靠性、价格方案和使用限制。本章介绍如何组织真实的用户证据、透明的定价对比以及常见问题解答（FAQ）。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-06-evidence-v3.webp",
      alt: "小人和猫用放大镜核对证据、价格和常见问题",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-06-list-v2.webp",
      alt: "小人和猫用放大镜检查产品证据和价格资料",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["social-proof", "user-voice", "pricing", "faq"]
}, {
  id: "06-layout-surface",
  order: 6,
  title: "间距贴边与层叠遮挡",
  shortTitle: "间距与遮挡",
  intro: "在网页排版中，文字贴边、内容截断和浮层被遮挡是常见的布局问题。理解盒模型、内边距、溢出机制和层叠层级，可以帮助我们向 AI 准确定位并修正这些问题。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-07-layout-surface-v2.webp",
      alt: "小人和猫检查内容、内边距和外间距的盒模型关系",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-07-list-v3.webp",
      alt: "小人和猫一起检查盒模型、间距和层叠关系",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["box-model", "padding", "overflow", "z-index"]
}, {
  id: "07-form-and-interaction",
  order: 7,
  title: "按钮交互与候补表单",
  shortTitle: "交互与表单",
  intro: "控件的操作反馈和表单交互直接影响用户的填写体验。本章介绍鼠标悬停、键盘聚焦与按下状态的处理，以及候补表单的字段设置、输入校验与结果展示。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-09-form-v5.webp",
      alt: "小人和猫演示按钮交互与候补名单表单提交",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-09-list-v4.webp",
      alt: "小人和猫一起测试按钮状态与表单校验",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["hover", "form", "label", "data-validation"]
}, {
  id: "08-responsive",
  order: 8,
  title: "手机适配与抽屉导航",
  shortTitle: "手机适配",
  intro: "手机屏幕宽度较小，桌面端的多列排版在移动端通常需要转换为单列流。本章介绍响应式布局的单列重排、抽屉式导航菜单、内容溢出排查，以及底部吸底操作栏的安全区处理。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-10-responsive-v3.webp",
      alt: "小人和猫把桌面网页调整成手机上的单列和抽屉导航",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-10-list-v4.webp",
      alt: "小人和猫把桌面页面转换成手机单列布局",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["responsive-design", "drawer", "sticky"]
}, {
  id: "09-delivery-and-agent",
  order: 9,
  title: "上线走查与 AI 协作迭代",
  shortTitle: "走查与 AI",
  intro: "页面制作完毕后，需要在不同设备上进行走查验证。后续借助 AI Agent 迭代页面时，按组件拆分需求并明确约束条件，可以减少回归问题。本章整理了上线走查清单与 AI 协作建议。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-12-agent-request-v3.webp",
      alt: "小人和猫按清单走查页面并向 AI Agent 描述迭代需求",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-12-list-v2.webp",
      alt: "小人和猫检查走查清单与 AI 提示词",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["acceptance-criteria", "vibe-coding", "ai-agent"]
}];
let h = [{
  id: "01-working-tree-and-commit",
  order: 1,
  title: "代码提交与版本保存",
  shortTitle: "代码提交",
  intro: "了解 Git 的工作区、暂存区与提交机制。每当一个功能调试正常，让 AI 及时创建提交保存代码快照，后续改出问题时就能随时安全恢复。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/git-workflow-chapter-01-overview-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-01-overview-en-v1.webp",
      alt: "文件在工作区、暂存区、本地仓库与远程仓库之间的流转过程",
      altEn: "Four Git areas and commit snapshot flow",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/git-workflow-chapter-01-list-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-01-list-en-v1.webp",
      alt: "工作区、暂存区与提交快照示意图",
      altEn: "Working tree, staging area and commit snapshot diagram",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["git", "commit"]
}, {
  id: "02-diff-and-gitignore",
  order: 2,
  title: "查看改动与配置忽略文件",
  shortTitle: "改动与忽略",
  intro: "在保存新版本前，通过代码差异（Diff）核对 AI 具体修改了哪些文件与代码行，并配置 .gitignore 排除密码、密钥和本地临时文件。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/git-workflow-chapter-02-overview-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-02-overview-en-v1.webp",
      alt: "使用 Diff 审查改动并配置忽略规则",
      altEn: "Review code changes with diff and configure .gitignore",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/git-workflow-chapter-02-list-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-02-list-en-v1.webp",
      alt: "代码差异对比与敏感文件忽略示意图",
      altEn: "Code diff comparison and secret file ignoring diagram",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["diff", "gitignore"]
}, {
  id: "03-branch-and-head",
  order: 3,
  title: "创建分支与隔离开发",
  shortTitle: "分支隔离",
  intro: "学习使用分支把新功能的探索与主线代码隔离开来。在独立分支上让 AI 开发与验证，确保实验性改动不会影响原本稳定运行的代码。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/git-workflow-chapter-03-overview-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-03-overview-en-v1.webp",
      alt: "分支指针移动与 HEAD 切换机制",
      altEn: "Branch pointer movements and HEAD cursor switching",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/git-workflow-chapter-03-list-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-03-list-en-v1.webp",
      alt: "分支指针与提交历史示意图",
      altEn: "Branch pointers and commit history diagram",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["branch", "vibe-coding"]
}, {
  id: "04-merge-and-conflicts",
  order: 4,
  title: "分支合并与解决代码冲突",
  shortTitle: "合并与冲突",
  intro: "当新功能在分支上验证通过后，将其合并回主线。理解快进合并与三方合并的机制，并在不同分支修改了同一处代码产生冲突时，指导 AI 正确解决冲突。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/git-workflow-chapter-04-overview-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-04-overview-en-v1.webp",
      alt: "快进合并、三方合并与冲突标记处理",
      altEn: "Fast-forward, 3-way merge and merge conflict resolution",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/git-workflow-chapter-04-list-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-04-list-en-v1.webp",
      alt: "分支合并与代码冲突处理示意图",
      altEn: "Branch merging and code conflict resolution diagram",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["merge", "diff"]
}, {
  id: "05-remote-and-collaboration",
  order: 5,
  title: "远程仓库与多人协作",
  shortTitle: "远程与 PR",
  intro: "将本地项目关联到 GitHub 远程仓库，掌握推送（Push）、获取更新（Fetch）与拉取（Pull）的完整流程，并使用 Pull Request 进行代码审查与合并。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/git-workflow-chapter-05-overview-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-05-overview-en-v1.webp",
      alt: "本地仓库与 GitHub 远程同步及 Pull Request 协作",
      altEn: "Local repo sync with GitHub remote and Pull Request workflow",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/git-workflow-chapter-05-list-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-05-list-en-v1.webp",
      alt: "远程推送与拉取及代码审查示意图",
      altEn: "Remote push, pull and code review diagram",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["push", "pull", "clone", "pull-request"]
}, {
  id: "06-restore-and-stash",
  order: 6,
  title: "撤销修改与临时暂存",
  shortTitle: "撤销与暂存",
  intro: "掌握放弃未暂存修改（Restore）、通过反向提交安全回退历史（Revert），以及在临时切换任务时使用 Stash 保存当前未完成的工作。",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/git-workflow-chapter-06-overview-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-06-overview-en-v1.webp",
      alt: "工作区修改放弃、历史反向提交与临时存储",
      altEn: "Discard working tree changes, append inverse commits and stash",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/git-workflow-chapter-06-list-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-06-list-en-v1.webp",
      alt: "撤销修改与暂存操作示意图",
      altEn: "Safe undo operations and temporary stash drawer diagram",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["stash", "worktree"]
}];
let c = {
  src: "/vibe-hub/source/assets/git-workflow-route-list-v1.webp",
  srcEn: "/vibe-hub/source/assets/git-workflow-route-list-en-v1.webp",
  alt: "".concat(r.RM.title, "课程示意图"),
  altEn: "Git Version Control Roadmap",
  width: 640,
  height: 640
};
let d = {
  "product-website": {
    meta: r.GV,
    chapters: l,
    visual: {
      src: "/vibe-hub/source/assets/product-website-route-list-v1.webp",
      alt: "小人和猫一起从网页草图走向可运行网站",
      width: 640,
      height: 640
    },
    stages: [{
      name: "定方向",
      range: "第 1–2 章",
      startChapter: 1,
      endChapter: 2,
      outcome: "明确产品定位、整页骨架与全局视觉规则"
    }, {
      name: "做内容",
      range: "第 3–5 章",
      startChapter: 3,
      endChapter: 5,
      outcome: "写好首屏文案、组织功能排版与呈现可信证据"
    }, {
      name: "做体验",
      range: "第 6–8 章",
      startChapter: 6,
      endChapter: 8,
      outcome: "调整容器间距贴边、交互反馈与手机端适配"
    }, {
      name: "交付",
      range: "第 9 章",
      startChapter: 9,
      endChapter: 9,
      outcome: "掌握 5 分钟上线走查清单与模块化 AI 协作沟通"
    }]
  },
  "git-workflow": {
    meta: r.RM,
    chapters: h,
    visual: c,
    stages: [{
      name: "存版本",
      range: "第 1–2 章",
      startChapter: 1,
      endChapter: 2,
      outcome: "理解四个区域数据流转、提交快照机制、Diff 改动审查与忽略规则",
      milestone: "单机存盘与改动审查",
      chapterItems: [{
        num: 1,
        title: "四个区域与快照"
      }, {
        num: 2,
        title: "Diff 审查与过滤"
      }]
    }, {
      name: "管分支",
      range: "第 3–4 章",
      startChapter: 3,
      endChapter: 4,
      outcome: "理解分支指针与 HEAD 移动原理、快进与三方合并、代码冲突裁决",
      milestone: "多轨并行与冲突裁决",
      chapterItems: [{
        num: 3,
        title: "分支指针与 HEAD"
      }, {
        num: 4,
        title: "合并与冲突裁决"
      }]
    }, {
      name: "协远程",
      range: "第 5–6 章",
      startChapter: 5,
      endChapter: 6,
      outcome: "掌握远程仓库推送与拉取、Pull Request 评审流程、修改撤销与临时存放",
      milestone: "云端同步与安全撤销",
      chapterItems: [{
        num: 5,
        title: "远程同步与 PR"
      }, {
        num: 6,
        title: "撤销与临时存放"
      }]
    }]
  }
};
let w = {
  "product-website": a,
  "git-workflow": o
};
let p = Object.values(d).map(e => ({
  id: e.meta.id,
  title: e.meta.title,
  description: e.meta.description,
  unitLabel: e.meta.unitLabel,
  chapterIds: e.chapters.map(e => e.id),
  ...(e.visual ? {
    visual: e.visual
  } : {})
}));
function u(e) {
  return d[e];
}
function g(e, t) {
  return w[e](t);
}
export { p as Nn, u as FB, g as bZ };
