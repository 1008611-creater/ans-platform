// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let i = {
  id: "02-visual-direction",
  order: 2,
  shortTitle: "视觉风格",
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
  coreTerms: ["style-saas", "style-enterprise", "typography", "design-token"],
  title: "视觉风格与设计变量",
  intro: "官网的视觉秩序主要依靠清晰的文字层级和统一的样式变量。本章介绍如何根据产品类型确定风格，梳理字阶层级，并使用设计令牌管理颜色、间距与圆角，让全站样式保持一致。",
  sections: [{
    id: "choose-website-context",
    title: "官网类型与目标用户",
    content: [{
      kind: "paragraph",
      content: ["制作官网前，需要先明确目标受众与沟通方式。"]
    }, {
      kind: "paragraph",
      content: ["先讲用户痛点与核心流程，再用真实软件界面和示例打动访客的页面，通常属于 ", {
        type: "term",
        termId: "style-saas",
        label: "SaaS 产品官网"
      }, "。而如果主要面向企业采购团队，需要详细交代组织架构权限、企业合规认证与多人审批流程，就属于 ", {
        type: "term",
        termId: "style-enterprise",
        label: "B2B 企业官网"
      }, "。两者的差异在于信息重心和决策链条不同。"]
    }, {
      kind: "paragraph",
      content: ["轻量工具官网的核心是展示工具能做什么、生成的结果长什么样，以及如何快速开始使用。因此，按照 SaaS 产品官网的逻辑来设计较为直接，暂时不需要复杂的企业采购流程。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "compare",
          title: "两类官网服务不同的决策",
          caption: "官网类型由用户、产品和购买方式决定，不是换一套颜色。",
          left: {
            title: "SaaS 产品官网",
            detail: "个人了解工具",
            items: ["说明软件解决的问题", "展示界面与结果", "引导试用或查看示例"]
          },
          right: {
            title: "B2B 企业官网",
            detail: "团队评估采购",
            items: ["说明组织场景", "交代权限与服务", "支持多人决策"]
          }
        }
      }
    }]
  }, {
    id: "set-typography-hierarchy",
    title: "标题、正文与按钮的字阶层级",
    content: [{
      kind: "paragraph",
      content: ["页面中文字的大小、粗细、行高与对齐方式，共同构成了界面的", {
        type: "term",
        termId: "typography",
        label: "排版"
      }, "（Typography）。清晰的排版层级能够帮助访客区分重要信息：主标题展示核心定位，副标题说明具体原因，正文展开细节，按钮提示后续操作。"]
    }, {
      kind: "paragraph",
      content: ["通常采用清晰易读的无衬线字体："]
    }, {
      kind: "list",
      items: [["主标题（H1）：说明产品定位，通常控制在 1 到 2 行以内；"], ["次级标题（H2）：用于区分各个功能卡片或核心内容区域；"], ["正文：用于解释具体流程和细节，字号舒适，行高适中；"], ["按钮文字：使用明确的动作词，例如「免费体验」或「查看完整示例」。"]]
    }, {
      kind: "paragraph",
      content: ["检查排版时，可以使用真实的文案测试，观察在手机窄屏下是否会出现单字折行或内容溢出。"]
    }, {
      kind: "list",
      items: [["标题：展示产品定位、功能模块和关键结论。"], ["正文：补充说明工具具体如何解决问题。"], ["按钮与链接：指引下一步的操作动作。"], ["辅助说明：用于呈现小字提示或补充说明。"]]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "text-scale",
          title: "用户看到文字的先后顺序",
          caption: "这是林夏首屏的真实文字。字号、粗细和颜色深浅决定阅读顺序——层级做对了，访客一眼就知道先看哪句。",
          samples: [{
            label: "主标题",
            note: "最大最粗 \xb7 访客第一眼",
            level: "title",
            text: "把散落的项目素材，整理成别人看得懂的作品页"
          }, {
            label: "说明",
            note: "小一号、颜色浅一档 \xb7 补充主标题",
            level: "body",
            text: "整理项目背景、过程和结果，生成可以分享的页面"
          }, {
            label: "按钮文字",
            note: "不用大字号 \xb7 底色已经足够显眼",
            level: "button",
            text: "查看完整示例"
          }]
        }
      }
    }]
  }, {
    id: "name-reusable-values",
    title: "设计令牌与样式复用",
    content: [{
      kind: "paragraph",
      content: ["如果代码中各处直接写入具体的像素数值或颜色代码，后续调整样式时容易遗漏。将常用的颜色、间距、字号和圆角抽成集中命名的变量，称为", {
        type: "term",
        termId: "design-token",
        label: "设计令牌"
      }, "（Design Tokens）。"]
    }, {
      kind: "paragraph",
      content: ["当所有组件从同一套变量中取值时，修改一个变量的值就能同步更新所有相关位置，方便统一维护。"]
    }, {
      kind: "paragraph",
      content: ["命名时建议体现具体用途，例如用 `color.action` 表示操作按钮颜色，用 `space.gap-card` 表示卡片间距，这样比直接写死数值更清晰。"]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“帮我整理一套基础设计令牌（Design Tokens）：主色使用中性高饱和蓝，字阶包含 H1(32px)、H2(20px)、正文(14px)，间距统一 8/16/24px，卡片统一 12px 圆角。所有组件统一使用这些 CSS 变量，不要写死随机像素。”"]]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "token-board",
          title: "林夏官网的设计令牌",
          caption: "颜色、间距、圆角各留一套，全站都从这张表取值——改一处，整页跟着变。",
          swatches: [{
            name: "color.brand",
            note: "主要按钮和链接",
            tone: "brand"
          }, {
            name: "color.text",
            note: "标题和正文",
            tone: "text"
          }, {
            name: "color.muted",
            note: "辅助说明",
            tone: "muted"
          }],
          spaces: [8, 16, 24, 40],
          radii: [8, 12]
        }
      }
    }]
  }, {
    id: "apply-visible-rules",
    title: "全局样式的统一应用",
    content: [{
      kind: "paragraph",
      content: ["确定了视觉规则后，后续的每个区块都遵循这套规范：标题和正文的层级比例固定，主色专用于关键按钮和交互高亮，区块之间保持合理的留白与间距，卡片圆角和边框保持克制。"]
    }, {
      kind: "paragraph",
      content: ["如果发现去掉装饰性特效后内容难以辨认，通常需要优先调整标题大小、区块排列或者间距，而不是继续增加装饰。"]
    }]
  }, {
    id: "summarize-visual-direction",
    title: "本章总结",
    content: [{
      kind: "paragraph",
      content: ["本章明确了轻量产品官网的定位，梳理了字阶层级，并将颜色、间距和圆角整理为统一的设计令牌。下一章，我们将进入首屏区域，设计 Hero 文案与核心行动按钮。"]
    }],
    variant: "summary"
  }]
};
export {};
export default i;
