// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let n = {
  id: "04-content-structure",
  order: 4,
  shortTitle: "功能与排版",
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
  coreTerms: ["card", "list", "grid", "flex"],
  title: "功能展示与排版布局",
  intro: "官网的中段内容主要负责展示产品功能和实际使用流程。本章介绍如何按用户任务组织功能内容，以及如何配合使用卡片、列表、Grid 网格与 Flex 弹性布局。",
  sections: [{
    id: "group-by-task",
    title: "按使用流程组织功能介绍",
    content: [{
      kind: "paragraph",
      content: ["介绍产品功能时，应避免直接罗列内部技术名词。围绕用户的实际使用流程来组织内容，更容易被理解。"]
    }, {
      kind: "paragraph",
      content: ["例如对于作品页生成工具，可以按照以下三个环节展开介绍："]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "整理背景"
      }, "：项目为什么开始，解决什么问题；"], [{
        type: "strong",
        text: "梳理过程"
      }, "：采用了哪些方案，遇到了哪些难点；"], [{
        type: "strong",
        text: "呈现结果"
      }, "：最终交付的形态，包含哪些数据与作品截图。"]]
    }, {
      kind: "paragraph",
      content: ["访客按顺序阅读，更容易理解工具的具体使用场景。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "ui-panels",
          title: "独立的内容用卡片，连续的内容用列表",
          caption: "左边是林夏的三张能力卡，右边是 FAQ——同样的信息，合适的容器不一样。",
          panels: [{
            variant: "cards",
            label: "Card 卡片 \xb7 三项能力",
            note: "每张卡独立成块，各有图标和说明，适合并列展示。",
            items: [{
              title: "整理背景",
              text: "项目为什么开始"
            }, {
              title: "梳理过程",
              text: "中间做了什么"
            }, {
              title: "呈现结果",
              text: "最后做成了什么"
            }]
          }, {
            variant: "list",
            label: "List 列表 \xb7 常见问题",
            note: "一行一条、上下连贯，适合一口气扫完的连续内容。",
            items: [{
              title: "可以先看一个完整示例吗？",
              text: ""
            }, {
              title: "示例里的素材从哪里来？",
              text: ""
            }, {
              title: "整理一个项目要多久？",
              text: ""
            }, {
              title: "生成的页面能自己改吗？",
              text: ""
            }]
          }]
        }
      }
    }]
  }, {
    id: "choose-content-shape",
    title: "卡片与列表的使用场景",
    content: [{
      kind: "paragraph",
      content: ["在组织内容时，需要根据信息的阅读方式选择合适的容器："]
    }, {
      kind: "list",
      items: [[{
        type: "term",
        termId: "card",
        label: "卡片"
      }, "（Card）：适合承载", {
        type: "strong",
        text: "各自独立、可单独比较或点击"
      }, "的完整内容块。每张卡片通常包含独立的标题、配图或图标、说明文字与操作按钮。例如三项核心能力展示，使用卡片比较直观。"], [{
        type: "term",
        termId: "list",
        label: "列表"
      }, "（List）：适合承载", {
        type: "strong",
        text: "结构一致、需要按先后顺序连续阅读"
      }, "的信息。例如展示操作步骤、清单或条目说明时，列表比卡片更为紧凑、易读。"]]
    }, {
      kind: "paragraph",
      content: ["如果内容不需要对比也不需要单独点击，不需要给每个段落都套上卡片容器，避免页面产生过多的容器嵌套与视觉干扰。"]
    }]
  }, {
    id: "arrange-inside-and-between",
    title: "Grid 与 Flex 的布局分工",
    content: [{
      kind: "paragraph",
      content: ["在排版布局中，Grid 和 Flex 具有清晰的分工："]
    }, {
      kind: "list",
      items: [[{
        type: "term",
        termId: "grid",
        label: "Grid"
      }, "（网格布局）：适合", {
        type: "strong",
        text: "外层的多列排布"
      }, "。例如把 3 张功能卡片横排成 3 列，并在屏幕变窄时自动折行成单列。"], [{
        type: "term",
        termId: "flex",
        label: "Flex"
      }, "（弹性布局）：适合", {
        type: "strong",
        text: "内层的局部对齐"
      }, "。例如单张卡片内部，左边放置图标、右边放置标题，或者底部横排两个标签。"]]
    }, {
      kind: "paragraph",
      content: ["外层使用 Grid 控制卡片之间的行列比例与间距，内层使用 Flex 调整图标、文字和按钮的对齐。"]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“请使用 3 列 Grid 网格展示三项核心能力卡片，卡片之间保持 24px 间距，移动端自动转为单列；每张卡片内部使用 Flex 垂直排列图标、标题和正文。”"]]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "ui-panels",
          title: "Grid 管卡片之间，Flex 管卡片里面",
          caption: "先让三张卡片排好行列，再处理一张卡片内部图标和文字的对齐。",
          panels: [{
            variant: "grid",
            label: "Grid \xb7 三张卡片的行列",
            note: "外层网格决定几张卡片怎么分列、间距多少。",
            items: [{
              title: "整理背景",
              text: "卡片 1"
            }, {
              title: "梳理过程",
              text: "卡片 2"
            }, {
              title: "呈现结果",
              text: "卡片 3"
            }]
          }, {
            variant: "flex",
            label: "Flex \xb7 一张卡片的内部",
            note: "卡片里面图标靠左、文字靠右排成一排，或换成上下排列。",
            items: [{
              title: "整理背景",
              text: "图标和文字怎样对齐，由 Flex 决定"
            }]
          }]
        }
      }
    }]
  }, {
    id: "write-complete-example",
    title: "完整案例的展示要素",
    content: [{
      kind: "paragraph",
      content: ["在功能卡片下方，可以附带一个真实案例或作品全貌。"]
    }, {
      kind: "paragraph",
      content: ["一个完整的案例通常包含背景、过程和结果三项要素，帮助访客了解产品在实际场景下的交付形态。"]
    }]
  }, {
    id: "summarize-content-structure",
    title: "本章总结",
    content: [{
      kind: "paragraph",
      content: ["本章介绍了按任务流程组织功能的方法、卡片与列表的选择依据，以及 Grid 和 Flex 的布局分工。下一章，我们将组织真实证据、价格表与常见问题（FAQ）。"]
    }],
    variant: "summary"
  }]
};
export {};
export default n;
