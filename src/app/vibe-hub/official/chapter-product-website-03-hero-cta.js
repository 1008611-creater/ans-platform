// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let i = {
  id: "03-hero-cta",
  order: 3,
  shortTitle: "首屏与按钮",
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
  coreTerms: ["cta", "button", "link", "hero"],
  title: "首屏文案与行动按钮",
  intro: "首屏（Hero）是访客打开网页后首先看到的区域。本章介绍如何提炼清晰的产品价值主张、撰写简洁有力的辅助文案，并设计指引明确的主行动按钮（CTA）。",
  sections: [{
    id: "write-the-promise",
    title: "主副标题的文案表达",
    content: [{
      kind: "paragraph",
      content: ["首屏的核心是 ", {
        type: "term",
        termId: "hero",
        label: "Hero"
      }, " 区域。编写首屏文案时，需要避免空泛的口号。"]
    }, {
      kind: "paragraph",
      content: ["有效的主标题能够直接说明输入与产出："]
    }, {
      kind: "list",
      items: [["直白的表达：“把散落的项目素材，整理成清晰的作品页。”"], ["空泛的表达：“重新定义下一代个人生产力平台。”"]]
    }, {
      kind: "paragraph",
      content: ["首屏的主要任务不是罗列所有功能，而是帮助访客了解产品的核心用途，并决定是否继续向下浏览。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "before-after",
          title: "首屏只留一个主要行动",
          caption: "左边是 AI 常给的第一版：按钮一样大，访客要自己猜。右边是我们要求的结果。",
          agentSay: "首屏只保留一个主要按钮「查看完整示例」，其他入口收进导航",
          before: {
            label: "AI 给的第一版 \xb7 按钮一样大",
            card: {
              title: "让创作更简单",
              text: "口号看不出和谁有关，也不知道能做什么",
              chips: ["开始创建", "观看视频", "查看功能", "了解价格"],
              tone: "problem"
            }
          },
          after: {
            label: "调整之后 \xb7 下一步只有一个",
            note: "「加入候补名单」这样的次级行动放到页面下方，不和主要按钮抢位置。",
            card: {
              title: "把散落的项目素材，整理成别人看得懂的作品页",
              text: "一句话说清给谁用、解决什么",
              chips: ["查看完整示例"],
              primaryChip: !0,
              tone: "fixed"
            }
          }
        }
      }
    }]
  }, {
    id: "set-cta-hierarchy",
    title: "行动召唤（CTA）与按钮层级",
    content: [{
      kind: "paragraph",
      content: ["我们在网页上引导访客采取的核心操作，称为 ", {
        type: "term",
        termId: "cta",
        label: "CTA"
      }, "（Call to Action）。"]
    }, {
      kind: "paragraph",
      content: ["如果首屏并列放置多个样式相同的大按钮，访客往往难以判断优先操作。首屏通常只保留一个视觉层级最高的主操作按钮，例如设置为主色实底样式的「查看完整示例」或「免费开始使用」；其他次要操作做成轻量的文字链接，或者收纳到导航栏中。"]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“首屏主标题写‘把散落的项目素材，整理成清晰的作品页’；副标题说明使用场景与结果；主要 CTA 按钮只保留一个‘查看完整示例’，使用主色填充；不要在首屏并列放置多个同级大按钮。”"]]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "ui-panels",
          title: "Link 和 Button 长什么样、各管什么",
          caption: "点击后去另一个页面，用链接；点击后在当前页面做事，用按钮。",
          panels: [{
            variant: "link-button",
            label: "Link 链接 \xb7 前往另一个位置",
            note: "打开完整示例页、跳到 FAQ、访问外部资料。",
            items: [{
              title: "查看完整示例",
              text: ""
            }]
          }, {
            variant: "link-button",
            label: "Button 按钮 \xb7 在当前页面执行动作",
            note: "打开菜单、提交表单、确认或取消。",
            items: [{
              title: "加入候补名单",
              text: ""
            }]
          }]
        }
      }
    }]
  }, {
    id: "choose-control",
    title: "按钮与链接的功能区分",
    content: [{
      kind: "paragraph",
      content: ["虽然在外观上都可以设计成圆角按钮的样式，但在网页底层，", {
        type: "term",
        termId: "button",
        label: "按钮"
      }, "（Button）和", {
        type: "term",
        termId: "link",
        label: "链接"
      }, "（Link）承担的分工不同："]
    }, {
      kind: "list",
      items: [[{
        type: "term",
        termId: "link",
        label: "Link"
      }, "：用于", {
        type: "strong",
        text: "页面跳转"
      }, "。例如打开新页面、跳转到外部网站，或者滚动到当前页的某个锚点位置。支持右键在新标签页中打开。"], [{
        type: "term",
        termId: "button",
        label: "Button"
      }, "：用于", {
        type: "strong",
        text: "执行操作"
      }, "。例如提交表单、展开侧边栏、打开弹窗。通常不改变网页地址，而是触发一段交互逻辑。"]]
    }, {
      kind: "paragraph",
      content: ['让 AI 编写界面代码时，需要避免把页面跳转写成 `<button>`，也避免把表单提交写成 `<a href="#">`，保证浏览器的默认行为与辅助功能正常工作。']
    }]
  }, {
    id: "use-evidence-image",
    title: "产品截图与界面预览",
    content: [{
      kind: "paragraph",
      content: ["除了文字和按钮，首屏通常还会搭配一张产品界面", {
        type: "term",
        termId: "image",
        label: "图片"
      }, "。"]
    }, {
      kind: "paragraph",
      content: ["直观的界面截图或生成结果预览，能够帮助访客快速理解产品的实际形态与使用方式。"]
    }, {
      kind: "paragraph",
      content: ["截图需要设置明确的宽高比，并提供对应的文本说明，避免图片加载完成前页面发生抖动。"]
    }]
  }, {
    id: "summarize-hero-cta",
    title: "本章总结",
    content: [{
      kind: "paragraph",
      content: ["本章介绍了首屏主副标题的文案原则、主操作按钮的层级处理，以及按钮与链接的功能区分。下一章，我们将组织正文的功能卡片与网格排版。"]
    }],
    variant: "summary"
  }]
};
export {};
export default i;
