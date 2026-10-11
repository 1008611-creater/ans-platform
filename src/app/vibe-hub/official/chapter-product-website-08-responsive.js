// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let n = {
  id: "08-responsive",
  order: 8,
  shortTitle: "手机适配",
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
  coreTerms: ["responsive-design", "drawer", "sticky"],
  title: "手机适配与抽屉导航",
  intro: "手机屏幕宽度较小，桌面端的多列排版在移动端通常需要转换为单列流。本章介绍响应式布局的单列重排、抽屉式导航菜单、内容溢出排查，以及底部吸底操作栏的安全区处理。",
  sections: [{
    id: "set-mobile-reading-order",
    title: "响应式布局与单列重排",
    content: [{
      kind: "paragraph",
      content: ["根据屏幕宽度自动调整布局和内容排布的设计方式，被称为", {
        type: "term",
        termId: "responsive-design",
        label: "响应式设计"
      }, "（Responsive Design）。"]
    }, {
      kind: "paragraph",
      content: ["在窄屏设备上，桌面端并排的多列卡片和左右图文，通常转为自上而下的单列流："]
    }, {
      kind: "list",
      items: [["首屏大标题和主要行动按钮优先呈现；"], ["示意图或产品截图紧随其后；"], ["功能卡片依次向下排列；"], ["页面两侧留出至少 16px 的边距，避免文字紧贴屏幕边缘。"]]
    }, {
      kind: "paragraph",
      content: ["检查移动端时，如果页面出现左右晃动，通常是因为某些图片或容器写死了固定宽度。"]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“为官网添加移动端响应式适配（屏幕宽度小于 768px 时生效）：将所有左右双列和三列 Grid 网格切换为单列垂直堆叠；首屏大标题适当调小字号并允许自然换行；页面两侧留出 16px 边距，确保页面没有任何横向滚动条。”"]]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "device-drawer",
          title: "手机上的导航抽屉",
          caption: "点右上角菜单按钮，抽屉从屏幕边缘滑出；关闭后回到菜单按钮。",
          menu: ["功能", "完整示例", "证据与 FAQ"],
          closed: {
            label: "抽屉关闭",
            note: "普通页面，右上角是菜单按钮"
          },
          open: {
            label: "抽屉打开",
            note: "背景变暗、不能再点；点 ✕ 或空白处收回"
          }
        }
      }
    }]
  }, {
    id: "open-navigation-drawer",
    title: "抽屉式导航（Drawer）",
    content: [{
      kind: "paragraph",
      content: ["桌面端导航栏通常横向排布多个链接，在手机端空间不足时，常见的方式是在顶部保留一个菜单按钮，点击后滑出", {
        type: "term",
        termId: "drawer",
        label: "抽屉"
      }, "（Drawer）菜单。"]
    }, {
      kind: "paragraph",
      content: ["移动端抽屉菜单的交互细节包括："]
    }, {
      kind: "list",
      items: [["点击菜单按钮后，抽屉平滑滑出，并显示背景遮罩；"], ["抽屉展开时，锁定页面背景滚动；"], ["点击抽屉内的导航链接，抽屉自动收起，页面滚动到对应区块；"], ["点击关闭按钮或背景遮罩，抽屉收回。"]]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“在移动端隐藏导航栏的横排文字链接，改用汉堡菜单图标；点击后从右侧滑出抽屉（Drawer）菜单；抽屉展开时锁定背景滚动，点击链接自动关闭抽屉并平滑滚动到目标锚点，支持点击遮罩层关闭。”"]]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "flow",
          title: "发现横向滚动时怎样排查",
          caption: "普通文字和图片应该重新排版，不要直接缩小或隐藏。",
          steps: [{
            title: "找到撑宽对象",
            detail: "图片、长文字或固定宽度"
          }, {
            title: "修复对象尺寸",
            detail: "允许收缩、换行或改单列"
          }, {
            title: "复查整页",
            detail: "确认没有新的裁切和遮挡"
          }]
        }
      }
    }]
  }, {
    id: "prevent-mobile-overflow",
    title: "移动端内容溢出排查",
    content: [{
      kind: "paragraph",
      content: ["在窄屏下，元素宽度超过屏幕宽度会导致页面产生横向滚动："]
    }, {
      kind: "list",
      items: [["图片：设置 `max-width: 100%` 和 `height: auto`，让图片随容器宽度等比例缩放。"], ["文本与长链接：如果正文中包含超长网址或技术词汇，设置 `word-break: break-word` 允许换行。"], ["宽表格或代码块：需要横向查看完整内容时，给局部容器设置 ", {
        type: "term",
        termId: "overflow",
        label: "overflow-x: auto"
      }, "，避免整页产生横向滚动。"]]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“请排查移动端所有图片和容器样式，确保设置了 max-width: 100% 和 box-sizing: border-box；如果正文存在超长网址，请设置 word-break: break-word 允许换行，避免页面产生横向滚动。”"]]
    }]
  }, {
    id: "limit-sticky-use",
    title: "底部粘性定位与安全区适配",
    content: [{
      kind: "paragraph",
      content: ["为了方便用户随时采取行动，核心按钮可以设置为在页面滚动时固定在屏幕底部，这需要使用", {
        type: "term",
        termId: "sticky",
        label: "粘性定位"
      }, "（Sticky 或 Fixed）。"]
    }, {
      kind: "paragraph",
      content: ["固定在底部的操作栏需要处理两个细节："]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "预留底部内边距"
      }, "：固定底栏会遮挡页面底部的正文，需要给正文容器增加等高的 `padding-bottom`。"], [{
        type: "strong",
        text: "适配底部安全区"
      }, "：全面屏手机底部存在系统手势区域，底栏需要使用 `env(safe-area-inset-bottom)` 预留安全边距，避免按钮贴在屏幕最底部影响点击。"]]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“在手机端为核心行动按钮添加底部固定悬浮条（position: sticky），并使用 env(safe-area-inset-bottom) 适配全面屏底部安全边距；同时在正文容器底部添加等高的 padding-bottom，避免遮挡最后一段正文。”"]]
    }]
  }, {
    id: "summarize-responsive",
    title: "本章总结",
    content: [{
      kind: "paragraph",
      content: ["本章介绍了移动端单列重排的排版顺序、抽屉式导航的交互细节、图片与文本溢出的处理方法，以及底部吸底按钮的安全区适配。下一章，我们将梳理上线验收清单，并总结与 AI 协作迭代的要点。"]
    }],
    variant: "summary"
  }]
};
export {};
export default n;
